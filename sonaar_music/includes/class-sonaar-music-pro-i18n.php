<?php

/**
 * Define the internationalization functionality
 *
 * Loads and defines the internationalization files for this plugin
 * so that it is ready for translation.
 *
 * @link       sonaar.io
 * @since      1.0.0
 *
 * @package    Sonaar_Music_Pro
 * @subpackage Sonaar_Music_Pro/includes
 */

/**
 * Define the internationalization functionality.
 *
 * Loads and defines the internationalization files for this plugin
 * so that it is ready for translation.
 *
 * @since      1.0.0
 * @package    Sonaar_Music_Pro
 * @subpackage Sonaar_Music_Pro/includes
 * @author     Edouard Duplessis <eduplessis@gmail.com>
 */
class Sonaar_Music_Pro_i18n {


	/**
	 * Load the plugin text domain for translation.
	 *
	 * @since    1.0.0
	 */
	public function load_plugin_textdomain() {

		load_plugin_textdomain(
			'sonaar-music-pro',
			false,
			dirname( dirname( plugin_basename( __FILE__ ) ) ) . '/languages/'
		);

	}



}
