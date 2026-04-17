<?php

declare(strict_types=1);

namespace Elementify\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementify\MCP\Auth\Manager as Auth;

/**
 * REST controller for external data import (CSV, JSON, XML).
 */
final class ImportExport {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	// ------------------------------------------------------------------ //
	// External data import
	// ------------------------------------------------------------------ //

	public function import_external_data( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'content-structure:write' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$params = $request->get_params();

		$format = \sanitize_text_field( $params['format'] ?? 'json' );
		$data   = $params['data'] ?? '';
		$post_type = \sanitize_text_field( $params['post_type'] ?? 'post' );
		$field_mapping = $params['field_mapping'] ?? [];
		$duplicate_detection = \sanitize_text_field( $params['duplicate_detection'] ?? 'title' );
		$dry_run = isset( $params['dry_run'] ) && \rest_sanitize_boolean( $params['dry_run'] );

		if ( empty( $data ) ) {
			return new WP_Error(
				'elementify_missing_param',
				\__( 'Data field is required.', 'elementify-mcp' ),
				[ 'status' => 400 ]
			);
		}

		if ( ! \in_array( $format, [ 'csv', 'json', 'xml' ], true ) ) {
			return new WP_Error(
				'elementify_invalid_param',
				\__( 'Format must be csv, json, or xml.', 'elementify-mcp' ),
				[ 'status' => 400 ]
			);
		}

		// Parse data based on format
		$parsed = $this->parse_data( $data, $format );
		if ( \is_wp_error( $parsed ) ) {
			return $parsed;
		}

		// Validate structure: array of rows/objects
		if ( ! \is_array( $parsed ) || empty( $parsed ) ) {
			return new WP_Error(
				'elementify_invalid_data',
				\__( 'Parsed data is empty or not an array.', 'elementify-mcp' ),
				[ 'status' => 400 ]
			);
		}

		// If dry run, just analyze and report
		if ( $dry_run ) {
			return $this->dry_run_analysis( $parsed, $post_type, $field_mapping, $duplicate_detection );
		}

		// Actual import
		$result = $this->perform_import( $parsed, $post_type, $field_mapping, $duplicate_detection );
		return new WP_REST_Response( $result, 200 );
	}

	// ------------------------------------------------------------------ //
	// Parsers
	// ------------------------------------------------------------------ //

	private function parse_data( string $data, string $format ): array|WP_Error {
		switch ( $format ) {
			case 'csv':
				return $this->parse_csv( $data );
			case 'json':
				return $this->parse_json( $data );
			case 'xml':
				return $this->parse_xml( $data );
			default:
				return new WP_Error(
					'elementify_internal_error',
					\__( 'Unsupported format.', 'elementify-mcp' ),
					[ 'status' => 500 ]
				);
		}
	}

	private function parse_csv( string $csv ): array|WP_Error {
		$lines = array_map( 'str_getcsv', explode( "\n", trim( $csv ) ) );
		if ( empty( $lines ) ) {
			return [];
		}

		$headers = array_shift( $lines );
		$headers = array_map( 'trim', $headers );

		$rows = [];
		foreach ( $lines as $index => $line ) {
			if ( count( $line ) !== count( $headers ) ) {
				// Skip malformed rows but could log
				continue;
			}
			$rows[] = array_combine( $headers, $line );
		}

		return $rows;
	}

	private function parse_json( string $json ): array|WP_Error {
		$decoded = json_decode( $json, true );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return new WP_Error(
				'elementify_invalid_json',
				sprintf( \__( 'Invalid JSON: %s', 'elementify-mcp' ), json_last_error_msg() ),
				[ 'status' => 400 ]
			);
		}

		if ( ! \is_array( $decoded ) ) {
			return new WP_Error(
				'elementify_invalid_json',
				\__( 'JSON must decode to an array.', 'elementify-mcp' ),
				[ 'status' => 400 ]
			);
		}

