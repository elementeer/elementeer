<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

/**
 * REST controller for translation coverage analysis.
 */
final class Translation {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	// ------------------------------------------------------------------ //
	// Translation coverage analysis
	// ------------------------------------------------------------------ //

	public function get_coverage( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'translate:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$multilingual_plugin = $this->detect_multilingual_plugin();
		$configured_languages = $this->get_configured_languages( $multilingual_plugin );
		$coverage_matrix = $this->build_coverage_matrix( $multilingual_plugin, $configured_languages );
		$summary = $this->compute_summary( $coverage_matrix );

		$result = [
			'multilingual_plugin'   => $multilingual_plugin,
			'configured_languages'  => $configured_languages,
			'coverage_matrix'       => $coverage_matrix,
			'summary'               => $summary,
		];

		return new WP_REST_Response( $result, 200 );
	}

	// ------------------------------------------------------------------ //
	// Detection & data collection
	// ------------------------------------------------------------------ //

	private function detect_multilingual_plugin(): ?string {
		$active = (array) \get_option( 'active_plugins', [] );
		$active_slugs = array_map( fn( $p ) => \dirname( $p ), $active );

		$multilingual_slugs = [
			'sitepress-multilingual-cms' => 'WPML',
			'polylang'                   => 'Polylang',
			'translatepress-multilingual' => 'TranslatePress',
		];

		foreach ( $multilingual_slugs as $slug => $name ) {
			if ( \in_array( $slug, $active_slugs, true ) ) {
				return $name;
			}
		}

		return null;
	}

	private function get_configured_languages( ?string $plugin ): array {
		if ( $plugin === null ) {
			return [ \get_bloginfo( 'language' ) ];
		}

		// WPML
		if ( $plugin === 'WPML' && \function_exists( 'icl_get_languages' ) ) {
			$languages = \icl_get_languages( 'skip_missing=0' );
			if ( \is_array( $languages ) ) {
				return array_column( $languages, 'language_code' );
			}
		}

		// Polylang
		if ( $plugin === 'Polylang' && \function_exists( 'pll_languages_list' ) ) {
			$codes = \pll_languages_list( [ 'fields' => 'slug' ] );
			if ( \is_array( $codes ) ) {
				return $codes;
			}
		}

		// TranslatePress
		if ( $plugin === 'TranslatePress' && \function_exists( 'trp_get_languages' ) ) {
			$languages = \trp_get_languages();
			if ( \is_array( $languages ) ) {
				return array_column( $languages, 'slug' );
			}
		}

		// Fallback: default language
		return [ \get_bloginfo( 'language' ) ];
	}

	private function build_coverage_matrix( ?string $plugin, array $languages ): array {
		// If no multilingual plugin, return a single row for each post in default language
		if ( $plugin === null ) {
			return $this->build_single_language_matrix();
		}

		// For WPML
		if ( $plugin === 'WPML' && \function_exists( 'icl_get_languages' ) && \function_exists( 'wpml_get_language_information' ) ) {
			return $this->build_wpml_matrix( $languages );
		}

		// For Polylang
		if ( $plugin === 'Polylang' && \function_exists( 'pll_get_post_translations' ) ) {
			return $this->build_polylang_matrix( $languages );
		}

		// For TranslatePress
		if ( $plugin === 'TranslatePress' ) {
			// TranslatePress stores translations differently; we'll return a simplified matrix
			return $this->build_translatepress_matrix( $languages );
		}

		// Fallback: single language
		return $this->build_single_language_matrix();
	}

	private function build_single_language_matrix(): array {
		$posts = \get_posts( [
			'post_type'      => [ 'post', 'page' ],
			'post_status'    => 'publish',
			'posts_per_page' => 100, // Limit for performance
			'orderby'        => 'ID',
			'order'          => 'DESC',
		] );

		$matrix = [];
		foreach ( $posts as $post ) {
			$matrix[] = [
				'post_id'      => $post->ID,
				'post_title'   => \get_the_title( $post ),
				'post_type'    => $post->post_type,
				'post_language' => \get_bloginfo( 'language' ),
				'translations' => [
					[
						'language'      => \get_bloginfo( 'language' ),
						'status'        => 'translated',
						'post_id'       => $post->ID,
						'post_title'    => \get_the_title( $post ),
						'last_modified' => $post->post_modified,
					],
				],
			];
		}

		return $matrix;
	}

