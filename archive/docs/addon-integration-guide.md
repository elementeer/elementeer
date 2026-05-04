# Elementify Add‑on Integration Guide

This guide explains how the Elementify MCP adapter framework works, how to create new adapters for Elementor add‑ons, and how to expose detection and inventory tools through the MCP server.

## Overview

The adapter framework provides a unified way to detect installed Elementor add‑ons, retrieve their widgets, post types, capabilities, and widget prefixes. It consists of:

1. **AddonAdapterInterface** – contract each adapter must implement.
2. **BaseAddonAdapter** – skeleton implementation with common detection helpers.
3. **AddonRegistry** – auto‑discovers and registers all installed adapters.
4. **REST endpoint** `/wp-json/elementify/v1/addons` – returns active add‑ons.
5. **MCP tools** – Free and Advanced tools for each add‑on (detect, list widgets, wizard).

## Creating a new adapter

### 1. Choose the plugin slug and widget prefix

Identify the plugin’s WordPress basename (e.g., `essential-addons-for-elementor-lite/essential_adons_elementor.php`), its human‑readable name, and the widget ID prefix used in Elementor (e.g., `eael-`).

### 2. Create the adapter class

Create a new file in `plugin/includes/Api/Adapters/` named `{PluginName}Adapter.php`. The class must extend `BaseAddonAdapter` and implement the required methods.

Example skeleton:

```php
<?php

declare(strict_types=1);

namespace Elementify\MCP\Api\Adapters;

final class MyPluginAdapter extends BaseAddonAdapter {
    private const FREE_BASENAME = 'my-plugin/my-plugin.php';
    private const PRO_BASENAME  = 'my-plugin-pro/my-plugin.php';
    private const OPTION_NAME   = 'my_plugin_settings';
    private const WIDGET_KEY    = 'widget_list';

    public function __construct() {
        $basename = $this->detect_active_basename();
        $name     = 'My Plugin for Elementor';
        $slug     = $this->basename_to_slug($basename);
        $prefix   = 'my-';

        parent::__construct($basename, $name, $slug, $prefix);
    }

    private function detect_active_basename(): string {
        // Determine which version (Free/Pro) is active
        if (is_plugin_active(self::FREE_BASENAME)) return self::FREE_BASENAME;
        if (is_plugin_active(self::PRO_BASENAME))  return self::PRO_BASENAME;
        return self::FREE_BASENAME; // fallback for detection
    }

    private function basename_to_slug(string $basename): string {
        return dirname($basename);
    }

    protected function detect_tier(): ?string {
        if (defined('MY_PLUGIN_PRO_VERSION')) return 'pro';
        if (defined('MY_PLUGIN_VERSION'))     return 'free';
        // fallback to basename
        if ($this->plugin_basename === self::PRO_BASENAME)  return 'pro';
        if ($this->plugin_basename === self::FREE_BASENAME) return 'free';
        return null;
    }

    public function get_widgets(): array {
        if (!$this->active) return [];
        return $this->get_widget_status_from_option(self::OPTION_NAME, self::WIDGET_KEY);
    }

    public function get_capabilities(): array {
        $caps = [];
        if ($this->active) {
            $caps[] = 'my-plugin-widgets';
            $caps[] = $this->widget_prefix . $this->detect_tier();
        }
        return $caps;
    }

    // Override get_post_types() if the plugin registers custom post types
    // Override get_elementor_widget_types() if the widget prefix is dynamic
}
```

### 3. Implement widget detection

Most Elementor add‑ons store widget activation status in a WordPress option. Use the helper `$this->get_widget_status_from_option($option_name, $widget_key)` to parse it.

If the plugin stores widget data differently, override `get_widgets()` and fetch the data directly.

### 4. Register MCP tools

Create a TypeScript tool file in `mcp‑server/src/tools/` named after your plugin (e.g., `my‑plugin.ts`). Export two functions:

- `registerMyPluginFreeTools` – registers Free tier tools (`detect_my_plugin`, `list_my_plugin_widgets`)
- `registerMyPluginAdvancedTools` – registers Advanced tier tools (`analyze_my_plugin_usage`, `optimize_my_plugin_config`, `wizard_my_plugin`)

