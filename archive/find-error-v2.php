<?php
/**
 * Elementify v2 Error Finder
 * Testet das v2 Plugin auf Fehler und Konfigurationsprobleme
 * 
 * Anleitung:
 * 1. Diese Datei in WordPress Root-Verzeichnis hochladen
 * 2. Aufrufen: https://deine-site.de/find-error-v2.php
 * 3. Ergebnisse analysieren
 * 4. Datei danach löschen (Sicherheit!)
 */

// Sicherheits-Check
if (!defined('ABSPATH')) {
    define('WP_USE_THEMES', false);
    require_once(__DIR__ . '/wp-load.php');
}

// Error Reporting aktivieren
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Content Type setzen
header('Content-Type: text/html; charset=utf-8');

// CSS für bessere Darstellung
echo '<style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #0073aa; padding-bottom: 10px; }
    h2 { color: #0073aa; margin-top: 30px; }
    .section { margin: 20px 0; padding: 15px; border-left: 4px solid #0073aa; background: #f9f9f9; }
    .success { color: #46b450; font-weight: bold; }
    .warning { color: #ffb900; font-weight: bold; }
    .error { color: #dc3232; font-weight: bold; }
    .info { color: #00a0d2; }
    pre { background: #f1f1f1; padding: 10px; border-radius: 4px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f2f2f2; }
    .test-result { margin: 5px 0; padding: 5px; }
</style>';

echo '<div class="container">';
echo '<h1>🔍 Elementify v2 Error Finder</h1>';
echo '<p><strong>Datum:</strong> ' . date('d.m.Y H:i:s') . '</p>';
echo '<p><strong>URL:</strong> ' . get_site_url() . '</p>';

// ============================================
// 1. WordPress & PHP Info
// ============================================
echo '<div class="section">';
echo '<h2>1. WordPress & PHP Umgebung</h2>';

echo '<table>';
echo '<tr><th>Parameter</th><th>Wert</th><th>Status</th></tr>';

// WordPress Version
$wp_version = get_bloginfo('version');
echo '<tr><td>WordPress Version</td><td>' . esc_html($wp_version) . '</td>';
echo '<td><span class="' . (version_compare($wp_version, '6.0', '>=') ? 'success' : 'error') . '">';
echo version_compare($wp_version, '6.0', '>=') ? '✓ OK' : '✗ Zu alt (min 6.0)';
echo '</span></td></tr>';

// PHP Version
$php_version = phpversion();
echo '<tr><td>PHP Version</td><td>' . esc_html($php_version) . '</td>';
echo '<td><span class="' . (version_compare($php_version, '8.0', '>=') ? 'success' : 'error') . '">';
echo version_compare($php_version, '8.0', '>=') ? '✓ OK' : '✗ Zu alt (min 8.0)';
echo '</span></td></tr>';

// Memory Limit
$memory_limit = ini_get('memory_limit');
echo '<tr><td>PHP Memory Limit</td><td>' . esc_html($memory_limit) . '</td>';
echo '<td><span class="' . (wp_convert_hr_to_bytes($memory_limit) >= 256 * 1024 * 1024 ? 'success' : 'warning') . '">';
echo wp_convert_hr_to_bytes($memory_limit) >= 256 * 1024 * 1024 ? '✓ OK' : '⚠️ Empfohlen: 256M';
echo '</span></td></tr>';

// Max Execution Time
$max_execution = ini_get('max_execution_time');
echo '<tr><td>Max Execution Time</td><td>' . esc_html($max_execution) . 's</td>';
echo '<td><span class="' . ($max_execution >= 30 ? 'success' : 'warning') . '">';
echo $max_execution >= 30 ? '✓ OK' : '⚠️ Empfohlen: 30s';
echo '</span></td></tr>';

echo '</table>';
echo '</div>';

// ============================================
// 2. Elementor Check
// ============================================
echo '<div class="section">';
echo '<h2>2. Elementor Status</h2>';

if (defined('ELEMENTOR_VERSION')) {
    echo '<p class="success">✓ Elementor ist installiert: Version ' . ELEMENTOR_VERSION . '</p>';
    
    // Check if Elementor Pro
    if (defined('ELEMENTOR_PRO_VERSION')) {
        echo '<p class="success">✓ Elementor Pro ist installiert: Version ' . ELEMENTOR_PRO_VERSION . '</p>';
    } else {
        echo '<p class="warning">⚠️ Elementor Pro nicht gefunden (kann einige Features limitieren)</p>';
    }
    
    // Check Elementor Pages
    $elementor_pages = new WP_Query(array(
        'post_type' => 'any',
        'posts_per_page' => 5,
        'meta_key' => '_elementor_edit_mode',
        'meta_value' => 'builder'
    ));
    
    echo '<p class="info">ℹ️ ' . $elementor_pages->found_posts . ' Seiten mit Elementor Builder gefunden</p>';
    
} else {
    echo '<p class="error">✗ Elementor ist NICHT installiert oder aktiviert</p>';
    echo '<p>Elementify benötigt Elementor als Abhängigkeit.</p>';
}
echo '</div>';

// ============================================
// 3. Elementify v2 Plugin Check
// ============================================
echo '<div class="section">';
echo '<h2>3. Elementify v2 Plugin Status</h2>';

// Check if plugin is active
$elementify_active = is_plugin_active('elementify/elementify-mcp.php') || 
                     is_plugin_active('elementify-mcp/elementify-mcp.php');

if ($elementify_active) {
    echo '<p class="success">✓ Elementify Plugin ist aktiviert</p>';
    
    // Try to get plugin data
    $plugin_data = get_plugin_data(WP_PLUGIN_DIR . '/elementify/elementify-mcp.php');
    if (empty($plugin_data)) {
        $plugin_data = get_plugin_data(WP_PLUGIN_DIR . '/elementify-mcp/elementify-mcp.php');
    }
    
    if (!empty($plugin_data)) {
        echo '<table>';
        echo '<tr><th>Parameter</th><th>Wert</th></tr>';
        echo '<tr><td>Plugin Name</td><td>' . esc_html($plugin_data['Name']) . '</td></tr>';
        echo '<tr><td>Version</td><td>' . esc_html($plugin_data['Version']) . '</td></tr>';
        echo '<tr><td>Author</td><td>' . esc_html($plugin_data['Author']) . '</td></tr>';
        echo '<tr><td>Description</td><td>' . esc_html($plugin_data['Description']) . '</td></tr>';
        echo '</table>';
    }
    
    // Check for v2 specific files
    $v2_files = array(
        'includes/Api/Translation.php',
        'includes/Governance/Settings.php',
        'includes/Workflow/Orchestrator.php'
    );
    
    echo '<h3>v2 Dateien Check:</h3>';
    foreach ($v2_files as $file) {
        $full_path = WP_PLUGIN_DIR . '/elementify/' . $file;
        if (file_exists($full_path)) {
            echo '<p class="success">✓ ' . $file . ' existiert</p>';
        } else {
            echo '<p class="warning">⚠️ ' . $file . ' nicht gefunden (v2 Feature?)</p>';
        }
    }
    
} else {
    echo '<p class="error">✗ Elementify Plugin ist NICHT aktiviert</p>';
    
    // Check if installed but not active
    $plugins = get_plugins();
    $elementify_installed = false;
    foreach ($plugins as $plugin_path => $plugin_data) {
        if (strpos($plugin_path, 'elementify') !== false) {
            $elementify_installed = true;
            echo '<p class="info">ℹ️ Elementify gefunden aber nicht aktiviert: ' . $plugin_data['Name'] . ' ' . $plugin_data['Version'] . '</p>';
            break;
        }
    }
    
    if (!$elementify_installed) {
        echo '<p class="error">✗ Elementify ist nicht installiert</p>';
    }
}
echo '</div>';

// ============================================
// 4. REST API Test
// ============================================
echo '<div class="section">';
echo '<h2>4. REST API Tests</h2>';

$api_endpoints = array(
    'Site Info' => '/wp-json/elementify/v1/site-info',
    'Templates' => '/wp-json/elementify/v1/templates',
    'Health (v1 style)' => '/wp-json/elementify/v1/health',
    'WordPress REST' => '/wp-json/'
);

foreach ($api_endpoints as $name => $endpoint) {
    $url = get_site_url() . $endpoint;
    $response = wp_remote_get($url, array('timeout' => 10));
    
    echo '<div class="test-result">';
    echo '<strong>' . $name . ':</strong> ' . $endpoint . '<br>';
    
    if (is_wp_error($response)) {
        echo '<span class="error">✗ Fehler: ' . $response->get_error_message() . '</span>';
    } else {
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        
        if ($status_code == 200) {
            echo '<span class="success">✓ HTTP ' . $status_code . ' (OK)</span>';
            
            // Try to decode JSON
            $json = json_decode($body, true);
            if ($json && $name == 'Site Info') {
                echo '<br><span class="info">ℹ️ Version: ' . ($json['version'] ?? 'N/A') . '</span>';
            }
        } elseif ($status_code == 404 && $name == 'Health (v1 style)') {
            echo '<span class="warning">⚠️ HTTP 404 (v1 Endpoint existiert nicht in v2 - normal)</span>';
        } else {
            echo '<span class="' . ($status_code >= 500 ? 'error' : 'warning') . '">';
            echo 'HTTP ' . $status_code . ' (' . wp_remote_retrieve_response_message($response) . ')';
            echo '</span>';
        }
    }
    echo '</div>';
}
echo '</div>';

// ============================================
// 5. Database Check (Elementify Tables)
// ============================================
echo '<div class="section">';
echo '<h2>5. Datenbank Check</h2>';

global $wpdb;

// Check for Elementify tables
$tables = array(
    $wpdb->prefix . 'elementify_queue',
    $wpdb->prefix . 'elementify_workflows',
    $wpdb->prefix . 'elementify_snapshots'
);

foreach ($tables as $table) {
    $result = $wpdb->get_var("SHOW TABLES LIKE '$table'");
    if ($result == $table) {
        // Count rows
        $count = $wpdb->get_var("SELECT COUNT(*) FROM $table");
        echo '<p class="success">✓ Tabelle ' . $table . ' existiert (' . $count . ' Einträge)</p>';
    } else {
        echo '<p class="info">ℹ️ Tabelle ' . $table . ' existiert nicht (kann normal sein)</p>';
    }
}

// Check for Elementify options
$options = array(
    'elementify_version',
    'elementify_activation_mode',
    'elementify_api_keys'
);

foreach ($options as $option) {
    $value = get_option($option, 'NOT SET');
    echo '<p><strong>' . $option . ':</strong> ' . 
         (is_array($value) ? 'Array' : ($value === 'NOT SET' ? '<span class="warning">Nicht gesetzt</span>' : esc_html($value))) . 
         '</p>';
}
echo '</div>';

// ============================================
// 6. Error Log Check
// ============================================
echo '<div class="section">';
echo '<h2>6. Error Log Check</h2>';

// Check WordPress debug.log
$debug_log = WP_CONTENT_DIR . '/debug.log';
if (file_exists($debug_log)) {
    $log_size = filesize($debug_log);
    $log_content = file_get_contents($debug_log);
    
    echo '<p class="' . ($log_size > 1024 * 1024 ? 'warning' : 'info') . '">';
    echo 'ℹ️ debug.log existiert (' . size_format($log_size, 2) . ')</p>';
    
    // Check for Elementify errors
    if (strpos($log_content, 'elementify') !== false || 
        strpos($log_content, 'Elementify') !== false) {
        echo '<p class="error">✗ Elementify Fehler im debug.log gefunden</p>';
        
        // Show last 5 Elementify related lines
        $lines = explode("\n", $log_content);
        $elementify_lines = array();
        foreach ($lines as $line) {
            if (stripos($line, 'elementify') !== false) {
                $elementify_lines[] = $line;
                if (count($elementify_lines) >= 5) break;
            }
        }
        
        if (!empty($elementify_lines)) {
            echo '<h3>Letzte Elementify Fehler:</h3>';
            echo '<pre>';
            foreach ($elementify_lines as $line) {
                echo esc_html($line) . "\n";
            }
            echo '</pre>';
        }
    } else {
        echo '<p class="success">✓ Keine Elementify Fehler im debug.log gefunden</p>';
    }
} else {
    echo '<p class="info">ℹ️ debug.log existiert nicht (WP_DEBUG_LOG ist wahrscheinlich deaktiviert)</p>';
}

// Check PHP error log
$php_error_log = ini_get('error_log');
if ($php_error_log && file_exists($php_error_log)) {
    $php_log_size = filesize($php_error_log);
    echo '<p class="info">ℹ️ PHP error.log: ' . $php_error_log . ' (' . size_format($php_log_size, 2) . ')</p>';
}
echo '</div>';

// ============================================
// 7. Recommendations
// ============================================
echo '<div class="section">';
echo '<h2>7. Empfehlungen & Nächste Schritte</h2>';

echo '<ol>';
echo '<li><strong>Wenn Elementify nicht aktiviert ist:</strong> Plugin im WordPress Admin aktivieren</li>';
echo '<li><strong>Wenn Elementor fehlt:</strong> Elementor Plugin installieren und aktivieren</li>';
echo '<li><strong>Bei API Fehlern:</strong> Permalinks neu speichern (Einstellungen → Permalinks)</li>';
echo '<li><strong>Bei PHP Memory Issues:</strong> wp-config.php anpassen: define(\'WP_MEMORY_LIMIT\', \'256M\')</li>';
echo '<li><strong>Für Debugging:</strong> In wp-config.php aktivieren:<br>';
echo '<pre>define(\'WP_DEBUG\', true);
define(\'WP_DEBUG_LOG\', true);
define(\'WP_DEBUG_DISPLAY\', false);</pre></li>';
echo '<li><strong>v2 Specific:</strong> API Keys in Elementify Settings prüfen</li>';
echo '</ol>';

echo '<p class="warning"><strong>⚠️ WICHTIG:</strong> Diese Datei nach Gebrauch löschen (Sicherheitsrisiko!)</p>';
echo '</div>';

// ============================================
// 8. Quick Fix Buttons (für Admin)
// ============================================
if (current_user_can('activate_plugins')) {
    echo '<div class="section">';
    echo '<h2>8. Quick Fixes (nur für Admins)</h2>';
    
    echo '<form method="post" style="margin: 10px 0;">';
    echo '<input type="hidden" name="action" value="flush_rewrite">';
    echo '<button type="submit" name="flush_rewrite_rules" class="button button-primary">Permalinks neu schreiben</button>';
    echo '</form>';
    
    echo '<form method="post" style="margin: 10px 0;">';
    echo '<input type="hidden" name="action" value="clear_transients">';
    echo '<button type="submit" name="clear_transients" class="button">Transients löschen</button>';
    echo '</form>';
    
    // Handle form submissions
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_POST['flush_rewrite_rules'])) {
            flush_rewrite_rules();
            echo '<p class="success">✓ Permalinks wurden neu geschrieben</p>';
        }
        
        if (isset($_POST['clear_transients'])) {
            global $wpdb;
            $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_%'");
            $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_site_transient_%'");
            echo '<p class="success">✓ Transients wurden gelöscht</p>';
        }
    }
    echo '</div>';
}

echo '</div>'; // Close container

// Cleanup
if (file_exists(__FILE__)) {
    echo '<hr>';
    echo '<p class="info">📁 Diese Datei: ' . __FILE__ . ' (' . size_format(filesize(__FILE__), 2) . ')</p>';
    echo '<p><strong>Bitte diese Datei nach Gebrauch löschen!</strong></p>';
}