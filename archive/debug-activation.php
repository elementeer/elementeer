<?php
/**
 * Elementify v2 Activation Debug Script
 * Testet die Plugin Activation und Datenbank-Erstellung
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
    .warning { color: orange; font-weight: bold; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
</style>';

echo '<h1>🔧 Elementify v2 Activation Debug</h1>';

global $wpdb;

// ============================================
// 1. Check if plugin file exists
// ============================================
echo '<h2>1. Plugin Dateien Check</h2>';

$plugin_paths = array(
    WP_PLUGIN_DIR . '/elementify/elementify-mcp.php',
    WP_PLUGIN_DIR . '/elementify-mcp/elementify-mcp.php'
);

$plugin_file = null;
foreach ($plugin_paths as $path) {
    if (file_exists($path)) {
        $plugin_file = $path;
        echo '<p class="success">✓ Plugin Datei gefunden: ' . $path . '</p>';
        
        // Get plugin data
        $plugin_data = get_plugin_data($path);
        echo '<pre>';
        print_r($plugin_data);
        echo '</pre>';
        break;
    }
}

if (!$plugin_file) {
    echo '<p class="error">✗ Keine Plugin Datei gefunden!</p>';
    exit;
}

// ============================================
// 2. Check activation status
// ============================================
echo '<h2>2. Activation Status</h2>';

$active_plugins = get_option('active_plugins', array());
$plugin_active = false;

foreach ($active_plugins as $plugin) {
    if (strpos($plugin, 'elementify') !== false) {
        $plugin_active = true;
        echo '<p class="success">✓ Plugin ist aktiviert: ' . $plugin . '</p>';
        break;
    }
}

if (!$plugin_active) {
    echo '<p class="error">✗ Plugin ist NICHT in active_plugins Option</p>';
}

// ============================================
// 3. Check for Elementify options
// ============================================
echo '<h2>3. Elementify Optionen</h2>';

$options_to_check = array(
    'elementify_version',
    'elementify_activation_mode',
    'elementify_api_keys',
    'elementify_settings',
    'elementify_capabilities'
);

foreach ($options_to_check as $option) {
    $value = get_option($option, 'NOT_SET');
    echo '<p><strong>' . $option . ':</strong> ';
    
    if ($value === 'NOT_SET') {
        echo '<span class="error">Nicht gesetzt</span>';
    } else {
        echo '<span class="success">Gesetzt</span>';
        if (is_array($value)) {
            echo ' (Array mit ' . count($value) . ' Einträgen)';
        } else {
            echo ': ' . esc_html($value);
        }
    }
    echo '</p>';
}

// ============================================
// 4. Check database tables
// ============================================
echo '<h2>4. Datenbank Tabellen</h2>';

$tables = array(
    $wpdb->prefix . 'elementify_queue',
    $wpdb->prefix . 'elementify_workflows',
    $wpdb->prefix . 'elementify_snapshots',
    $wpdb->prefix . 'elementify_governance_log'
);

foreach ($tables as $table) {
    $result = $wpdb->get_var("SHOW TABLES LIKE '$table'");
    
    if ($result == $table) {
        // Get table structure
        $structure = $wpdb->get_results("DESCRIBE $table");
        $count = $wpdb->get_var("SELECT COUNT(*) FROM $table");
        
        echo '<p class="success">✓ Tabelle ' . $table . ' existiert (' . $count . ' rows)</p>';
        echo '<pre>';
        print_r($structure);
        echo '</pre>';
    } else {
        echo '<p class="error">✗ Tabelle ' . $table . ' existiert NICHT</p>';
    }
}

// ============================================
// 5. Check REST API routes
// ============================================
echo '<h2>5. REST API Routes</h2>';

// Get all REST routes
$rest_server = rest_get_server();
$routes = $rest_server->get_routes();

$elementify_routes = array();
foreach ($routes as $route => $handlers) {
    if (strpos($route, 'elementify') !== false) {
        $elementify_routes[$route] = $handlers;
    }
}

if (!empty($elementify_routes)) {
    echo '<p class="success">✓ Elementify REST Routes gefunden:</p>';
    echo '<ul>';
    foreach ($elementify_routes as $route => $handlers) {
        echo '<li>' . $route . ' (' . count($handlers) . ' handler)</li>';
    }
    echo '</ul>';
} else {
    echo '<p class="error">✗ Keine Elementify REST Routes registriert!</p>';
}

// ============================================
// 6. Try to manually trigger activation
// ============================================
echo '<h2>6. Manuelle Activation Test</h2>';

if (current_user_can('activate_plugins')) {
    echo '<form method="post">';
    echo '<input type="hidden" name="run_activation" value="1">';
    echo '<button type="submit" class="button button-primary">Activation Hook manuell ausführen</button>';
    echo '</form>';
    
    if (isset($_POST['run_activation']) && $_POST['run_activation'] == '1') {
        echo '<h3>Activation Results:</h3>';
        
        // Include plugin file to get activation function
        if ($plugin_file) {
            // First deactivate if active
            if ($plugin_active) {
                deactivate_plugins(plugin_basename($plugin_file));
                echo '<p>Plugin deaktiviert...</p>';
                flush_rewrite_rules();
            }
            
            // Try to activate
            $result = activate_plugin(plugin_basename($plugin_file));
            
            if (is_wp_error($result)) {
                echo '<p class="error">✗ Activation fehlgeschlagen: ' . $result->get_error_message() . '</p>';
            } else {
                echo '<p class="success">✓ Plugin aktiviert</p>';
                
                // Flush rewrite rules
                flush_rewrite_rules();
                echo '<p>Rewrite rules geflusht</p>';
                
                // Check options again
                echo '<h4>Optionen nach Activation:</h4>';
                foreach ($options_to_check as $option) {
                    $value = get_option($option, 'NOT_SET');
                    echo '<p><strong>' . $option . ':</strong> ' . 
                         ($value === 'NOT_SET' ? '<span class="error">Nicht gesetzt</span>' : '<span class="success">Gesetzt</span>') . 
                         '</p>';
                }
            }
        }
    }
} else {
    echo '<p class="warning">⚠️ Admin Rechte benötigt für manuelle Activation</p>';
}

// ============================================
// 7. Check for activation hooks
// ============================================
echo '<h2>7. Activation Hooks Check</h2>';

// Read plugin file to find activation hook
$plugin_content = file_get_contents($plugin_file);
if (strpos($plugin_content, 'register_activation_hook') !== false) {
    echo '<p class="success">✓ register_activation_hook() gefunden im Plugin</p>';
    
    // Extract activation function
    preg_match('/register_activation_hook\s*\(.*?,\s*[\'"]([^\'"]+)[\'"]\s*\)/', $plugin_content, $matches);
    if (!empty($matches[1])) {
        echo '<p>Activation function: ' . $matches[1] . '</p>';
        
        // Check if function exists
        if (function_exists($matches[1])) {
            echo '<p class="success">✓ Activation function existiert: ' . $matches[1] . '()</p>';
        } else {
            echo '<p class="error">✗ Activation function existiert NICHT: ' . $matches[1] . '()</p>';
        }
    }
} else {
    echo '<p class="error">✗ register_activation_hook() NICHT gefunden!</p>';
}

// ============================================
// 8. Recommendations
// ============================================
echo '<h2>8. Empfehlungen</h2>';

echo '<ol>';
echo '<li><strong>Wenn Tabellen fehlen:</strong> Plugin komplett deinstallieren und neu installieren</li>';
echo '<li><strong>Wenn Options fehlen:</strong> Activation Hook manuell ausführen (oben)</li>';
echo '<li><strong>Wenn REST Routes fehlen:</strong> Permalinks neu schreiben + Plugin reaktivieren</li>';
echo '<li><strong>Bei PHP Fehlern:</strong> Debugging aktivieren und error.log prüfen</li>';
echo '</ol>';

echo '<p><strong>Quick Fix Sequence:</strong></p>';
echo '<pre>
1. Plugin deaktivieren
2. Plugin löschen  
3. elementify-2.0.0-wordpress.zip neu hochladen
4. Plugin aktivieren
5. Permalinks neu schreiben (Einstellungen → Permalinks → Speichern)
6. find-error-v2.php erneut ausführen
</pre>';

echo '<hr>';
echo '<p><strong>⚠️ Diese Datei nach Gebrauch löschen!</strong></p>';