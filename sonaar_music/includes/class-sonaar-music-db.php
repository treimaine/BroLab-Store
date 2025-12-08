<?php
/**
 * Metric repository.
 *
 * @package   Sonaar
 * @copyright Copyright (c) 2020, Sonaar
 * @license   GPL-2.0+
 * @since     1.0.0
 */


class Sonaar_Music_DB {
	/**
	 * MySQL datetime format.
	 *
	 * @since 1.0.0
	 * @var string
	 */
	const MYSQL_DATETIME_FORMAT = 'Y-m-d H:i:s';

	protected $db;
	protected $db_name;
	protected $end_date;
	protected $interval = 7;
	protected $offset;
	protected $start_date;

	public function __construct() {
		global $wpdb;

		$this->db         = $wpdb;
		$this->db_name    = $wpdb->prefix . 'sonaar_events';
		$this->offset     = $this->get_timezone_offset();
		$this->end_date   = date( self::MYSQL_DATETIME_FORMAT, time() );
		$this->start_date = date( self::MYSQL_DATETIME_FORMAT, strtotime( sprintf( '-%d days', $this->interval ) ) );
	}

	/**
	 * Retrieve the time zone offset.
	 *
	 * @since 1.0.0
	 *
	 * @return double
	 */
	protected function get_timezone_offset() {
		$offset = wp_timezone_override_offset();
		return $offset ? $offset : get_option( 'gmt_offset', 0 );
	}
}
