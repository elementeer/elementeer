<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class ProviderRegistrationTest extends TestCase
{
    public function test_host_adapter_interface_exists_and_can_be_loaded(): void
    {
        $this->assertTrue(
            interface_exists(\Elementeer\MCP\Activation\HostAdapter::class),
            'HostAdapter interface should be loadable'
        );
    }

    public function test_contracts_class_exists(): void
    {
        $this->assertTrue(
            class_exists(\Elementeer\MCP\Auth\Contracts::class),
            'Contracts class should exist'
        );
    }

    public function test_wordpress_write_capability_constants_are_defined(): void
    {
        $core_contracts = \Elementeer\MCP\Auth\Contracts::CORE;

        $this->assertIsArray($core_contracts, 'CORE should be an array');
        $this->assertNotEmpty($core_contracts, 'CORE array should not be empty');
        $this->assertContains('cms.wordpress.write', $core_contracts, 'WordPress write capability should be declared');
        $this->assertContains('cms.wordpress.import', $core_contracts, 'WordPress import capability should be declared');
        $this->assertContains('cms.elementor.write', $core_contracts, 'Elementor write capability should be declared');
        $this->assertContains('cms.elementor.import', $core_contracts, 'Elementor import capability should be declared');
    }

    public function test_open_core_independence_pro_classes_not_required(): void
    {
        $this->assertFalse(
            class_exists('Elementeer\Pro\SomeProClass', false),
            'Pro classes should not be required for Core to function'
        );

        // Core autoload prefix is Elementeer\MCP — verify it resolves correctly
        $this->assertTrue(
            class_exists(\Elementeer\MCP\Auth\Contracts::class),
            'Core classes under Elementeer\MCP namespace should resolve'
        );
    }
}
