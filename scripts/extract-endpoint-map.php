#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Elementeer Capability-to-Endpoint Map Extractor
 *
 * Parses PHP source files to produce endpoint_map.json.
 *
 * Usage: php scripts/extract-endpoint-map.php [output_file]
 */

$plugin_root = dirname(__DIR__);
$output_file = $argv[1] ?? ($plugin_root . '/scripts/endpoint_map.json');

// ── Step 1: Build class → file map ──────────────────────────────────────

$class_map = [];
scan_classes($plugin_root . '/includes', $class_map);

$pro_root   = $plugin_root . '/../elementeer-pro/includes';
$voxel_root = $plugin_root . '/../elementeer-addon-voxel/includes';

if (is_dir($pro_root)) scan_classes($pro_root, $class_map);
if (is_dir($voxel_root)) scan_classes($voxel_root, $class_map);

// ── Step 2: Parse routers ───────────────────────────────────────────────

$endpoint_map = [];

parse_router_file(
    $plugin_root . '/includes/Api/Router.php',
    'Elementeer\\MCP\\Api',
    $endpoint_map,
    $class_map
);

if (is_dir($pro_root)) {
    $pro_router = $pro_root . '/ProRouter.php';
    if (file_exists($pro_router)) {
        parse_router_file($pro_router, 'Elementeer\\Pro', $endpoint_map, $class_map);
    }
}

if (is_dir($voxel_root)) {
    $voxel_router = $voxel_root . '/Api/Router.php';
    if (file_exists($voxel_router)) {
        parse_router_file($voxel_router, 'Elementeer\\AddonVoxel\\Api', $endpoint_map, $class_map);
    }
}

// ── Step 3: Sort and output ─────────────────────────────────────────────

ksort($endpoint_map);
file_put_contents(
    $output_file,
    json_encode($endpoint_map, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n"
);

$total_routes = 0;
foreach ($endpoint_map as $methods) {
    $total_routes += count($methods);
}

fwrite(STDERR, "Wrote $total_routes route entries across " . count($endpoint_map) . " endpoints to $output_file\n");


// ════════════════════════════════════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════════════════════════════════════

function scan_classes(string $dir, array &$map): void {
    if (!is_dir($dir)) return;
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if ($file->getExtension() !== 'php') continue;
        $src = file_get_contents($file->getPathname());

        $ns = '';
        if (preg_match('/^\s*namespace\s+([\\\\\w]+)\s*;/m', $src, $ns_m)) {
            $ns = $ns_m[1];
        }

        if (preg_match_all(
            '/(?:abstract\s+|final\s+)?(?:class|interface|trait)\s+(\w+)/',
            $src, $class_matches
        )) {
            foreach ($class_matches[1] as $class_name) {
                $fqcn = $ns ? "$ns\\$class_name" : $class_name;
                $map[$fqcn] = $file->getPathname();
            }
        }
    }
}

function parse_router_file(string $path, string $base_ns, array &$map, array $class_map): void {
    if (!file_exists($path)) return;
    $src = file_get_contents($path);

    $vars = resolve_variable_assignments($src, $base_ns);

    // Detect $alias = 'register_rest_route'; $alias(ns, route, ...)
    $call_pattern = '\bregister_rest_route\s*\(';
    if (preg_match('/\$(\w+)\s*=\s*[\'"]register_rest_route[\'"]\s*;/', $src, $alias_m)) {
        $call_pattern .= '|\$' . preg_quote($alias_m[1], '/') . '\s*\(';
    }

    preg_match_all('/(' . $call_pattern . ')/', $src, $calls, PREG_OFFSET_CAPTURE);

    foreach ($calls[0] as $call) {
        $offset = $call[1];
        $paren_start = strpos($src, '(', $offset);
        if ($paren_start === false) continue;

        $args_block = extract_paren_block($src, $paren_start);
        if ($args_block === null) continue;

        $args_list = split_top_level_commas($args_block);
        if (count($args_list) < 3) continue;

        $route = extract_route_pattern($args_list[1]);

        $specs_text = trim($args_list[2]);
        $entries = extract_route_entries($specs_text, $base_ns, $vars, $class_map);

        if (!isset($map[$route])) {
            $map[$route] = [];
        }

        foreach ($entries as $entry) {
            $method = $entry[0];
            $cap    = $entry[1];
            $map[$route][$method] = $cap;
        }
    }
}

