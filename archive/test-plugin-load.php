<?php
/**
 * Test Script for Elementify Plugin Load
 * Run: php test-plugin-load.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

echo "=== Elementify Plugin Load Test ===\n\n";

// 1. Set up test environment
$plugin_dir = __DIR__ . '/plugin';
$plugin_file = $plugin_dir . '/elementify-mcp.php';

echo "1. Checking plugin files...\n";
if (!file_exists($plugin_file)) {
    die("❌ Plugin file not found: $plugin_file\n");
}
echo "✅ Plugin file exists\n";

// 2. Check vendor/autoload.php
$autoload_file = $plugin_dir . '/vendor/autoload.php';
if (!file_exists($autoload_file)) {
    die("❌ Autoloader not found: $autoload_file\n");
}
echo "✅ Autoloader exists\n";

// 3. Test autoloader
echo "\n2. Testing autoloader...\n";
try {
    require_once $autoload_file;
    echo "✅ Autoloader loaded\n";
    
    // Check Composer autoloader
    if (class_exists('Composer\Autoload\ClassLoader')) {
        echo "✅ Composer ClassLoader available\n";
    } else {
        echo "❌ Composer ClassLoader not found\n";
    }
} catch (Exception $e) {
    die("❌ Autoloader error: " . $e->getMessage() . "\n");
} catch (Error $e) {
    die("❌ PHP Error loading autoloader: " . $e->getMessage() . "\n");
}

// 4. Test loading plugin file
echo "\n3. Testing plugin file...\n";
try {
    // Define WordPress constants
    define('ABSPATH', __DIR__ . '/');
    define('WP_DEBUG', true);
    
    // Load plugin
    require_once $plugin_file;
    echo "✅ Plugin file loaded\n";
    
    // Check if namespace is available
    if (function_exists('spl_autoload_functions')) {
        $autoloaders = spl_autoload_functions();
        echo "✅ Registered autoloaders: " . count($autoloaders) . "\n";
    }
    
    // Try to access plugin class
    if (class_exists('Elementify\MCP\Plugin')) {
        echo "✅ Plugin class exists\n";
        
        // Try reflection
        try {
            $reflection = new ReflectionClass('Elementify\MCP\Plugin');
            echo "✅ Reflection successful\n";
            
            // Check methods
            $methods = $reflection->getMethods();
            echo "✅ Methods: " . count($methods) . "\n";
            
        } catch (ReflectionException $e) {
            echo "⚠️ Reflection error: " . $e->getMessage() . "\n";
        }
    } else {
        echo "❌ Plugin class not found\n";
        
        // Check what classes ARE available
        echo "Checking available classes...\n";
        $declared = get_declared_classes();
        $elementify_classes = array_filter($declared, function($class) {
            return strpos($class, 'Elementify') !== false;
        });
        echo "Elementify classes found: " . count($elementify_classes) . "\n";
        foreach ($elementify_classes as $class) {
            echo "  - $class\n";
        }
    }
    
} catch (Exception $e) {
    die("❌ Exception loading plugin: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n");
} catch (Error $e) {
    die("❌ PHP Fatal Error loading plugin: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n");
}

// 5. Test includes/Plugin.php directly
echo "\n4. Testing includes/Plugin.php...\n";
$plugin_class_file = $plugin_dir . '/includes/Plugin.php';
if (file_exists($plugin_class_file)) {
    try {
        require_once $plugin_class_file;
        echo "✅ Plugin class file loaded\n";
    } catch (Exception $e) {
        echo "❌ Error loading Plugin.php: " . $e->getMessage() . "\n";
    } catch (Error $e) {
        echo "❌ PHP Error loading Plugin.php: " . $e->getMessage() . "\n";
        echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    }
} else {
    echo "❌ Plugin.php not found\n";
}

// 6. Check for syntax errors
echo "\n5. Checking for syntax errors...\n";
$output = shell_exec('php -l ' . escapeshellarg($plugin_file) . ' 2>&1');
if (strpos($output, 'No syntax errors') !== false) {
    echo "✅ No syntax errors in main plugin file\n";
} else {
    echo "❌ Syntax error detected:\n" . $output . "\n";
}

// Check includes/ directory
echo "\n6. Checking includes/ directory structure...\n";
$includes_dir = $plugin_dir . '/includes';
if (is_dir($includes_dir)) {
    $php_files = glob($includes_dir . '/**/*.php');
    echo "✅ PHP files in includes/: " . count($php_files) . "\n";
    
    // Check a few important files
    $important_files = [
        'includes/Plugin.php',
        'includes/Api/Router.php',
        'includes/Auth/Manager.php',
        'includes/Admin/Page.php',
    ];
    
    foreach ($important_files as $file) {
        if (file_exists($plugin_dir . '/' . $file)) {
            echo "✅ $file exists\n";
        } else {
            echo "❌ $file missing\n";
        }
    }
} else {
    echo "❌ includes/ directory not found\n";
}

echo "\n=== TEST COMPLETE ===\n";

// 7. Test actual initialization
echo "\n7. Testing plugin initialization...\n";
try {
    // Check if we can get instance
    if (method_exists('Elementify\MCP\Plugin', 'get_instance')) {
        $plugin = Elementify\MCP\Plugin::get_instance();
        echo "✅ Plugin instance created\n";
        
        if (method_exists($plugin, 'init')) {
            echo "✅ Plugin::init() method exists\n";
            // Don't actually call init() as it requires WordPress
        }
    }
} catch (Exception $e) {
    echo "❌ Exception getting instance: " . $e->getMessage() . "\n";
} catch (Error $e) {
    echo "❌ PHP Error getting instance: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}