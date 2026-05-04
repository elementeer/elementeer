<?php
/**
 * Debug Script for Elementify Plugin Errors
 * 
 * Usage: Upload to WordPress root and visit /debug-plugin-errors.php
 * Remove after debugging!
 */

// Enable all error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Simulate WordPress environment
define('ABSPATH', dirname(__FILE__) . '/');
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);

echo "<h1>Elementify Plugin Debug</h1>";
echo "<pre>";

// 1. Check if plugin file exists
$plugin_file = ABSPATH . 'wp-content/plugins/elementify/elementify-mcp.php';
echo "1. Checking plugin file: $plugin_file\n";
if (file_exists($plugin_file)) {
    echo "   ✅ Plugin file exists\n";
    
    // Check version
    $content = file_get_contents($plugin_file);
    if (preg_match('/Version:\s*([0-9.]+)/', $content, $matches)) {
        echo "   ✅ Version: " . $matches[1] . "\n";
    }
} else {
    echo "   ❌ Plugin file not found\n";
    echo "   Looking for alternatives...\n";
    $alternatives = glob(ABSPATH . 'wp-content/plugins/*/elementify*.php');
    foreach ($alternatives as $alt) {
        echo "   - $alt\n";
    }
}

echo "\n2. Checking vendor/autoload.php\n";
$autoload_file = ABSPATH . 'wp-content/plugins/elementify/vendor/autoload.php';
if (file_exists($autoload_file)) {
    echo "   ✅ Autoloader exists\n";
    
    // Test autoloader
    try {
        require_once $autoload_file;
        echo "   ✅ Autoloader loads successfully\n";
        
        // Check if Composer classes are available
        if (class_exists('Composer\Autoload\ClassLoader')) {
            echo "   ✅ Composer ClassLoader available\n";
        }
    } catch (Exception $e) {
        echo "   ❌ Autoloader error: " . $e->getMessage() . "\n";
    }
} else {
    echo "   ❌ Autoloader not found\n";
}

echo "\n3. Checking PHP version and extensions\n";
echo "   PHP Version: " . PHP_VERSION . "\n";
echo "   Required: 8.0+\n";
if (version_compare(PHP_VERSION, '8.0.0') >= 0) {
    echo "   ✅ PHP version OK\n";
} else {
    echo "   ❌ PHP version too old\n";
}

// Check required extensions
$required_extensions = ['json', 'mbstring', 'ctype'];
foreach ($required_extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "   ✅ $ext extension loaded\n";
    } else {
        echo "   ⚠️  $ext extension not loaded\n";
    }
}

echo "\n4. Trying to load plugin classes\n";
if (file_exists($plugin_file)) {
    // Include plugin file
    try {
        require_once $plugin_file;
        echo "   ✅ Plugin file loaded\n";
        
        // Check if plugin class can be instantiated
        if (class_exists('Elementify\MCP\Plugin')) {
            echo "   ✅ Plugin class exists\n";
            
            // Try to get instance
            try {
                $reflection = new ReflectionClass('Elementify\MCP\Plugin');
                $method = $reflection->getMethod('get_instance');
                if ($method) {
                    echo "   ✅ Plugin::get_instance() method exists\n";
                }
            } catch (ReflectionException $e) {
                echo "   ❌ Reflection error: " . $e->getMessage() . "\n";
            }
        } else {
            echo "   ❌ Plugin class not found\n";
            
            // Check namespace
            echo "   Checking autoload registration...\n";
            $autoload_functions = spl_autoload_functions();
            echo "   Registered autoloaders: " . count($autoload_functions) . "\n";
        }
    } catch (Exception $e) {
        echo "   ❌ Error loading plugin: " . $e->getMessage() . "\n";
        echo "   Stack trace:\n" . $e->getTraceAsString() . "\n";
    } catch (Error $e) {
        echo "   ❌ Fatal error loading plugin: " . $e->getMessage() . "\n";
        echo "   Stack trace:\n" . $e->getTraceAsString() . "\n";
    }
}

echo "\n5. Checking for common errors\n";
echo "   Memory limit: " . ini_get('memory_limit') . "\n";
echo "   Max execution time: " . ini_get('max_execution_time') . "\n";

// Check for syntax errors in plugin files
if (file_exists($plugin_file)) {
    echo "\n6. Checking for PHP syntax errors\n";
    $output = shell_exec('php -l ' . escapeshellarg($plugin_file) . ' 2>&1');
    if (strpos($output, 'No syntax errors') !== false) {
        echo "   ✅ No syntax errors in main plugin file\n";
    } else {
        echo "   ❌ Syntax error detected:\n   " . $output . "\n";
    }
}

echo "\n=== DEBUG COMPLETE ===\n";
echo "</pre>";

// Security: Remove this file after use
echo "<p style='color: red; font-weight: bold;'>";
echo "⚠️ SECURITY WARNING: Remove this file after debugging!";
echo "</p>";