function resolve_variable_assignments(string $src, string $base_ns): array {
    $vars = [];
    preg_match_all(
        '/\$(\w+)\s*=\s*new\s+(\\\\?[\w\\\\]+)\s*\(/',
        $src, $m, PREG_SET_ORDER
    );
    foreach ($m as $match) {
        $class = resolve_fqcn($match[2], $base_ns);
        $vars[$match[1]] = $class;
    }
    return $vars;
}

function resolve_fqcn(string $name, string $base_ns): string {
    if (str_starts_with($name, '\\')) return substr($name, 1);
    if (str_contains($name, '\\')) return $name;
    return $base_ns . '\\' . $name;
}

function extract_route_pattern(string $raw): string {
    $trimmed = trim($raw);
    // Strip quotes
    $trimmed = trim($trimmed, " \t\n\r\0\x0B'\"");
    // Handle concatenation: 'elementeer/v1' . '/route'
    if (str_contains($trimmed, '.')) {
        $trimmed = resolve_concatenation($trimmed);
    }
    return $trimmed;
}

function resolve_concatenation(string $expr): string {
    // Replace self::NAMESPACE with 'elementeer/v1'
    $expr = str_replace('self::NAMESPACE', "'elementeer/v1'", $expr);
    // Concatenate string literals: chop dots and concatenate
    $parts = [];
    preg_match_all('/[\'"]([^\'"]*)[\'"]/', $expr, $m);
    foreach ($m[1] as $p) {
        $parts[] = $p;
    }
    return implode('', $parts);
}

function extract_paren_block(string $src, int $open_pos): ?string {
    $len  = strlen($src);
    $pos  = $open_pos;
    $depth = 0;

    while ($pos < $len) {
        $ch = $src[$pos];
        if ($ch === '(') {
            $depth++;
        } elseif ($ch === ')') {
            $depth--;
            if ($depth === 0) {
                return substr($src, $open_pos + 1, $pos - $open_pos - 1);
            }
        } elseif ($ch === '"' || $ch === "'") {
            $pos = skip_string($src, $pos, $ch);
        }
        $pos++;
    }
    return null;
}

function skip_string(string $src, int $pos, string $quote): int {
    $len = strlen($src);
    $pos++;
    while ($pos < $len) {
        $ch = $src[$pos];
        if ($ch === '\\') { $pos += 2; continue; }
        if ($ch === $quote) return $pos;
        $pos++;
    }
    return $pos;
}

function split_top_level_commas(string $text): array {
    $parts  = [];
    $depth  = 0;
    $start  = 0;
    $len    = strlen($text);

    for ($i = 0; $i < $len; $i++) {
        $ch = $text[$i];

        if ($ch === '(' || $ch === '[' || $ch === '{') {
            $depth++;
        } elseif ($ch === ')' || $ch === ']' || $ch === '}') {
            $depth--;
        } elseif ($ch === '"' || $ch === "'") {
            $i = skip_string($text, $i, $ch);
        } elseif ($ch === ',' && $depth === 0) {
            $parts[] = substr($text, $start, $i - $start);
            $start = $i + 1;
        }
    }
    $parts[] = substr($text, $start);
    return $parts;
}

function extract_route_entries(string $spec_text, string $base_ns, array $vars, array $class_map): array {
    $results = [];
    $entries = split_top_level_array_entries($spec_text);
    if (empty($entries)) $entries = [$spec_text];

    foreach ($entries as $entry) {
        $methods = extract_array_string_value($entry, 'methods');
        if ($methods === null) continue;

        $callback = extract_array_block_value($entry, 'callback');
        if ($callback === null && ($callback = extract_closure_body_from_entry($entry)) === null) {
            continue;
        }

        if (is_inline_closure($callback)) {
            $capability = find_capability_in_inline_closure($callback);
            $methods_clean = trim($methods, "'\"");
            $method_list = preg_split('/[,|]+/', $methods_clean);
            foreach ($method_list as $method) {
                $method = trim(strtoupper($method));
                if ($method === '') continue;
                $results[] = [$method, $capability];
            }
            continue;
        }

        $class_name = resolve_callback_class_name($callback, $base_ns, $vars, $class_map);

        if ($class_name === null) {
            $capability = find_capability_in_inline_closure($entry);
            $methods_clean = trim($methods, "'\"");
            $method_list = preg_split('/[,|]+/', $methods_clean);
            foreach ($method_list as $method) {
                $match_method = trim(strtoupper($method));
                if ($match_method === '') continue;
                $results[] = [$match_method, $capability];
            }
            continue;
        }

        if (!preg_match('/\[\s*(?:.+?)\s*,\s*[\'"]([\w-]+)[\'"]\s*\]/s', $callback, $mb)) {
            continue;
        }
        $method_name = $mb[1];

        $capability = find_capability($class_name, $method_name, $class_map);
        if ($capability === null) {
            $capability = find_capability_in_inline_closure($entry);
        }

        $methods_clean = trim($methods, "'\"");
        $method_list = preg_split('/[,|]+/', $methods_clean);

        foreach ($method_list as $method) {
            $method = trim(strtoupper($method));
            if ($method === '') continue;
            $results[] = [$method, $capability];
        }
    }

    return $results;
}

