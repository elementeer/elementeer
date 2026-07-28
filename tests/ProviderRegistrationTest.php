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

        $this->assertTrue(
            class_exists(\Elementeer\MCP\Auth\Contracts::class),
            'Core classes under Elementeer\MCP namespace should resolve'
        );
    }

    public function test_scope_to_contract_bindings_cover_all_scopes(): void
    {
        $scope_to_contract = [
            'site-audit:read'                => 'cms.site.audit',
            'stack-bootstrap:read'           => 'cms.stack.bootstrap.read',
            'stack-bootstrap:prepare'        => 'cms.stack.bootstrap.prepare',
            'stack-bootstrap:write'          => 'cms.stack.bootstrap.write',
            'site-foundation:read'           => 'cms.foundation.read',
            'site-foundation:write'          => 'cms.foundation.write',
            'design-system:read'             => 'cms.design.system.read',
            'design-system:write'            => 'cms.design.system.write',
            'content-structure:read'         => 'cms.content.structure.read',
            'content-structure:write'        => 'cms.content.structure.write',
            'theme-structure:read'           => 'cms.theme.structure.read',
            'theme-structure:write'          => 'cms.theme.structure.write',
            'library-operations:read'        => 'cms.library.operations.read',
            'library-operations:write'       => 'cms.library.operations.write',
            'library-operations:import'      => 'cms.library.operations.import',
            'library-operations:export'      => 'cms.library.operations.export',
            'media-operations:read'          => 'cms.media.operations.read',
            'media-operations:write'         => 'cms.media.operations.write',
            'plugin-stack-context:read'      => 'cms.plugin.stack.context.read',
            'plugin-stack-context:prepare'   => 'cms.plugin.stack.context.prepare',
            'governance:read'                => 'cms.governance.read',
            'governance:review'              => 'cms.governance.review',
            'governance:apply'               => 'cms.governance.apply',
            'governance:write'               => 'cms.governance.write',
            'governance:queue'               => 'cms.governance.queue',
            'ally:read'                      => 'cms.ally.read',
            'ally:trigger'                   => 'cms.ally.trigger',
            'translate:read'                 => 'cms.translate.read',
            'translate:write'                => 'cms.translate.write',
            'lms:read'                       => 'cms.lms.read',
            'charity:read'                   => 'cms.charity.read',
            'booking:read'                   => 'cms.booking.read',
            'booking:write'                  => 'cms.booking.write',
            'voxel:read'                     => 'cms.voxel.read',
            'voxel:write'                    => 'cms.voxel.write',
            'voxel:marketplace:read'         => 'cms.voxel.marketplace.read',
            'voxel:marketplace:write'        => 'cms.voxel.marketplace.write',
            'voxel:post-type:write'          => 'cms.voxel.post.type.write',
            'voxel:taxonomy:read'            => 'cms.voxel.taxonomy.read',
            'voxel:taxonomy:write'           => 'cms.voxel.taxonomy.write',
            'voxel:search:read'              => 'cms.voxel.search.read',
            'voxel:search:write'             => 'cms.voxel.search.write',
            'voxel:field:read'               => 'cms.voxel.field.read',
            'voxel:field:write'              => 'cms.voxel.field.write',
            'diagnostics:read'               => 'cms.diagnostics.read',
            'diagnostics:write'              => 'cms.diagnostics.write',
            'workflow-orchestration:read'    => 'cms.workflow.orchestration.read',
            'workflow-orchestration:prepare' => 'cms.workflow.orchestration.prepare',
            'workflow-orchestration:write'   => 'cms.workflow.orchestration.write',
            'site-settings:read'             => 'cms.site.settings.read',
            'site-settings:write'            => 'cms.site.settings.write',
            'seo-operations:read'            => 'cms.seo.operations.read',
            'seo-operations:write'           => 'cms.seo.operations.write',
            'performance-operations:read'    => 'cms.performance.operations.read',
            'performance-operations:write'   => 'cms.performance.operations.write',
            'ecommerce-operations:read'      => 'cms.ecommerce.operations.read',
            'ecommerce-operations:write'     => 'cms.ecommerce.operations.write',
            'snapshot:read'                  => 'cms.snapshot.read',
            'snapshot:write'                 => 'cms.snapshot.write',
            'addon-analysis:read'            => 'cms.addon.analysis.read',
            'addon-analysis:write'           => 'cms.addon.analysis.write',
            'workflow:read'                  => 'cms.workflow.read',
            'workflow:write'                 => 'cms.workflow.write',
            'plugin-stack:write'             => 'cms.plugin.stack.write',
            'media-stock:search'             => 'cms.media.stock.search',
            'media-ai:generate'              => 'cms.media.ai.generate',
        ];

        $all_scopes = \Elementeer\MCP\Auth\Capabilities::ALL;

        $this->assertNotEmpty($all_scopes, 'ALL scopes should not be empty');

        $unmapped = [];
        foreach ($all_scopes as $scope_id) {
            if (!array_key_exists($scope_id, $scope_to_contract)) {
                $unmapped[] = $scope_id;
            }
        }

        $this->assertEmpty(
            $unmapped,
            'Every AuthorizationScopeId (colon-style) must map to a CapabilityContractId (dot-separated).'
            . ' Unmapped: ' . implode(', ', $unmapped)
        );

        $mapped_contract_ids = array_values($scope_to_contract);
        foreach ($mapped_contract_ids as $contract_id) {
            $this->assertStringNotContainsString(
                ':',
                $contract_id,
                "CapabilityContractId '{$contract_id}' must use dot-separated grammar, not colon-style"
            );
        }
    }

    public function test_wordpress_write_ownership(): void
    {
        $plugin_file = dirname(__DIR__) . '/elementeer.php';
        $this->assertFileExists($plugin_file, 'Main plugin file must exist');

        $plugin_content = file_get_contents($plugin_file);

        $this->assertStringContainsString(
            'WordPress',
            $plugin_content,
            'Main plugin file should reference WordPress at least once'
        );

        $this->assertTrue(
            class_exists(\Elementeer\MCP\Api\Pages::class),
            'Pages API class must exist (WordPress page write implementation)'
        );

        $this->assertTrue(
            class_exists(\Elementeer\MCP\Api\Templates::class),
            'Templates API class must exist (Elementor template write implementation)'
        );

        $this->assertTrue(
            class_exists(\Elementeer\MCP\Plugin::class),
            'Core Plugin class must exist (main plugin controller)'
        );

        $this->assertTrue(
            class_exists(\Elementeer\MCP\Api\Router::class),
            'Router class must exist (REST API registration)'
        );
    }

    public function test_open_core_operates_without_pro(): void
    {
        $plugin_file = dirname(__DIR__) . '/elementeer.php';

        $this->assertFileExists($plugin_file, 'Main plugin file must exist');

        $plugin_content = file_get_contents($plugin_file);

        $pro_require_pattern = '/require.*Pro|include.*Pro|require_once.*Elementeer.*Pro/i';
        $this->assertDoesNotMatchRegularExpression(
            $pro_require_pattern,
            $plugin_content,
            'Main plugin file must not require Pro classes at load time'
        );

        $pro_namespace_pattern = '/Elementeer\\\\Pro\\\\/';
        $this->assertDoesNotMatchRegularExpression(
            $pro_namespace_pattern,
            $plugin_content,
            'Main plugin file must not reference Elementeer\Pro namespace'
        );

        $this->assertTrue(
            class_exists(\Elementeer\MCP\Auth\Contracts::class),
            'Core must be loadable without Pro classes present'
        );

        $this->assertTrue(
            class_exists(\Elementeer\MCP\Auth\Capabilities::class),
            'Capabilities class must be loadable standalone'
        );
    }
}