Follow the pattern from existing adapters (e.g., `essential‑addons.ts`). Use the client methods `listActiveAddons()` and `listActiveAddonsDetailed()` to retrieve adapter data.

### 5. Add tool registrations to the index

Import your tool registrars in `mcp‑server/src/tools/index.ts` and add them to the appropriate arrays (`FREE_TOOL_REGISTRARS`, `ADVANCED_TOOL_REGISTRARS`).

## Detection lifecycle

1. **Plugin activation** – When a request hits the `/addons` endpoint, `AddonRegistry` scans the `Adapters` directory (and applies the `elementify_mcp_addon_adapters` filter) to find all concrete adapter classes.
2. **Instantiation** – Each adapter is instantiated; its `detect()` method checks whether the corresponding plugin is active.
3. **Registration** – If `detect()` returns non‑null metadata, the adapter is stored in the registry.
4. **Data aggregation** – The registry’s `get_active_addons()` returns basic metadata; `get_all_info()` calls each adapter’s `get_info()`, which in turn calls `get_widgets()`, `get_post_types()`, `get_capabilities()`, and `get_elementor_widget_types()`.

## MCP tool patterns

### Free tools

- `detect_{plugin}` – shows version, tier, widget count, active status.
- `list_{plugin}_widgets` – lists all widgets with activation status.

### Advanced tools

- `analyze_{plugin}_usage` – (future) scans pages for widget usage.
- `optimize_{plugin}_config` – (future) suggests deactivating unused widgets.
- `wizard_{plugin}` – (future) guided setup recommendations.

## Adding the adapter to the site assessment

The site assessment endpoint (`GET /site/assessment`) automatically includes an `elementor_addons` key with the output of `AddonRegistry::get_active_addons()` and `get_all_info()`. No extra work is required.

## Testing your adapter

### PHPUnit tests

Create a test class in `plugin/tests/Unit/Api/Adapters/`. Mock WordPress functions with Brain Monkey and verify detection, widget listing, and tier detection.

Example test structure:

```php
use Brain\Monkey;
use Brain\Monkey\Functions;
use Elementify\MCP\Api\Adapters\MyPluginAdapter;

class MyPluginAdapterTest extends TestCase {
    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
        Functions\when('is_plugin_active')->alias(…);
    }

    public function test_detection_when_plugin_active(): void {
        // arrange
        Functions\expect('is_plugin_active')->once()->andReturn(true);
        Functions\expect('get_plugin_data')->once()->andReturn(['Version' => '1.2.3']);
        // act
        $adapter = new MyPluginAdapter();
        $result = $adapter->detect();
        // assert
        $this->assertNotNull($result);
        $this->assertSame('1.2.3', $result['version']);
    }
}
```

### MCP integration tests

Add integration tests in `mcp‑server/src/__tests__/tools/` that mock the client and verify the tool output.

## Troubleshooting

- **Adapter not appearing in `/addons` response** – Ensure your plugin basename is correct and the adapter’s `detect()` method returns non‑null when the plugin is active.
- **Widget list empty** – Verify the option name and key used by the plugin. Check that the option exists and contains the expected array structure.
- **MCP tools missing** – Confirm your tool registrars are imported in `tools/index.ts` and added to the correct registrar arrays.

## Example adapters

Refer to these fully implemented adapters:

- `EssentialAddonsAdapter` – free/pro detection, widget status from option `eael_save_settings`
- `CrocoblockAdapter` – JetEngine, JetBlog, JetWooBuilder detection, dynamic post‑type listing
- `PowerPackAdapter`, `HappyAddonsAdapter`, `ElementsKitAdapter`, `PremiumAddonsAdapter`, `ThePlusAddonsAdapter` – Tier 2 plugins following the same pattern.

## Extending the framework

Need to add new adapter capabilities? Update `AddonAdapterInterface` and `BaseAddonAdapter` accordingly, then implement the new methods in concrete adapters.

---

**Maintainer notes**: The adapter framework is designed to be extensible with minimal boilerplate. Keep detection logic simple and rely on the base class helpers where possible. Always add tests for new adapters.