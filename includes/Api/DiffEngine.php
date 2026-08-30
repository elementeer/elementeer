<?php
declare(strict_types=1);

namespace Elementeer\MCP\Api;

class DiffEngine {

    /**
     * Compare a target page document against a generated model.
     * Returns a list of differences, sorted by confidence (lowest first).
     */
    public static function compare(ElementorDocument $target, ElementorDocument $model): array {
        $targetMap = self::flatten($target->toArray());
        $modelMap  = self::flatten($model->toArray());

        $diffs = [];

        // Check for modified and added elements
        foreach ($modelMap as $id => $modelEl) {
            $confidence = self::extractConfidence($modelEl);

            if (!isset($targetMap[$id])) {
                $diffs[] = [
                    'element_id' => $id,
                    'type'       => 'added',
                    'confidence' => $confidence,
                    'element'    => $modelEl,
                ];
                continue;
            }

            $targetEl = $targetMap[$id];
            $changes  = self::compareSettings($targetEl['settings'] ?? [], $modelEl['settings'] ?? []);

            if (!empty($changes)) {
                $diffs[] = [
                    'element_id' => $id,
                    'type'       => 'modified',
                    'confidence' => $confidence,
                    'changes'    => $changes,
                ];
            }
        }

        // Check for removed elements
        foreach ($targetMap as $id => $targetEl) {
            if (!isset($modelMap[$id])) {
                $diffs[] = [
                    'element_id' => $id,
                    'type'       => 'removed',
                    'confidence' => 100, // removals of existing nodes are considered high confidence
                    'element'    => $targetEl,
                ];
            }
        }

        // Sort by confidence ascending (lowest first)
        usort($diffs, function ($a, $b) {
            return $a['confidence'] <=> $b['confidence'];
        });

        return $diffs;
    }

    private static function flatten(array $tree): array {
        $map = [];
        $walk = function (array $elements) use (&$map, &$walk) {
            foreach ($elements as $el) {
                if (!is_array($el)) continue;
                if (!empty($el['id'])) {
                    $map[$el['id']] = $el;
                }
                if (!empty($el['elements']) && is_array($el['elements'])) {
                    $walk($el['elements']);
                }
            }
        };
        $walk($tree);
        return $map;
    }

    private static function extractConfidence(array $element): int {
        // Can be in root or in settings
        $val = $element['__confidence'] ?? $element['settings']['__confidence'] ?? 'high';
        
        if (is_numeric($val)) {
            return (int) $val;
        }

        return match (strtolower((string) $val)) {
            'low'    => 0,
            'medium' => 50,
            'high'   => 100,
            default  => 100,
        };
    }

    private static function compareSettings(array $target, array $model): array {
        $changes = [];
        
        // Keys in model that are new or changed
        foreach ($model as $k => $v) {
            if ($k === '__confidence' || $k === '__provenance') {
                continue;
            }
            if (!array_key_exists($k, $target) || $target[$k] !== $v) {
                $changes[$k] = [
                    'before' => $target[$k] ?? null,
                    'after'  => $v,
                ];
            }
        }

        // Keys in target that were removed in model
        foreach ($target as $k => $v) {
            if ($k === '__confidence' || $k === '__provenance') {
                continue;
            }
            if (!array_key_exists($k, $model)) {
                $changes[$k] = [
                    'before' => $v,
                    'after'  => null,
                ];
            }
        }

        return $changes;
    }
}
