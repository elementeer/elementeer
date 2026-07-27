<?php

declare(strict_types=1);

namespace Elementeer\MCP\Activation;

/**
 * Neutral host context adapter.
 *
 * Accepts hosting environment metadata without any Vamerli brand.
 * Core uses this to adapt behaviour based on where the plugin is running.
 */
interface HostAdapter {

    /**
     * @return array{brand: string, tenancy: string, entitlements: string[]}
     */
    public function get_context(): array;

    /**
     * @return 'elementeer-embedded'|'elementeer-agency'|null
     */
    public function get_activation_mode(): ?string;
}
