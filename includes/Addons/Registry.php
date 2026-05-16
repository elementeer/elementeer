<?php

declare(strict_types=1);

namespace Elementeer\MCP\Addons;

/**
 * Addon Registry — allows external plugins to register as Elementeer add-ons.
 *
 * Registrierte Addons werden via GET /addons/detailed ausgegeben und
 * ihre REST-Routen über den elementeer_register_addons Hook ins Core-Namespace
 * eingehängt.
 */
final class Registry {

    /** @var array<string, array{label: string, version: string, capabilities: string[], controllers: array}> */
    private array $addons = [];

    private static ?self $instance = null;

    public static function get_instance(): self {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Registriert ein Addon.
     *
     * @param string $slug          Eindeutiger Slug (z.B. 'voxel')
     * @param array  $config        { label, version, capabilities, controllers }
     */
    public function register(string $slug, array $config): void {
        if (isset($this->addons[$slug])) {
            error_log(sprintf('[Elementeer AddonRegistry] Addon "%s" already registered — skipping.', $slug));
            return;
        }

        $this->addons[$slug] = [
            'label'        => sanitize_text_field($config['label'] ?? $slug),
            'version'      => sanitize_text_field($config['version'] ?? '0.0.0'),
            'capabilities' => array_map('sanitize_text_field', (array) ($config['capabilities'] ?? [])),
            'controllers'  => $config['controllers'] ?? [],
            'registered_at' => gmdate('c'),
        ];

        // Hook: fire so addon-specific bootstrap can run
        do_action('elementeer_addon_registered', $slug, $this->addons[$slug]);
    }

    /**
     * Gibt alle registrierten Addons zurück.
     *
     * @return array<string, array>
     */
    public function get_addons(): array {
        return $this->addons;
    }

    /**
     * Gibt ein einzelnes Addon zurück oder null.
     */
    public function get_addon(string $slug): ?array {
        return $this->addons[$slug] ?? null;
    }

    /**
     * Prüft ob mindestens ein Addon registriert ist.
     */
    public function has_addons(): bool {
        return !empty($this->addons);
    }

    /**
     * Gibt alle registrierten Capabilities über alle Addons zurück.
     *
     * @return string[]
     */
    public function get_all_capabilities(): array {
        $caps = [];
        foreach ($this->addons as $addon) {
            foreach ($addon['capabilities'] as $cap) {
                $caps[] = $cap;
            }
        }
        return array_unique($caps);
    }
}