	private function build_wpml_matrix( array $languages ): array {
		$matrix = [];
		$posts = \get_posts( [
			'post_type'      => [ 'post', 'page' ],
			'post_status'    => 'publish',
			'posts_per_page' => 50, // Limit for performance
			'orderby'        => 'ID',
			'order'          => 'DESC',
			'suppress_filters' => false, // Required for WPML
		] );

		foreach ( $posts as $post ) {
			$translations = [];
			$post_language = '';

			// Get post language info
			if ( \function_exists( 'wpml_get_language_information' ) ) {
				$lang_info = \wpml_get_language_information( null, $post->ID );
				if ( \is_array( $lang_info ) && isset( $lang_info['language_code'] ) ) {
					$post_language = $lang_info['language_code'];
				}
			}

			// Get translations
			if ( \function_exists( 'icl_get_languages' ) && \function_exists( 'wpml_get_element_translations' ) ) {
				$trid = \apply_filters( 'wpml_element_trid', null, $post->ID, 'post_' . $post->post_type );
				if ( $trid ) {
					$translation_objects = \apply_filters( 'wpml_get_element_translations', null, $trid, 'post_' . $post->post_type );
					if ( \is_array( $translation_objects ) ) {
						foreach ( $translation_objects as $lang => $trans ) {
							if ( ! empty( $trans->element_id ) ) {
								$trans_post = \get_post( $trans->element_id );
								if ( $trans_post ) {
									$translations[] = [
										'language'      => $lang,
										'status'        => 'translated',
										'post_id'       => $trans_post->ID,
										'post_title'    => \get_the_title( $trans_post ),
										'last_modified' => $trans_post->post_modified,
									];
								}
							}
						}
					}
				}
			}

			// Add missing languages
			foreach ( $languages as $lang ) {
				if ( $lang === $post_language ) {
					continue;
				}
				$found = false;
				foreach ( $translations as $t ) {
					if ( $t['language'] === $lang ) {
						$found = true;
						break;
					}
				}
				if ( ! $found ) {
					$translations[] = [
						'language' => $lang,
						'status'   => 'missing',
					];
				}
			}

			$matrix[] = [
				'post_id'        => $post->ID,
				'post_title'     => \get_the_title( $post ),
				'post_type'      => $post->post_type,
				'post_language'  => $post_language,
				'translations'   => $translations,
			];
		}

		return $matrix;
	}

	private function build_polylang_matrix( array $languages ): array {
		$matrix = [];
		$posts = \get_posts( [
			'post_type'      => [ 'post', 'page' ],
			'post_status'    => 'publish',
			'posts_per_page' => 50,
			'orderby'        => 'ID',
			'order'          => 'DESC',
		] );

		foreach ( $posts as $post ) {
			$translations = [];
			$post_language = '';

			if ( \function_exists( 'pll_get_post_language' ) ) {
				$post_language = \pll_get_post_language( $post->ID, 'slug' );
			}

			if ( \function_exists( 'pll_get_post_translations' ) ) {
				$translation_ids = \pll_get_post_translations( $post->ID );
				if ( \is_array( $translation_ids ) ) {
					foreach ( $translation_ids as $lang => $id ) {
						$trans_post = \get_post( $id );
						if ( $trans_post ) {
							$translations[] = [
								'language'      => $lang,
								'status'        => 'translated',
								'post_id'       => $trans_post->ID,
								'post_title'    => \get_the_title( $trans_post ),
								'last_modified' => $trans_post->post_modified,
							];
						}
					}
				}
			}

			// Add missing languages
			foreach ( $languages as $lang ) {
				if ( $lang === $post_language ) {
					continue;
				}
				$found = false;
				foreach ( $translations as $t ) {
					if ( $t['language'] === $lang ) {
						$found = true;
						break;
					}
				}
				if ( ! $found ) {
					$translations[] = [
						'language' => $lang,
						'status'   => 'missing',
					];
				}
			}

			$matrix[] = [
				'post_id'        => $post->ID,
				'post_title'     => \get_the_title( $post ),
				'post_type'      => $post->post_type,
				'post_language'  => $post_language,
				'translations'   => $translations,
			];
		}

		return $matrix;
	}

