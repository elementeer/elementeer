<?php

declare(strict_types=1);

namespace Elementeer\MCP\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Elementeer\MCP\Auth\Manager as Auth;

/**
 * REST controller for LMS (Learning Management System) integration.
 * Auto-detects LearnDash > Tutor LMS > LifterLMS.
 */
final class Lms {

	private Auth $auth;

	public function __construct() {
		$this->auth = Auth::get_instance();
	}

	// ------------------------------------------------------------------ //
	// LMS detection (LMS-001)
	// ------------------------------------------------------------------ //

	public function get_lms_status( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'lms:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_lms_plugin();
		return new WP_REST_Response( $status, 200 );
	}

	public function list_courses( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'lms:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_lms_plugin();
		if ( ! $status['lms_available'] ) {
			return new WP_Error(
				'elementeer_lms_inactive',
				'No active LMS plugin detected (LearnDash, Tutor LMS, or LifterLMS).',
				[ 'status' => 400 ]
			);
		}

		$page = \absint( $request->get_param( 'page' ) ?: 1 );
		$per_page = \absint( $request->get_param( 'per_page' ) ?: 20 );
		$per_page = min( max( $per_page, 1 ), 100 );

		$courses = $this->fetch_courses( $status['plugin'], $page, $per_page );
		return new WP_REST_Response( $courses, 200 );
	}

	public function get_course_structure( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$auth = $this->auth->authorize( $request, 'lms:read' );
		if ( \is_wp_error( $auth ) ) {
			return $auth;
		}

		$status = $this->detect_lms_plugin();
		if ( ! $status['lms_available'] ) {
			return new WP_Error(
				'elementeer_lms_inactive',
				'No active LMS plugin detected.',
				[ 'status' => 400 ]
			);
		}

		$course_id = \absint( $request->get_param( 'course_id' ) );
		if ( ! $course_id ) {
			return new WP_Error(
				'elementeer_missing_param',
				'course_id is required.',
				[ 'status' => 400 ]
			);
		}

		$structure = $this->fetch_course_structure( $status['plugin'], $course_id );
		if ( \is_wp_error( $structure ) ) {
			return $structure;
		}

		return new WP_REST_Response( $structure, 200 );
	}

	// ------------------------------------------------------------------ //
	// Detection & data collection
	// ------------------------------------------------------------------ //

	private function detect_lms_plugin(): array {
		$active = (array) \get_option( 'active_plugins', [] );
		$active_slugs = array_map( fn( $p ) => \dirname( $p ), $active );

		$lms_slugs = [
			'sfwd-lms' => 'LearnDash',
			'tutor'    => 'Tutor LMS',
			'lifterlms' => 'LifterLMS',
		];

		$detected = [];
		foreach ( $lms_slugs as $slug => $name ) {
			if ( \in_array( $slug, $active_slugs, true ) ) {
				$detected[] = $name;
			}
		}

		if ( empty( $detected ) ) {
			return [
				'lms_available' => false,
				'plugin' => null,
				'version' => null,
				'course_count' => 0,
			];
		}

		$plugin_name = $detected[0];
		$version = $this->get_lms_version( $plugin_name );
		$course_count = $this->count_courses( $plugin_name );

		return [
			'lms_available' => true,
			'plugin' => $plugin_name,
			'version' => $version,
			'course_count' => $course_count,
		];
	}

