<?php
/**
 * Debug Script für Elementify Autoloader Problem
 * Auf Server hochladen und ausführen
 */

echo "<h2>Elementify Autoloader Debug</h2>";

// 1. Prüfe Plugin-Verzeichnis
$plugin_dir = __DIR__ . '/wp-content/plugins/elementify';
echo "<h3>1. Plugin-Verzeichnis:</h3>";
if (is_dir($plugin_dir)) {
    echo "✅ Verzeichnis existiert: $plugin_dir<br>";
    
    // Liste wichtige Dateien
    $files = [
        'elementify-mcp.php',
        'vendor/autoload.php',
        'composer.json',
        'includes/Api/Router.php',
    ];
    
    foreach ($files as $file) {
        $path = $plugin_dir . '/' . $file;
        if (file_exists($path)) {
            echo "✅ $file existiert<br>";
            
            // Prüfe Version in Hauptdatei
            if ($file === 'elementify-mcp.php') {
                $content = file_get_contents($path);
                if (preg_match('/Version:\s*([0-9.]+)/', $content, $matches)) {
                    echo "&nbsp;&nbsp;&nbsp;&nbsp;Version: {$matches[1]}<br>";
                }
            }
        } else {
            echo "❌ $file fehlt<br>";
        }
    }
} else {
    echo "❌ Plugin-Verzeichnis nicht gefunden: $plugin_dir<br>";
}

// 2. Prüfe Autoloader
echo "<h3>2. Autoloader Test:</h3>";
$autoload_path = $plugin_dir . '/vendor/autoload.php';
if (file_exists($autoload_path)) {
    echo "✅ vendor/autoload.php existiert<br>";
    
    try {
        require_once $autoload_path;
        echo "✅ Autoloader geladen<br>";
        
        // Teste ob Klassen geladen werden können
        if (class_exists('Elementify\\MCP\\Api\\Router')) {
            echo "✅ Elementify\\MCP\\Api\\Router Klasse gefunden<br>";
        } else {
            echo "❌ Elementify\\MCP\\Api\\Router Klasse nicht gefunden<br>";
        }
        
    } catch (Exception $e) {
        echo "❌ Autoloader Fehler: " . $e->getMessage() . "<br>";
    }
} else {
    echo "❌ vendor/autoload.php nicht gefunden<br>";
    
    // Prüfe ob composer.json existiert
    $composer_path = $plugin_dir . '/composer.json';
    if (file_exists($composer_path)) {
        echo "&nbsp;&nbsp;&nbsp;&nbsp;composer.json existiert - Composer install benötigt<br>";
    }
}

// 3. Prüfe PHP Konfiguration
echo "<h3>3. PHP Konfiguration:</h3>";
echo "PHP Version: " . phpversion() . "<br>";
echo "Memory Limit: " . ini_get('memory_limit') . "<br>";
echo "Max Execution Time: " . ini_get('max_execution_time') . "<br>";

// 4. Prüfe auf andere Plugins die REST API stören könnten
echo "<h3>4. WordPress Plugins (falls WP geladen):</h3>";
if (file_exists(__DIR__ . '/wp-load.php')) {
    require_once __DIR__ . '/wp-load.php';
    
    if (function_exists('get_plugins')) {
        $plugins = get_plugins();
        $active_plugins = get_option('active_plugins');
        
        echo "Aktive Plugins:<br>";
        foreach ($active_plugins as $plugin) {
            $plugin_name = $plugins[$plugin]['Name'] ?? $plugin;
            echo "- $plugin_name<br>";
        }
    }
} else {
    echo "wp-load.php nicht gefunden - kann Plugins nicht prüfen<br>";
}

// 5. Lösungsvorschläge
echo "<h3>5. Lösungsvorschläge:</h3>";
echo "1. SSH auf Server: cd /var/www/html/wp-content/plugins/elementify<br>";
echo "2. Composer ausführen: composer install --no-dev --optimize-autoloader<br>";
echo "3. Falls Composer nicht verfügbar: ZIP mit vendor/ Ordner neu erstellen<br>";
echo "4. Plugin deaktivieren/reaktivieren<br>";
echo "5. Alternative: Auf v0.5.0 zurückrollen<br>";

?>