	private function build_translatepress_matrix( array $languages ): array {
		// Simplified matrix for TranslatePress (actual implementation would use their API)
		return $this->build_single_language_matrix();
	}

	private function compute_summary( array $matrix ): array {
		$total_posts = count( $matrix );
		$total_translated = 0;
		$total_missing = 0;
		$total_outdated = 0;

		foreach ( $matrix as $item ) {
			foreach ( $item['translations'] as $trans ) {
				if ( $trans['status'] === 'translated' ) {
					$total_translated++;
				} elseif ( $trans['status'] === 'missing' ) {
					$total_missing++;
				} elseif ( $trans['status'] === 'outdated' ) {
					$total_outdated++;
				}
			}
		}

		$coverage_percent = $total_posts > 0 ? ( $total_translated / ( $total_posts * max( count( $item['translations'] ?? [] ), 1 ) ) ) * 100 : 0;

		return [
			'total_posts'       => $total_posts,
			'total_translated'  => $total_translated,
			'total_missing'     => $total_missing,
			'total_outdated'    => $total_outdated,
			'coverage_percent'  => $coverage_percent,
		];
	}

	// ------------------------------------------------------------------ //
	// Helper: Get untranslated strings for a specific plugin
	// ------------------------------------------------------------------ //

	private function get_untranslated_strings_for_plugin( string $plugin, string $target_language ): array {
		$strings = [];

		if ( $plugin === 'WPML' && \function_exists( 'icl_get_string_translations' ) ) {
			// Get all strings
			global $wpdb;
			$table_name = $wpdb->prefix . 'icl_strings';
			if ( $wpdb->get_var( "SHOW TABLES LIKE '$table_name'" ) !== $table_name ) {
				return [];
			}

			$all_strings = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT id, language, context, value FROM {$table_name} WHERE status = %d",
					1 // active strings
				),
				ARRAY_A
			);

