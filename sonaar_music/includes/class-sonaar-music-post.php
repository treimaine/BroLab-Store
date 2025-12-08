<?php 

class Sonaar_Music_Post extends Sonaar_Music_DB {

	/**
	 * Log an action.
	 *
	 * @since 1.0.0
	 *
	 * @param  WP_REST_Request $request Request instance.
	 * @return boolean
	 */
	public function log( $request ) {
		global $wpdb;
		
		// var_dump($this->db_name);
		// die();
		
		$wpdb->insert(
			$this->db_name,
			array(
				'action'       => $request['action'],
				'client_ip'    => $_SERVER['REMOTE_ADDR'],
				'client_uid'   => 'client_uid',
				'page_title'   => $request['page_title'],
				'page_url'     => $request['page_url'],
				'target_time'  => 'target_time',
				'target_title' => $request['target_title'],
				'target_url'   => $request['target_url'],
				'created'      => date( 'Y-m-d H:i:s', time() ),
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);

		return true;
	}

	/**
	 * Sanitize the client id.
	 *
	 * @since 1.0.0
	 *
	 * @param  string $value Unique client id.
	 * @return string
	 */
	public function sanitize_client_uid( $value ) {
		return preg_replace( '/[^1-9.]/', '', $value );
	}

	/**
	 * Sanitize the page title.
	 *
	 * @since 1.0.0
	 *
	 * @param  string $value Page title.
	 * @return string
	 */
	public function sanitize_page_title( $value ) {
		return sanitize_text_field( $value );
	}

	/**
	 * Sanitize the page URL.
	 *
	 * @since 1.0.0
	 *
	 * @param  string $value Page URL.
	 * @return string
	 */
	public function sanitize_page_url( $value ) {
		return esc_url_raw( strtok( $value, '#' ) );
	}

	/**
	 * Sanitize the target title.
	 *
	 * @since 1.0.0
	 *
	 * @param  string $value Target resource title.
	 * @return string
	 */
	public function sanitize_target_title( $value ) {
		return sanitize_text_field( $value );
	}

	/**
	 * Sanitize the target URL.
	 *
	 * @since 1.0.0
	 *
	 * @param  string $value Target resource URL.
	 * @return string
	 */
	public function sanitize_target_url( $value ) {
		return esc_url_raw( remove_query_arg( '_', strtok( $value, '#' ) ) );
	}

}