		return $decoded;
	}

	private function parse_xml( string $xml ): array|WP_Error {
		if ( ! class_exists( 'SimpleXMLElement' ) ) {
			return new WP_Error(
				'elementify_missing_extension',
				\__( 'XML parsing requires SimpleXML extension.', 'elementify-mcp' ),
				[ 'status' => 500 ]
			);
		}

		libxml_use_internal_errors( true );
		$sxml = simplexml_load_string( $xml );
		if ( $sxml === false ) {
			$errors = libxml_get_errors();
			libxml_clear_errors();
			return new WP_Error(
				'elementify_invalid_xml',
				\__( 'Invalid XML structure.', 'elementify-mcp' ),
				[ 'status' => 400, 'details' => $errors ]
			);
		}

		// Convert SimpleXML to array (basic conversion)
		// Expect XML like <items><item><title>...</title></item></items>
		$items = [];
		foreach ( $sxml->children() as $child ) {
			$items[] = (array) $child;
		}

		return $items;
	}

	// ------------------------------------------------------------------ //
	// Import logic
	// ------------------------------------------------------------------ //

	private function dry_run_analysis(
		array $parsed,
		string $post_type,
		array $field_mapping,
		string $duplicate_detection
	): WP_REST_Response {
		$total = count( $parsed );
		$sample = $parsed[0] ?? [];
		$field_names = array_keys( $sample );

		$duplicate_check = $this->check_duplicates( $parsed, $post_type, $duplicate_detection, $field_mapping );

		$analysis = [
			'imported'           => false,
			'imported_count'     => 0,
			'skipped_count'      => 0,
			'duplicate_count'    => $duplicate_check['count'],
			'duplicate_examples' => array_slice( $duplicate_check['examples'], 0, 5 ),
			'errors'             => [],
			'summary'            => sprintf(
				'Dry run: %d rows parsed, %d potential duplicates detected. No changes made.',
				$total,
				$duplicate_check['count']
			),
			'parsed_fields'      => $field_names,
			'field_mapping'      => $field_mapping,
			'post_type'          => $post_type,
		];

		return new WP_REST_Response( $analysis, 200 );
	}

	private function perform_import(
		array $parsed,
		string $post_type,
		array $field_mapping,
		string $duplicate_detection
	): array {
		$imported = 0;
		$skipped  = 0;
		$duplicate_count = 0;
		$errors   = [];

		// Check duplicates across the batch first
		$duplicate_check = $this->check_duplicates( $parsed, $post_type, $duplicate_detection, $field_mapping );
		$duplicate_count = $duplicate_check['count'];
		$duplicate_values = $duplicate_check['values'];

		foreach ( $parsed as $index => $row ) {
			$row_number = $index + 1;

			// Map fields
			$mapped = $this->map_fields( $row, $field_mapping );

			// Check for duplicate based on detection field
			$detection_value = $this->get_detection_value( $mapped, $duplicate_detection );
				if ( $detection_value && \in_array( $detection_value, $duplicate_values, true ) ) {
				$skipped++;
				$errors[] = [
					'row'   => $row_number,
					'error' => sprintf( 'Duplicate detected (%s: %s)', $duplicate_detection, $detection_value ),
				];
				continue;
			}

			// Prepare post data
			$post_data = [
				'post_type'    => $post_type,
				'post_status'  => 'draft',
				'post_title'   => $mapped['title'] ?? '',
				'post_content' => $mapped['content'] ?? '',
				'post_excerpt' => $mapped['excerpt'] ?? '',
			];

			// Remove empty required fields
			if ( empty( $post_data['post_title'] ) ) {
				$skipped++;
				$errors[] = [
					'row'   => $row_number,
					'error' => 'Missing title field',
				];
				continue;
			}

			// Insert post
			$post_id = \wp_insert_post( $post_data, true );
			if ( \is_wp_error( $post_id ) ) {
				$skipped++;
				$errors[] = [
					'row'   => $row_number,
					'error' => $post_id->get_error_message(),
				];
				continue;
			}

			// Handle custom fields (meta)
			foreach ( $mapped as $key => $value ) {
				if ( str_starts_with( $key, 'meta_' ) ) {
					$meta_key = substr( $key, 5 );
					\update_post_meta( $post_id, $meta_key, $value );
				}
			}

			$imported++;
		}

		return [
			'imported'        => true,
			'imported_count'  => $imported,
			'skipped_count'   => $skipped,
			'duplicate_count' => $duplicate_count,
			'errors'          => $errors,
			'summary'         => sprintf(
				'Imported %d rows, skipped %d rows (%d duplicates).',
				$imported,
				$skipped,
				$duplicate_count
			),
		];
	}

	// ------------------------------------------------------------------ //
	// Helper methods
	// ------------------------------------------------------------------ //

	private function map_fields( array $row, array $field_mapping ): array {
		if ( empty( $field_mapping ) ) {
			return $row; // Use source field names as-is
		}

		$mapped = [];
		foreach ( $field_mapping as $source => $target ) {
			if ( isset( $row[ $source ] ) ) {
				$mapped[ $target ] = $row[ $source ];
			}
		}
		return $mapped;
	}

	private function get_detection_value( array $mapped, string $detection_field ): ?string {
		if ( $detection_field === 'none' ) {
			return null;
		}

		// For SKU, look for meta_sku or sku field
		if ( $detection_field === 'sku' ) {
			return $mapped['sku'] ?? $mapped['meta_sku'] ?? null;
		}

		// For slug, look for slug or post_name
		if ( $detection_field === 'slug' ) {
			return $mapped['slug'] ?? $mapped['post_name'] ?? null;
		}

		// Default: title
		return $mapped['title'] ?? $mapped['post_title'] ?? null;
	}

	private function check_duplicates(
		array $parsed,
		string $post_type,
		string $detection_field,
		array $field_mapping
	): array {
		if ( $detection_field === 'none' ) {
			return [ 'count' => 0, 'values' => [], 'examples' => [] ];
		}

		$values = [];
		$duplicates = [];

		foreach ( $parsed as $row ) {
			$mapped = $this->map_fields( $row, $field_mapping );
			$value = $this->get_detection_value( $mapped, $detection_field );
			if ( $value !== null ) {
				if ( \in_array( $value, $values, true ) ) {
					$duplicates[] = $value;
				}
				$values[] = $value;
			}
		}

		$duplicate_count = count( array_unique( $duplicates ) );

 		return [
			'count'    => $duplicate_count,
			'values'   => $values,
			'examples' => array_slice( array_unique( $duplicates ), 0, 10 ),
		];
	}

	// ------------------------------------------------------------------ //
	// Data export
	// ------------------------------------------------------------------ //

	public function export_data( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'library-operations:export' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$params = $request->get_params();

		$post_type = \sanitize_text_field( $params['post_type'] ?? 'post' );
		$format = \sanitize_text_field( $params['format'] ?? 'json' );
		$limit = isset( $params['limit'] ) ? \absint( $params['limit'] ) : 100;
		$offset = isset( $params['offset'] ) ? \absint( $params['offset'] ) : 0;
		$filters = $params['filters'] ?? [];

		if ( ! \in_array( $format, [ 'csv', 'json' ], true ) ) {
			return new WP_Error(
				'elementify_invalid_param',
				\__( 'Format must be csv or json.', 'elementify-mcp' ),
				[ 'status' => 400 ]
			);
		}

		// Build query args from filters
		$query_args = [
			'post_type'      => $post_type,
			'post_status'    => $filters['status'] ?? 'any',
			'posts_per_page' => $limit,
			'offset'         => $offset,
			'orderby'        => 'ID',
			'order'          => 'ASC',
		];

		if ( isset( $filters['category'] ) ) {
			if ( \is_numeric( $filters['category'] ) ) {
				$query_args['cat'] = \absint( $filters['category'] );
			} else {
				$query_args['category_name'] = \sanitize_text_field( $filters['category'] );
			}
		}

		if ( isset( $filters['author'] ) ) {
			$query_args['author'] = \absint( $filters['author'] );
		}

		if ( isset( $filters['search'] ) ) {
			$query_args['s'] = \sanitize_text_field( $filters['search'] );
		}

		if ( isset( $filters['date_range'] ) && \is_array( $filters['date_range'] ) ) {
			if ( isset( $filters['date_range']['start'] ) ) {
				$query_args['date_query']['after'] = \sanitize_text_field( $filters['date_range']['start'] );
			}
			if ( isset( $filters['date_range']['end'] ) ) {
				$query_args['date_query']['before'] = \sanitize_text_field( $filters['date_range']['end'] );
			}
			$query_args['date_query']['inclusive'] = true;
		}

		$query = new \WP_Query( $query_args );
		$posts = $query->posts;

		$data = [];
		foreach ( $posts as $post ) {
			$post_data = [
				'id'           => $post->ID,
				'title'        => $post->post_title,
				'content'      => $post->post_content,
				'excerpt'      => $post->post_excerpt,
				'slug'         => $post->post_name,
				'status'       => $post->post_status,
				'author'       => $post->post_author,
				'date'         => $post->post_date,
				'modified'     => $post->post_modified,
				'post_type'    => $post->post_type,
				'parent'       => $post->post_parent,
				'menu_order'   => $post->menu_order,
				'comment_count'=> $post->comment_count,
				'guid'         => $post->guid,
			];

			// Add featured image URL if exists
			$thumbnail_id = \get_post_thumbnail_id( $post->ID );
			if ( $thumbnail_id ) {
				$post_data['featured_image'] = \wp_get_attachment_url( $thumbnail_id );
			}

			// Add taxonomy terms
			$taxonomies = \get_object_taxonomies( $post->post_type, 'names' );
			foreach ( $taxonomies as $taxonomy ) {
				$terms = \wp_get_post_terms( $post->ID, $taxonomy, [ 'fields' => 'names' ] );
				if ( ! \is_wp_error( $terms ) ) {
					$post_data[ 'taxonomy_' . $taxonomy ] = $terms;
				}
			}

			// Add post meta
			$meta = \get_post_meta( $post->ID );
			$flattened_meta = [];
			foreach ( $meta as $key => $values ) {
				// Skip protected meta (starting with _)
				if ( \substr( $key, 0, 1 ) === '_' ) {
					continue;
				}
				$flattened_meta[ $key ] = \maybe_unserialize( $values[0] ?? '' );
			}
			$post_data['meta'] = $flattened_meta;

			$data[] = $post_data;
		}

		$total = $query->found_posts;
		$response_data = [
			'exported' => true,
			'total'    => $total,
			'count'    => count( $data ),
			'offset'   => $offset,
			'limit'    => $limit,
			'format'   => $format,
			'data'     => $data,
		];

		if ( $format === 'csv' ) {
			return $this->format_csv( $data );
		}

		return new WP_REST_Response( $response_data, 200 );
	}

	// ------------------------------------------------------------------ //
	// CSV formatting
	// ------------------------------------------------------------------ //

	private function format_csv( array $data ): WP_REST_Response|WP_Error {
		if ( empty( $data ) ) {
			return new WP_REST_Response( [ 'exported' => true, 'total' => 0, 'count' => 0, 'csv' => '' ], 200 );
		}

		// Determine headers from first item (flatten nested arrays)
		$headers = [];
		foreach ( $data[0] as $key => $value ) {
			if ( $key === 'meta' && \is_array( $value ) ) {
				foreach ( $value as $meta_key => $meta_val ) {
					$headers[] = 'meta_' . $meta_key;
				}
			} elseif ( \is_array( $value ) ) {
				// Convert arrays to JSON strings
				$headers[] = $key;
			} else {
				$headers[] = $key;
			}
		}

		$output = fopen( 'php://temp', 'w+' );
		fputcsv( $output, $headers );

		foreach ( $data as $row ) {
			$csv_row = [];
			foreach ( $headers as $header ) {
				if ( \strpos( $header, 'meta_' ) === 0 ) {
					$meta_key = \substr( $header, 5 );
					$value = $row['meta'][ $meta_key ] ?? '';
				} elseif ( isset( $row[ $header ] ) ) {
					$value = $row[ $header ];
				} else {
					$value = '';
				}
				if ( \is_array( $value ) ) {
					$value = \json_encode( $value, JSON_UNESCAPED_UNICODE );
				}
				$csv_row[] = $value;
			}
			fputcsv( $output, $csv_row );
		}

		rewind( $output );
		$csv_content = stream_get_contents( $output );
		fclose( $output );

		$response = new WP_REST_Response( $csv_content, 200 );
		$response->header( 'Content-Type', 'text/csv' );
		$response->header( 'Content-Disposition', 'attachment; filename="export.csv"' );
		return $response;
	}
}