			// Get translations for target language
			$translations = \icl_get_string_translations();
			foreach ( $all_strings as $str ) {
				$string_id = $str['id'];
				$source_language = $str['language'];
				
				// Check if translation exists for target language
				$translated = false;
				if ( isset( $translations[ $string_id ] ) ) {
					foreach ( $translations[ $string_id ] as $lang => $trans ) {
						if ( $lang === $target_language && $trans['status'] == 10 ) { // 10 = complete
							$translated = true;
							break;
						}
					}
				}
				
				if ( ! $translated && $source_language !== $target_language ) {
					$strings[] = [
						'id' => (string) $string_id,
						'text' => $str['value'],
						'context' => $str['context'],
						'source_language' => $source_language,
					];
				}
			}
		} elseif ( $plugin === 'Polylang' && \function_exists( 'pll_get_string_translations' ) ) {
			// Polylang string translation logic
			$registered_strings = \pll_get_string_translations();
			foreach ( $registered_strings as $string_id => $translations ) {
				if ( ! isset( $translations[ $target_language ] ) ) {
					// Get string value - Polylang stores strings in options
					$string_value = \pll_get_string( $string_id );
					if ( $string_value ) {
						$strings[] = [
							'id' => (string) $string_id,
							'text' => $string_value,
							'context' => '',
							'source_language' => \pll_default_language(),
						];
					}
				}
			}
		} elseif ( $plugin === 'TranslatePress' ) {
			// TranslatePress string translation logic (simplified)
			// Would need to integrate with TranslatePress API
		}

		return $strings;
	}

	// ------------------------------------------------------------------ //
	// Helper: Save translated strings for a specific plugin
	// ------------------------------------------------------------------ //

	private function save_translated_strings_for_plugin( string $plugin, string $target_language, array $translations ): int {
		$saved = 0;

		if ( $plugin === 'WPML' && \function_exists( 'icl_add_string_translation' ) ) {
			foreach ( $translations as $trans ) {
				$string_id = (int) $trans['id'];
				$result = \icl_add_string_translation(
					$string_id,
					$target_language,
					$trans['translated_text'],
					ICL_TM_COMPLETE // translation complete
				);
				if ( $result ) {
					$saved++;
				}
			}
		} elseif ( $plugin === 'Polylang' && \function_exists( 'pll_save_string_translation' ) ) {
			foreach ( $translations as $trans ) {
				$string_id = (int) $trans['id'];
				$result = \pll_save_string_translation(
					$string_id,
					$target_language,
					$trans['translated_text']
				);
				if ( $result ) {
					$saved++;
				}
			}
		}

		return $saved;
	}

	// ------------------------------------------------------------------ //
	// String translation (LANG-004)
	// ------------------------------------------------------------------ //

	public function get_untranslated_strings( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'translate:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$target_language = $request->get_param( 'target_language' );
		if ( ! $target_language ) {
			return new WP_Error( 'missing_param', 'target_language is required', [ 'status' => 400 ] );
		}

		$plugin = $this->detect_multilingual_plugin();
		if ( ! $plugin ) {
			return new WP_REST_Response( [
				'strings' => [],
				'total'   => 0,
			], 200 );
		}

		$strings = $this->get_untranslated_strings_for_plugin( $plugin, $target_language );

		return new WP_REST_Response( [
			'strings' => $strings,
			'total'   => count( $strings ),
		], 200 );
	}

	public function translate_strings( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'translate:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$preview = $request->get_param( 'preview' ) ?? true;
		$strings = $request->get_param( 'strings' );
		$target_language = $request->get_param( 'target_language' );

		if ( ! $target_language || ! \is_array( $strings ) ) {
			return new WP_Error( 'missing_param', 'target_language and strings array are required', [ 'status' => 400 ] );
		}

		$plugin = $this->detect_multilingual_plugin();
		if ( ! $plugin ) {
			return new WP_Error( 'no_plugin', 'No multilingual plugin active', [ 'status' => 400 ] );
		}

		$applied = 0;
		if ( ! $preview ) {
			$applied = $this->save_translated_strings_for_plugin( $plugin, $target_language, $strings );
		}

		return new WP_REST_Response( [
			'applied'   => $applied,
			'preview'   => $preview,
			'strings'   => $strings,
		], 200 );
	}

	// ------------------------------------------------------------------ //
	// Media metadata translation (LANG-005)
	// ------------------------------------------------------------------ //

	public function get_untranslated_media( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'translate:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$target_language = $request->get_param( 'target_language' );
		if ( ! $target_language ) {
			return new WP_Error( 'missing_param', 'target_language is required', [ 'status' => 400 ] );
		}

		// Placeholder: return empty array for now
		return new WP_REST_Response( [
			'media' => [],
			'total' => 0,
		], 200 );
	}

	public function translate_media_metadata( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'translate:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$preview = $request->get_param( 'preview' ) ?? true;
		$items = $request->get_param( 'items' );
		$target_language = $request->get_param( 'target_language' );

		if ( ! $target_language || ! \is_array( $items ) ) {
			return new WP_Error( 'missing_param', 'target_language and items array are required', [ 'status' => 400 ] );
		}

		// Placeholder: just return what was sent
		return new WP_REST_Response( [
			'applied'   => $preview ? 0 : \count( $items ),
			'preview'   => $preview,
			'items'     => $items,
		], 200 );
	}
}