	private function get_lms_version( string $plugin_name ): ?string {
		if ( ! \function_exists( 'get_plugin_data' ) ) {
			require_once \ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_slug = \array_search( $plugin_name, [
			'LearnDash' => 'sfwd-lms',
			'Tutor LMS' => 'tutor',
			'LifterLMS' => 'lifterlms',
		], true );

		if ( ! $plugin_slug ) {
			return null;
		}

		$plugin_file = \WP_PLUGIN_DIR . '/' . $plugin_slug . '/' . $plugin_slug . '.php';
		if ( ! \file_exists( $plugin_file ) ) {
			return null;
		}

		$plugin_data = \get_plugin_data( $plugin_file, false, false );
		return $plugin_data['Version'] ?? null;
	}

	private function count_courses( string $plugin_name ): int {
		// Placeholder implementations
		if ( $plugin_name === 'LearnDash' && \function_exists( 'learndash_get_courses' ) ) {
			$courses = \learndash_get_courses();
			return \is_array( $courses ) ? \count( $courses ) : 0;
		}

		if ( $plugin_name === 'Tutor LMS' && \function_exists( 'tutor_utils' ) ) {
			$count = \tutor_utils()->get_total_course();
			return \is_numeric( $count ) ? (int) $count : 0;
		}

		if ( $plugin_name === 'LifterLMS' && \function_exists( 'llms_count_posts' ) ) {
			$count = \llms_count_posts( 'course' );
			return $count->publish ?? 0;
		}

		// Fallback: WP Query
		$query = new \WP_Query( [
			'post_type'      => 'course',
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'fields'         => 'ids',
		] );

		return $query->found_posts;
	}

	private function fetch_courses( string $plugin_name, int $page, int $per_page ): array {
		$offset = ( $page - 1 ) * $per_page;
		$courses = [];

		if ( $plugin_name === 'LearnDash' && \function_exists( 'learndash_get_courses' ) ) {
			$all_courses = \learndash_get_courses();
			if ( \is_array( $all_courses ) ) {
				$sliced = \array_slice( $all_courses, $offset, $per_page, true );
				foreach ( $sliced as $id => $course ) {
					$courses[] = [
						'id' => $id,
						'title' => $course->post_title ?? '',
						'slug' => $course->post_name ?? '',
						'status' => $course->post_status ?? '',
						'url' => \get_permalink( $id ),
						'description' => \wp_trim_words( $course->post_content ?? '', 30 ),
						'price' => $this->get_learndash_price( $id ),
						'students_count' => $this->get_learndash_students_count( $id ),
					];
				}
				$total = \count( $all_courses );
				return [
					'courses' => $courses,
					'total' => $total,
					'page' => $page,
					'per_page' => $per_page,
					'total_pages' => \ceil( $total / $per_page ),
				];
			}
		}

		if ( $plugin_name === 'Tutor LMS' && \function_exists( 'tutor_utils' ) ) {
			$args = [
				'post_type' => 'courses',
				'post_status' => 'publish',
				'posts_per_page' => $per_page,
				'offset' => $offset,
			];
			$query = new \WP_Query( $args );
			foreach ( $query->posts as $post ) {
				$courses[] = [
					'id' => $post->ID,
					'title' => $post->post_title,
					'slug' => $post->post_name,
					'status' => $post->post_status,
					'url' => \get_permalink( $post->ID ),
					'description' => \wp_trim_words( $post->post_content, 30 ),
					'price' => $this->get_tutor_price( $post->ID ),
					'students_count' => $this->get_tutor_students_count( $post->ID ),
				];
			}
			$total = $query->found_posts;
			return [
				'courses' => $courses,
				'total' => $total,
				'page' => $page,
				'per_page' => $per_page,
				'total_pages' => \ceil( $total / $per_page ),
			];
		}

		if ( $plugin_name === 'LifterLMS' && \function_exists( 'llms_get_posts' ) ) {
			$query = new \WP_Query( [
				'post_type' => 'course',
				'post_status' => 'publish',
				'posts_per_page' => $per_page,
				'offset' => $offset,
			] );
			foreach ( $query->posts as $post ) {
				$course = \llms_get_post( $post->ID );
				$courses[] = [
					'id' => $post->ID,
					'title' => $post->post_title,
					'slug' => $post->post_name,
					'status' => $post->post_status,
					'url' => \get_permalink( $post->ID ),
					'description' => \wp_trim_words( $post->post_content, 30 ),
					'price' => $this->get_lifter_price( $post->ID ),
					'students_count' => $this->get_lifter_students_count( $post->ID ),
				];
			}
			$total = $query->found_posts;
			return [
				'courses' => $courses,
				'total' => $total,
				'page' => $page,
				'per_page' => $per_page,
				'total_pages' => \ceil( $total / $per_page ),
			];
		}

		// Fallback: generic WP Query for 'course' post type
		$query = new \WP_Query( [
			'post_type' => 'course',
			'post_status' => 'publish',
			'posts_per_page' => $per_page,
			'offset' => $offset,
		] );
		foreach ( $query->posts as $post ) {
			$courses[] = [
				'id' => $post->ID,
				'title' => $post->post_title,
				'slug' => $post->post_name,
				'status' => $post->post_status,
				'url' => \get_permalink( $post->ID ),
				'description' => \wp_trim_words( $post->post_content, 30 ),
				'price' => null,
				'students_count' => null,
			];
		}
		$total = $query->found_posts;
		return [
			'courses' => $courses,
			'total' => $total,
			'page' => $page,
			'per_page' => $per_page,
			'total_pages' => \ceil( $total / $per_page ),
		];
	}

	private function get_learndash_price( int $course_id ): ?string {
		if ( \function_exists( 'learndash_get_course_price' ) ) {
			$price = \learndash_get_course_price( $course_id );
			if ( \is_array( $price ) && isset( $price['price'] ) ) {
				return $price['price'];
			}
		}
		return null;
	}

	private function get_learndash_students_count( int $course_id ): ?int {
		if ( \function_exists( 'learndash_get_course_users_count' ) ) {
			return \learndash_get_course_users_count( $course_id );
		}
		return null;
	}

	private function get_tutor_price( int $course_id ): ?string {
		if ( \function_exists( 'tutor_utils' ) ) {
			$price = \tutor_utils()->get_course_price( $course_id );
			return $price ?: null;
		}
		return null;
	}

	private function get_tutor_students_count( int $course_id ): ?int {
		if ( \function_exists( 'tutor_utils' ) ) {
			$count = \tutor_utils()->count_enrolled_users_by_course( $course_id );
			return \is_numeric( $count ) ? (int) $count : null;
		}
		return null;
	}

	private function get_lifter_price( int $course_id ): ?string {
		if ( \function_exists( 'llms_get_product' ) ) {
			$product = \llms_get_product( $course_id );
			if ( $product && \method_exists( $product, 'get_price' ) ) {
				$price = $product->get_price();
				return $price ?: null;
			}
		}
		return null;
	}

	private function get_lifter_students_count( int $course_id ): ?int {
		if ( \function_exists( 'llms_get_enrolled_students' ) ) {
			$students = \llms_get_enrolled_students( $course_id );
			return \is_array( $students ) ? \count( $students ) : null;
		}
		return null;
	}

	private function fetch_course_structure( string $plugin_name, int $course_id ): array|WP_Error {
		switch ( $plugin_name ) {
			case 'LearnDash':
				return $this->fetch_learndash_course_structure( $course_id );
			case 'Tutor LMS':
				return $this->fetch_tutor_course_structure( $course_id );
			case 'LifterLMS':
				return $this->fetch_lifter_course_structure( $course_id );
			default:
				return new WP_Error(
					'elementeer_lms_unsupported',
					'Course structure not supported for ' . $plugin_name,
					[ 'status' => 501 ]
				);
		}
	}

	private function fetch_learndash_course_structure( int $course_id ): array|WP_Error {
		if ( ! \function_exists( 'learndash_get_course_lessons' ) ) {
			return new WP_Error(
				'elementeer_learndash_missing',
				'LearnDash functions not available.',
				[ 'status' => 500 ]
			);
		}

		$course_title = \get_the_title( $course_id );
		$lessons = \learndash_get_course_lessons( $course_id, [ 'num' => -1 ] );
		$sections = [];
		
		if ( \is_array( $lessons ) ) {
			foreach ( $lessons as $lesson ) {
				$lesson_id = $lesson->ID;
				$topics = \learndash_get_topic_list( $lesson_id, $course_id );
				$topic_lessons = [];
				if ( \is_array( $topics ) ) {
					foreach ( $topics as $topic ) {
						$topic_lessons[] = [
							'id' => $topic->ID,
							'title' => $topic->post_title,
							'order' => $topic->menu_order,
							'content_type' => 'topic',
							'url' => \get_permalink( $topic->ID ),
						];
					}
				}
				$quizzes = \learndash_get_lesson_quiz_list( $lesson_id, null, $course_id );
				$quiz_data = [];
				if ( \is_array( $quizzes ) ) {
					foreach ( $quizzes as $quiz ) {
						$quiz_data[] = [
							'id' => $quiz['id'],
							'title' => $quiz['post_title'],
							'order' => $quiz['menu_order'] ?? 0,
							'question_count' => null,
						];
					}
				}
				$sections[] = [
					'id' => $lesson_id,
					'title' => $lesson->post_title,
					'order' => $lesson->menu_order,
					'lessons' => $topic_lessons,
					'quizzes' => $quiz_data,
				];
			}
		}

		// Course-level quizzes (no lesson association)
		$course_quizzes = \learndash_get_course_quiz_list( $course_id );
		if ( \is_array( $course_quizzes ) && \count( $course_quizzes ) > 0 ) {
			$quiz_items = [];
			foreach ( $course_quizzes as $quiz ) {
				$quiz_items[] = [
					'id' => $quiz['id'],
					'title' => $quiz['post_title'],
					'order' => $quiz['menu_order'] ?? 0,
					'question_count' => null,
				];
			}
			$sections[] = [
				'id' => $course_id * 1000, // synthetic ID
				'title' => 'Course Quizzes',
				'order' => 999,
				'lessons' => [],
				'quizzes' => $quiz_items,
			];
		}

		return [
			'course_id' => $course_id,
			'title' => $course_title,
			'sections' => $sections,
		];
	}

	private function fetch_tutor_course_structure( int $course_id ): array|WP_Error {
		if ( ! \function_exists( 'tutor_utils' ) ) {
			return new WP_Error(
				'elementeer_tutor_missing',
				'Tutor LMS functions not available.',
				[ 'status' => 500 ]
			);
		}

		$course_title = \get_the_title( $course_id );
		$curriculum = \tutor_utils()->get_course_curriculum( $course_id );
		$lessons = [];
		$quizzes = [];
		$order = 0;

		if ( \is_array( $curriculum ) ) {
			foreach ( $curriculum as $item ) {
				$order++;
				if ( $item['type'] === 'lesson' ) {
					$lessons[] = [
						'id' => $item['id'],
						'title' => $item['title'],
						'order' => $order,
						'content_type' => 'lesson',
						'duration' => $item['duration'] ?? null,
					];
				} elseif ( $item['type'] === 'quiz' ) {
					$quizzes[] = [
						'id' => $item['id'],
						'title' => $item['title'],
						'order' => $order,
						'question_count' => null,
					];
				} elseif ( $item['type'] === 'assignment' ) {
					$lessons[] = [
						'id' => $item['id'],
						'title' => $item['title'],
						'order' => $order,
						'content_type' => 'assignment',
					];
				}
			}
		}

		// Single section containing all curriculum items
		$sections = [
			[
				'id' => $course_id,
				'title' => 'Curriculum',
				'order' => 0,
				'lessons' => $lessons,
				'quizzes' => $quizzes,
			],
		];

		return [
			'course_id' => $course_id,
			'title' => $course_title,
			'sections' => $sections,
		];
	}

	private function fetch_lifter_course_structure( int $course_id ): array|WP_Error {
		if ( ! \function_exists( 'llms_get_course' ) ) {
			return new WP_Error(
				'elementeer_lifter_missing',
				'LifterLMS functions not available.',
				[ 'status' => 500 ]
			);
		}

		$course = \llms_get_course( $course_id );
		if ( ! $course ) {
			return new WP_Error(
				'elementeer_course_not_found',
				'Course not found.',
				[ 'status' => 404 ]
			);
		}

		$course_title = $course->get( 'title' );
		$lms_sections = $course->get_sections();
		$sections = [];
		$section_order = 0;

		foreach ( $lms_sections as $lms_section ) {
			$section_order++;
			$lessons = $lms_section->get_lessons();
			$lesson_items = [];
			$lesson_order = 0;
			foreach ( $lessons as $lesson ) {
				$lesson_order++;
				$lesson_items[] = [
					'id' => $lesson->get( 'id' ),
					'title' => $lesson->get( 'title' ),
					'order' => $lesson_order,
					'content_type' => 'lesson',
				];
			}
			$sections[] = [
				'id' => $lms_section->get( 'id' ),
				'title' => $lms_section->get( 'title' ),
				'order' => $section_order,
				'lessons' => $lesson_items,
				'quizzes' => [], // LifterLMS quizzes are separate, not implemented
			];
		}

		return [
			'course_id' => $course_id,
			'title' => $course_title,
			'sections' => $sections,
		];
	}
}