function extract_closure_body_from_entry(string $entry): ?string {
    // Look for 'callback' => function (...) ... pattern
    if (preg_match("/'callback'\s*=>\s*(function\s*\(.+)/s", $entry, $m)) {
        return $m[1];
    }
    if (preg_match('/"callback"\s*=>\s*(function\s*\(.+)/s', $entry, $m)) {
        return $m[1];
    }
    return null;
}

function split_top_level_array_entries(string $text): array {
    $trimmed = trim($text);
    if ($trimmed === '' || !str_starts_with($trimmed, '[')) return [];
    $trimmed = trim(substr($trimmed, 1, -1));
    if ($trimmed === '') return [];

    $parts  = [];
    $depth  = 0;
    $start  = 0;
    $len    = strlen($trimmed);

    for ($i = 0; $i < $len; $i++) {
        $ch = $trimmed[$i];
        if ($ch === '(' || $ch === '[' || $ch === '{') {
            $depth++;
        } elseif ($ch === ')' || $ch === ']' || $ch === '}') {
            $depth--;
        } elseif ($ch === '"' || $ch === "'") {
            $i = skip_string($trimmed, $i, $ch);
        } elseif ($ch === ',' && $depth === 0) {
            $entry = trim(substr($trimmed, $start, $i - $start));
            if ($entry !== '') $parts[] = $entry;
            $start = $i + 1;
        }
    }

    $entry = trim(substr($trimmed, $start));
    if ($entry !== '') $parts[] = $entry;

    return $parts;
}

function extract_array_string_value(string $entry, string $key): ?string {
    // Match 'key' => 'value' or "key" => "value"
    $quoted_key = preg_quote($key, '/');
    if (preg_match('/[\'"]' . $quoted_key . '[\'"]\s*=>\s*[\'"]([^\'"]*)[\'"]/', $entry, $m)) {
        return $m[1];
    }
    return null;
}

function extract_array_block_value(string $entry, string $key): ?string {
    $quoted_key = preg_quote($key, '/');

    // Match 'key' => [...]
    if (preg_match('/[\'"]' . $quoted_key . '[\'"]\s*=>\s*(\[[^\]]*(?:\[.*?\].*?)*\])(?:\s*,|$)/s', $entry, $m)) {
        return $m[1];
    }

    // Try broader: match 'key' => [ followed by balanced brackets
    if (preg_match('/[\'"]' . $quoted_key . '[\'"]\s*=>\s*(\[)/', $entry, $pm, PREG_OFFSET_CAPTURE)) {
        $pos = $pm[1][1];
        $block = extract_balanced_brackets($entry, $pos);
        if ($block !== null) return $block;
    }

    // Match 'key' => function(...) { ... } for inline closures
    if (preg_match('/[\'"]' . $quoted_key . '[\'"]\s*=>\s*\bfunction\b/', $entry, $pm, PREG_OFFSET_CAPTURE)) {
        $fn_start = $pm[0][1];
        $fn_text = substr($entry, $fn_start);
        $fn_body = extract_closure_body($fn_text);
        if ($fn_body !== null) return $fn_body;
    }

    return null;
}

function extract_closure_body(string $text): ?string {
    // Skip "function" keyword
    if (!preg_match('/\bfunction\b/', $text, $m, PREG_OFFSET_CAPTURE)) {
        return null;
    }
    $pos = $m[0][1] + 8;

    // Skip parameter list: (...)
    while ($pos < strlen($text) && ($text[$pos] === ' ' || $text[$pos] === "\t")) $pos++;
    if ($pos < strlen($text) && $text[$pos] === '(') {
        $paren_body = extract_paren_block($text, $pos);
        if ($paren_body === null) return null;
        $pos += strlen($paren_body) + 2; // skip "(...)"
    }

    // Skip "use (...)" if present
    while ($pos < strlen($text) && ($text[$pos] === ' ' || $text[$pos] === "\t")) $pos++;
    if ($pos < strlen($text) && substr($text, $pos, 4) === 'use ') {
        $pos += 4;
        while ($pos < strlen($text) && ($text[$pos] === ' ' || $text[$pos] === "\t")) $pos++;
        if ($pos < strlen($text) && $text[$pos] === '(') {
            $paren_body = extract_paren_block($text, $pos);
            if ($paren_body === null) return null;
            $pos += strlen($paren_body) + 2;
        }
    }

    // Skip to {
    while ($pos < strlen($text) && $text[$pos] !== '{' && $text[$pos] !== ';') {
        $pos++;
    }
    if ($pos >= strlen($text) || $text[$pos] !== '{') return null;

    return substr($text, $m[0][1], $pos - $m[0][1] + 1)
         . extract_brace_block($text, $pos);
}

