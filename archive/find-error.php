<?php
/**
 * Find Exact Error Script
 * Upload to WordPress root and run: php find-error.php
 * OR visit: https://domain.com/find-error.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Don't output HTML
header('Content-Type: text/plain');

echo "=== Finding Elementify Plugin Error ===\n\n";

// Path to plugin
$plugin_dir = __DIR__ . '/wp-content/plugins/elementify';
$plugin_file = $plugin_dir . '/elementify-mcp.php';

// 1. Check if plugin exists
if (!file_exists($plugin_file)) {
    echo "❌ Plugin file not found: $plugin_file\n";
    exit;
}
echo "✅ Plugin file found\n";

// 2. Try to load plugin with error handling
echo "\n--- Attempt 1: Include plugin file ---\n";
try {
    // Define WordPress constants that might be needed
    if (!defined('ABSPATH')) {
        define('ABSPATH', __DIR__ . '/');
    }
    
    // Mock WordPress functions if they don't exist
    if (!function_exists('plugin_dir_path')) {
        function plugin_dir_path($file) {
            return trailingslashit(dirname($file));
        }
        echo "⚠️  Mocked plugin_dir_path()\n";
    }
    
    if (!function_exists('plugin_dir_url')) {
        function plugin_dir_url($file) {
            $url = 'file://' . dirname($file);
            return trailingslashit($url);
        }
        echo "⚠️  Mocked plugin_dir_url()\n";
    }
    
    if (!function_exists('trailingslashit')) {
        function trailingslashit($string) {
            return rtrim($string, '/') . '/';
        }
        echo "⚠️  Mocked trailingslashit()\n";
    }
    
    // Include the plugin file
    include $plugin_file;
    echo "✅ Plugin file included without immediate error\n";
    
} catch (Throwable $e) {
    echo "❌ Error including plugin file:\n";
    echo "   Type: " . get_class($e) . "\n";
    echo "   Message: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    exit;
}

// 3. Check for parse errors
echo "\n--- Attempt 2: Check for parse errors ---\n";
$output = shell_exec('php -l ' . escapeshellarg($plugin_file) . ' 2>&1');
echo "Syntax check: $output";

// 4. Check specific files for errors
echo "\n--- Attempt 3: Check critical files ---\n";
$critical_files = [
    'includes/Plugin.php',
    'includes/Api/Router.php',
    'includes/Auth/Manager.php',
];

foreach ($critical_files as $file) {
    $path = $plugin_dir . '/' . $file;
    if (file_exists($path)) {
        $check = shell_exec('php -l ' . escapeshellarg($path) . ' 2>&1');
        if (strpos($check, 'No syntax errors') !== false) {
            echo "✅ $file: No syntax errors\n";
        } else {
            echo "❌ $file: Syntax error detected\n";
            echo "   $check\n";
        }
    } else {
        echo "⚠️  $file: Not found\n";
    }
}

// 5. Check PHP version compatibility
echo "\n--- Attempt 4: Check PHP version compatibility ---\n";
echo "PHP Version: " . PHP_VERSION . "\n";

// Check for PHP 8.0+ features that might cause issues
$features = [
    '8.0' => ['match', 'nullsafe operator', 'named arguments'],
    '8.1' => ['enum', 'readonly properties', 'first-class callable syntax'],
    '8.2' => ['readonly classes', 'disjunctive normal form types', 'null, false, and true as standalone types'],
    '8.3' => ['typed class constants', '#[Override] attribute'],
];

$current_version = PHP_VERSION;
foreach ($features as $version => $feats) {
    if (version_compare($current_version, $version, '<')) {
        echo "⚠️  PHP $current_version is older than $version\n";
        echo "   Missing features that might be used: " . implode(', ', $feats) . "\n";
    }
}

// 6. Check for missing vendor files
echo "\n--- Attempt 5: Check vendor/ directory ---\n";
$vendor_autoload = $plugin_dir . '/vendor/autoload.php';
if (file_exists($vendor_autoload)) {
    echo "✅ vendor/autoload.php exists\n";
    
    // Check Composer autoloader
    try {
        require_once $vendor_autoload;
        echo "✅ Composer autoloader loads\n";
        
        // Check a Composer class
        if (class_exists('Composer\Autoload\ClassLoader')) {
            echo "✅ Composer\Autoload\ClassLoader exists\n";
        }
    } catch (Throwable $e) {
        echo "❌ Error loading Composer autoloader:\n";
        echo "   " . $e->getMessage() . "\n";
    }
} else {
    echo "❌ vendor/autoload.php not found\n";
}

// 7. Test class loading
echo "\n--- Attempt 6: Test class loading ---\n";
if (class_exists('Elementify\MCP\Plugin')) {
    echo "✅ Elementify\\MCP\\Plugin class loaded\n";
} else {
    echo "❌ Elementify\\MCP\\Plugin class not loaded\n";
    
    // Try to find out why
    echo "   Checking autoloaders...\n";
    $autoloaders = spl_autoload_functions();
    echo "   Registered autoloaders: " . count($autoloaders) . "\n";
    
    // Check if our autoloader is registered
    $found = false;
    foreach ($autoloaders as $i => $autoloader) {
        if (is_array($autoloader) && isset($autoloader[0]) && is_object($autoloader[0])) {
            $class = get_class($autoloader[0]);
            echo "   [$i] Object: $class\n";
        } elseif (is_string($autoloader)) {
            echo "   [$i] Function: $autoloader\n";
        } elseif (is_array($autoloader) && isset($autoloader[0]) && is_string($autoloader[0])) {
            echo "   [$i] Static: {$autoloader[0]}::{$autoloader[1]}\n";
        }
        
        // Check if it's our autoloader
        if (is_array($autoloader) && 
            isset($autoloader[0]) && 
            $autoloader[0] instanceof Closure &&
            strpos(print_r($autoloader, true), 'Elementify') !== false) {
            $found = true;
        }
    }
    
    if (!$found) {
        echo "   ⚠️  Elementify autoloader not found in registered autoloaders\n";
    }
}

echo "\n=== Error Detection Complete ===\n";
echo "\nIf no errors were found above, the problem might be:\n";
echo "1. A runtime error that occurs only when WordPress is fully loaded\n";
echo "2. A conflict with another plugin\n";
echo "3. A missing WordPress hook or action\n";
echo "\nNext steps:\n";
echo "1. Check /wp-content/debug.log\n";
echo "2. Enable WP_DEBUG in wp-config.php\n";
echo "3. Temporarily disable other plugins\n";