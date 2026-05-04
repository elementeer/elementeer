<?php
/**
 * Elementify v2 ACTUAL Configuration Test
 * Testet die tatsächliche v2 Konfiguration
 */

if (!defined('ABSPATH')) {
    define('WP_USE_THEMES', false);
    require_once(__DIR__ . '/wp-load.php');
}

header('Content-Type: text/html; charset=utf-8');

echo '<style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .success { color: green; font-weight: bold; }
    .error { color: red; font-weight: bold; }
    .info { color: blue; }
    pre { background: #f5f5f5; padding: 10px; }
</style>';

echo '<h1>🔍 Elementify v2 ACTUAL Configuration Test</h1>';

// ============================================
// 1. Check ACTUAL Elementify v2 Options
// ============================================
echo '<h2>1. Tatsächliche v2 Optionen</h2>';

// These are the ACTUAL option names from the plugin code
$actual_options = array(
    'elementify_mcp_api_keys' => 'API Keys',
    'elementify_mcp_governance' => 'Governance Settings',
    'elementify_mcp_version' => 'Version (if exists)'
);

foreach ($actual_options as $option => $label) {
    $value = get_option($option, 'NOT_SET');
    
    echo '<p><strong>' . $label . ' (' . $option . '):</strong> ';
    
    if ($value === 'NOT_SET') {
        echo '<span class="error">Nicht gesetzt</span>';
    } else {
        echo '<span class="success">Gesetzt</span>';
        
        if (is_array($value)) {
            echo ' (Array mit ' . count($value) . ' Einträgen)';
            echo '<pre>';
            print_r($value);
            echo '</pre>';
        } else {
            echo ': ' . esc_html($value);
        }
    }
    echo '</p>';
}

// ============================================
// 2. Check if REST API is working with v2 endpoints
// ============================================
echo '<h2>2. REST API v2 Endpoints</h2>';

// Try to get ALL REST routes and filter for elementify
$rest_server = rest_get_server();
$all_routes = $rest_server->get_routes();

$elementify_routes = array();
foreach ($all_routes as $route => $handlers) {
    if (strpos($route, 'elementify') !== false) {
        $elementify_routes[$route] = $handlers;
    }
}

if (!empty($elementify_routes)) {
    echo '<p class="success">✓ Elementify REST Routes gefunden:</p>';
    echo '<ul>';
    foreach ($elementify_routes as $route => $handlers) {
        echo '<li><strong>' . $route . '</strong> (' . count($handlers) . ' handler)';
        
        // Test the endpoint
        $url = get_site_url() . '/wp-json' . $route;
        $response = wp_remote_get($url, array('timeout' => 5));
        
        if (is_wp_error($response)) {
            echo ' - <span class="error">Error: ' . $response->get_error_message() . '</span>';
        } else {
            $status = wp_remote_retrieve_response_code($response);
            echo ' - HTTP ' . $status;
            
            if ($status == 200) {
                echo ' <span class="success">✓ OK</span>';
            } elseif ($status == 401) {
                echo ' <span class="info">⚠️ Unauthorized (API Key needed)</span>';
            } else {
                echo ' <span class="error">✗ Problem</span>';
            }
        }
        
        echo '</li>';
    }
    echo '</ul>';
} else {
    echo '<p class="error">✗ Keine Elementify REST Routes registriert!</p>';
}

// ============================================
// 3. Check if plugin classes are loaded
// ============================================
echo '<h2>3. Plugin Klassen Check</h2>';

$classes_to_check = array(
    'Elementify\\MCP\\Plugin',
    'Elementify\\MCP\\Api\\Manager',
    'Elementify\\MCP\\Auth\\Manager'
);

foreach ($classes_to_check as $class) {
    if (class_exists($class)) {
        echo '<p class="success">✓ Klasse existiert: ' . $class . '</p>';
    } else {
        echo '<p class="error">✗ Klasse existiert NICHT: ' . $class . '</p>';
    }
}

// ============================================
// 4. Check Composer autoloader
// ============================================
echo '<h2>4. Composer Autoloader</h2>';

$plugin_dir = WP_PLUGIN_DIR . '/elementify';
$autoloader = $plugin_dir . '/vendor/autoload.php';

if (file_exists($autoloader)) {
    echo '<p class="success">✓ Composer autoload.php existiert</p>';
    
    // Check if it's loaded
    $loaded_autoloaders = spl_autoload_functions();
    $composer_loaded = false;
    
    foreach ($loaded_autoloaders as $loader) {
        if (is_array($loader) && isset($loader[0]) && is_string($loader[0])) {
            if (strpos($loader[0], 'ComposerAutoloaderInit') === 0) {
                $composer_loaded = true;
                break;
            }
        }
    }
    
    if ($composer_loaded) {
        echo '<p class="success">✓ Composer Autoloader ist geladen</p>';
    } else {
        echo '<p class="warning">⚠️ Composer Autoloader scheint nicht geladen zu sein</p>';
    }
} else {
    echo '<p class="error">✗ Composer autoload.php existiert NICHT!</p>';
    echo '<p>Das Plugin benötigt Composer dependencies. Bitte sicherstellen, dass die vendor/ directory im Plugin enthalten ist.</p>';
}

// ============================================
// 5. Test MCP Integration
// ============================================
echo '<h2>5. MCP Integration Test</h2>';

// Check if MCP server file exists
$mcp_server = $plugin_dir . '/mcp-server/server.php';
if (file_exists($mcp_server)) {
    echo '<p class="success">✓ MCP Server Datei existiert</p>';
    
    // Check if MCP is configured
    $mcp_config = get_option('elementify_mcp_config', array());
    if (!empty($mcp_config)) {
        echo '<p class="success">✓ MCP Konfiguration gefunden</p>';
        echo '<pre>';
        print_r($mcp_config);
        echo '</pre>';
    } else {
        echo '<p class="info">ℹ️ Keine MCP Konfiguration gefunden (kann normal sein)</p>';
    }
} else {
    echo '<p class="warning">⚠️ MCP Server Datei nicht gefunden</p>';
}

// ============================================
// 6. Manual API Key Test
// ============================================
echo '<h2>6. API Key Test</h2>';

if (current_user_can('manage_options')) {
    echo '<form method="post">';
    echo '<label>Test API Key: <input type="text" name="test_api_key" value="test-key-' . time() . '"></label><br>';
    echo '<button type="submit" name="test_key">API Key testen</button>';
    echo '</form>';
    
    if (isset($_POST['test_key'])) {
        $test_key = sanitize_text_field($_POST['test_api_key']);
        
        // Get current keys
        $keys = get_option('elementify_mcp_api_keys', array());
        
        // Add test key
        $keys[$test_key] = array(
            'created' => current_time('mysql'),
            'capabilities' => array('read', 'write'),
            'name' => 'Test Key'
        );
        
        update_option('elementify_mcp_api_keys', $keys);
        echo '<p class="success">✓ Test API Key hinzugefügt: ' . $test_key . '</p>';
        
        // Test the key
        $url = get_site_url() . '/wp-json/elementify/v1/templates';
        $response = wp_remote_get($url, array(
            'timeout' => 5,
            'headers' => array(
                'X-API-Key' => $test_key
            )
        ));
        
        echo '<p>Testing endpoint with API Key...</p>';
        
        if (is_wp_error($response)) {
            echo '<p class="error">✗ Error: ' . $response->get_error_message() . '</p>';
        } else {
            $status = wp_remote_retrieve_response_code($response);
            echo '<p>HTTP Status: ' . $status . '</p>';
            
            if ($status == 200) {
                echo '<p class="success">✓ API Key funktioniert!</p>';
            } elseif ($status == 401) {
                echo '<p class="error">✗ API Key wird nicht akzeptiert</p>';
            }
        }
    }
}

// ============================================
// 7. Recommendations
// ============================================
echo '<h2>7. Zusammenfassung & Empfehlungen</h2>';

echo '<h3>Wenn KEINE REST Routes gefunden wurden:</h3>';
echo '<ol>';
echo '<li><strong>Composer Problem:</strong> vendor/ directory fehlt oder ist kaputt</li>';
echo '<li><strong>PHP Error:</strong> Plugin wirft fatalen Error beim Laden</li>';
echo '<li><strong>Namespace Problem:</strong> Autoloader funktioniert nicht</li>';
echo '</ol>';

echo '<h3>Wenn REST Routes da sind aber 401:</h3>';
echo '<ol>';
echo '<li><strong>API Key benötigt:</strong> Alle Endpoints benötigen API Key im Header</li>';
echo '<li><strong>Test:</strong> API Key oben testen</li>';
echo '</ol>';

echo '<h3>Nächste Schritte:</h3>';
echo '<ol>';
echo '<li>Debugging in wp-config.php aktivieren</li>';
echo '<li>PHP error.log prüfen (1,65 MB - da sind Fehler!)</li>';
echo '<li>Composer vendor/ directory prüfen</li>';
echo '<li>Plugin mit debug-activation.php testen</li>';
echo '</ol>';

echo '<hr>';
echo '<p><strong>⚠️ Diese Datei nach Gebrauch löschen!</strong></p>';