function extract_balanced_brackets(string $text, int $open_pos): ?string {
    $len   = strlen($text);
    $pos   = $open_pos;
    $depth = 0;

    while ($pos < $len) {
        $ch = $text[$pos];
        if ($ch === '[') $depth++;
        elseif ($ch === ']') {
            $depth--;
            if ($depth === 0) {
                return substr($text, $open_pos, $pos - $open_pos + 1);
            }
        } elseif ($ch === '"' || $ch === "'") {
            $pos = skip_string($text, $pos, $ch);
        }
        $pos++;
    }
    return null;
}

function resolve_callback_class_name(string $callback_str, string $base_ns, array $vars, array $class_map): ?string {
    $callback_str = trim($callback_str);

    // [$var, 'method']
    if (preg_match('/\[\s*\$(\w+)\s*,\s*[\'"]([\w-]+)[\'"]\s*\]/s', $callback_str, $m)) {
        return $vars[$m[1]] ?? null;
    }

    // [new ClassRef(), 'method']  — inline instantiation
    if (preg_match('/\[\s*new\s+(\\\\?[\w\\\\]+)\s*\([^)]*\)\s*,\s*[\'"]([\w-]+)[\'"]\s*\]/s', $callback_str, $m)) {
        return resolve_fqcn($m[1], $base_ns);
    }

    // ['ClassRef', 'method']
    if (preg_match('/\[\s*[\'"]([^\'"]+)[\'"]\s*,\s*[\'"]([\w-]+)[\'"]\s*\]/s', $callback_str, $m)) {
        return resolve_fqcn($m[1], $base_ns);
    }

    return null;
}

function find_capability(string $class_name, string $method_name, array $class_map): ?string {
    $file = find_class_file($class_name, $class_map);
    if ($file === null) return null;

    $src = file_get_contents($file);
    return find_authorize_call_in_method($src, $method_name);
}

function find_authorize_call_in_method(string $src, string $method_name): ?string {
    // Find the function definition
    $pattern = '/\bfunction\s+' . preg_quote($method_name, '/') . '\s*\(/';
    if (!preg_match($pattern, $src, $m, PREG_OFFSET_CAPTURE)) {
        return null;
    }

    $fn_offset = $m[0][1];

    // Find the opening brace of the method body
    $brace_pos = strpos($src, '{', $fn_offset);
    if ($brace_pos === false) return null;

    // Extract a generous chunk (5000 chars) after the opening brace — the authorize
    // call is always near the top of each method
    $chunk = substr($src, $brace_pos + 1, 5000);

    if (preg_match('/->authorize\s*\([^,]+,\s*[\'"]([^\'"]+)[\'"]/', $chunk, $cap_m)) {
        return $cap_m[1];
    }

    return null;
}

function is_inline_closure(string $callback_str): bool {
    return str_starts_with(trim($callback_str), 'function');
}

function find_capability_in_inline_closure(string $entry): ?string {
    if (preg_match('/->authorize\s*\([^,]+,\s*[\'"]([^\'"]+)[\'"]/', $entry, $m)) {
        return $m[1];
    }
    return null;
}

function extract_brace_block(string $src, int $open_pos): ?string {
    $len   = strlen($src);
    $pos   = $open_pos;
    $depth = 0;

    while ($pos < $len) {
        $ch = $src[$pos];
        if ($ch === '{') $depth++;
        elseif ($ch === '}') {
            $depth--;
            if ($depth === 0) {
                return substr($src, $open_pos + 1, $pos - $open_pos - 1);
            }
        } elseif ($ch === '"' || $ch === "'") {
            $pos = skip_string($src, $pos, $ch);
        }
        $pos++;
    }
    return null;
}

function find_class_file(string $fqcn, array $class_map): ?string {
    if (isset($class_map[$fqcn])) return $class_map[$fqcn];

    $parts = explode('\\', $fqcn);
    $short = end($parts);

    foreach ($class_map as $cls => $file) {
        $cls_parts = explode('\\', $cls);
        if (end($cls_parts) === $short) return $file;
    }

    return null;
}
