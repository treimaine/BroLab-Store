<?php

/**
 * The public-facing functionality of the plugin.
 *
 * @link       sonaar.io
 * @since      1.0.0
 *
 * @package    Sonaar_Music_Pro
 * @subpackage Sonaar_Music_Pro/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the public-facing stylesheet and JavaScript.
 *
 * @package    Sonaar_Music_Pro
 * @subpackage Sonaar_Music_Pro/public
 * @author     Edouard Duplessis <eduplessis@gmail.com>
 */

class Sonaar_Music_Pro_Public {


	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $plugin_name    The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $version    The current version of this plugin.
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @param      string    $plugin_name       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;

	}

	/**
	 * Register the stylesheets for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {
		if(!defined('SR_PLAYLIST_CPT'))
		return;
		/**
		 * This function is provided for demonstration purposes only.
		 *
		 * An instance of this class should be passed to the run() function
		 * defined in Sonaar_Music_Pro_Loader as all of the hooks are defined
		 * in that particular class.
		 *
		 * The Sonaar_Music_Pro_Loader will then create the relationship
		 * between the defined hooks and the functions defined in this
		 * class.
		 */

		wp_register_style( 'sonaar-music-pro', plugin_dir_url( __FILE__ ) . 'css/sonaar-music-pro-public.css', array(), $this->version, 'all' );
		/* Enqueue Sonnar Music css file on single Album Page */
		if ( is_single() && get_post_type() == SR_PLAYLIST_CPT ) {
			wp_enqueue_style( 'sonaar-music-pro' );
		}
		wp_register_style( 'srp-swiper-style', plugin_dir_url( __FILE__ ) . 'css/swiper-bundle.min.css', array(), '9.3.2', 'all' );
	}

	//Get the option from the first playlist post in the player playlist when it is set from the page settings.
	public function getOptionFromPlaylistPost($ID, $optionName ){
		$result = get_post_meta( $ID, 'sonaar_footer_player_meta', true );
		if(is_array($result)){
			$result = get_post_meta( $result[0], $optionName, true);
		}else{
			$result ='';
		}	
		return $result;
	}
	/**
	 * Register the JavaScript for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {
		if ( !class_exists( 'Sonaar_Music' ) ){
            return;
        }
		global $post, $wp;
		
		/* return script when page  not found (404) */
		if ( is_404() ) {
			return;
		}
		wp_register_script( 'sonaar-music-pro', plugin_dir_url( __FILE__ ) . 'js/sonaar-music-pro-public.js', array( 'jquery' ), $this->version, false );
		wp_deregister_script( 'sonaar-music-mp3player' );
		wp_register_script( 'sonaar-music-pro-mp3player', plugin_dir_url( __FILE__ ) . 'js/iron-audioplayer/iron-audioplayer.js', array( 'jquery', 'sonaar-music', 'sonaar-music-pro' ,'moments', 'jquery-ui-slider' ), $this->version, true );
		wp_register_script( 'srp-swiper', plugin_dir_url( __FILE__ ) . 'js/swiper-bundle.min.js', array(), '9.3.2', true  );
		wp_register_script( 'sonaar-list', plugin_dir_url( __FILE__ ) . 'js/list.min.js', array(), $this->version, false );
		wp_register_script( 'color-thief', plugin_dir_url( __FILE__ ) . 'js/color-thief.min.js', array(), $this->version, false );
		
		if (!is_admin() && get_site_option('SRMP3_ecommerce') == '1') {
			wp_register_script( 'srp-advanced-triggers', plugin_dir_url( __FILE__ ) . 'js/srp-advanced_triggers.js', array(), $this->version, true );
			wp_enqueue_script( 'srp-advanced-triggers' );
			wp_localize_script( 'srp-advanced-triggers', 'srp_advanced_triggers', $this->srp_advanced_triggers_enqueue_scripts() );
		}

		wp_enqueue_script( 'sonaar-music-scrollbar' );
		$playlists = $this->getUserPlaylists();
		
		wp_localize_script( $this->plugin_name . '-mp3player', 'sonaar_music', array(
			'plugin_dir_url'=> plugin_dir_url( __FILE__ ),
			'plugin_dir_url_free'=> (defined('SRMP3_DIR_PATH')) ? plugin_dir_url(SRMP3_DIR_PATH. 'sonaar-music.php') : '',
			'plugin_version_free'=>(new Sonaar_Music)->get_version(),
			'plugin_version_pro'=> $this->version,
			'SRMP3_ecommerce' => get_site_option('SRMP3_ecommerce'),
			'SRMP3_purchased_plan' => esc_html(printPurchasedPlan()),
			'option' => Sonaar_Music::get_option( 'allOptions' ),
			'ajax' => array(
				'ajax_url' => admin_url( 'admin-ajax.php' ),
				'ajax_nonce' => wp_create_nonce( 'sonaar_music_ajax_nonce' ),
				'ajax_nonce_peaks' => wp_create_nonce( 'sonaar_music_ajax_peaks_nonce' ),
			),
			'current_page' => array(
				'title' => ( isset ($post) ) ? get_the_title( $post->ID ) : '',
				'url' => home_url($_SERVER['REQUEST_URI'])
			),
			'postID' => ( isset ($post) ) ? $post->ID  : '',
			'playlists' => $playlists,
		));

		if(null!==Sonaar_Music::get_option('srmp3_ga_tag', 'srmp3_settings_stats') && Sonaar_Music::get_option('srmp3_ga_tag', 'srmp3_settings_stats') != ''){
			add_action( 'wp_head', 'srp_analytics_embed', 12 );
		}
		//--Player footer----------------
		
		wp_register_script( 'vuejs', plugin_dir_url( __DIR__ ) . 'public/js/vue.min.js' , array(), '2.6.14', true );


		// Register the script
		wp_register_script( 'sonaar_player', plugin_dir_url( __FILE__ ) . 'js/sonaarPlayer.js', array( 'jquery','jquery-ui-draggable', 'sonaar-music-pro', 'moments', 'sonaar-music-pro-mp3player','vuejs' ), $this->version, true  );
	
		//get the user role
		$user = wp_get_current_user();
		$user_role = (isset($user->roles[0])) ? $user->roles[0] : '';

		// Localize the script with new data
		$sonaar_player_data = array(
			'sonaar_music' => array(
				'mostRecentId' => ( wp_get_recent_posts(array('post_type'=>SR_PLAYLIST_CPT, 'post_status' => 'publish', 'numberposts' => 1)) ) ? wp_get_recent_posts(array('post_type'=>SR_PLAYLIST_CPT, 'post_status' => 'publish', 'numberposts' => 1))[0]["ID"]: '',
				'currentPostId' => get_the_ID(),
				'continuous_artist_name' => Sonaar_Music::get_option('show_artist_name', 'srmp3_settings_general'),
				'footer_albums' => ( isset ($post) ) ? get_post_meta( get_queried_object_id(), 'sonaar_footer_player_meta', true ) : '',
				'footer_albums_shuffle' => ( isset ($post) ) ? get_post_meta( get_queried_object_id(), 'sonaar_footer_player_shuffle_meta', true) : '',
				'no_loop_tracklist'=> ( isset ($post) ) ? $this->getOptionFromPlaylistPost($post->ID, 'no_loop_tracklist') : '',
				'no_track_skip'=> ( isset ($post) ) ? $this->getOptionFromPlaylistPost($post->ID, 'no_track_skip') : '',
				'post_player_type'=> ( isset ($post) ) ? $this->getOptionFromPlaylistPost($post->ID, 'post_player_type') : '',
				'ga_tag' => Sonaar_Music::get_option('srmp3_ga_tag', 'srmp3_settings_stats'),
				'play_button_label' => array(
					'play' => __('Play', 'sonaar-music-pro'),
					'pause' => __('Pause', 'sonaar-music-pro')
				)
			),
			'site_url'=> esc_url( home_url('/') ),
			'is_logged_in' => is_user_logged_in() ? 'yes' : 'no',
			'user_role' => $user_role,
		);
		wp_localize_script( 'sonaar_player', 'srp_vars', $sonaar_player_data );

		// Enqueued script with localized data.

		/* Enqueue Sonnar Music Pro mp3player js file on single Album Page */
		if ( ( is_single() && get_post_type() == SR_PLAYLIST_CPT ) || class_exists('\abs\Abs_Plugin' ) ){
			wp_enqueue_script( 'sonaar-music-pro-mp3player' );
			wp_enqueue_script( 'sonaar_player' );
			add_action('wp_footer','sonaar_player', 12);
		}

		/* Enqueue Sonaar Music Pro mp3player js file Conditions */;
		include_once(ABSPATH.'wp-admin/includes/plugin.php');
		if(
			isset($post) && get_post_meta( $post->ID, 'sonaar_footer_player_meta', true ) != '' && get_post_meta( $post->ID, 'sonaar_footer_player_meta', true ) != [''] || // when the option "Display Audio player footer" is enable  
			class_exists('\abs\Abs_Plugin' ) ||
			Sonaar_Music::get_option('overall_sticky_playlist', 'srmp3_settings_sticky_player') !='' || // when the global player option is enable  
			Sonaar_Music::get_option('enable_continuous_player', 'srmp3_settings_sticky_player') == 'true' && isset($_COOKIE['sonaar_mp3_player_settings']) || // when the continuous player is enable and a cookie is already set.  
		 	(class_exists('Iron_sonaar'))?true:false || // If Sonaar Theme is activated
			Sonaar_Music::get_option('always_load_scripts', 'srmp3_settings_general') == 'on' || // If option "Load Sonaar Scripts on Every Pages" is Enable
			Sonaar_Music::get_option('wc_enable_licenses_cpt', 'srmp3_settings_woocommerce') == 'true' && class_exists( 'WooCommerce' ) && ( is_cart() || is_checkout() || is_account_page() || is_shop() ) // load JS to for the PREVIEW LICENSE Button	
		){
			wp_enqueue_style( 'sonaar-music' );
			wp_enqueue_style( 'sonaar-music-pro' );
			wp_enqueue_script( 'sonaar-music-mp3player' );
			wp_enqueue_script( 'sonaar-music-pro-mp3player' );
			wp_enqueue_script( 'sonaar_player' );
			wp_enqueue_script( 'color-thief' );
			if ( function_exists('sonaar_player') ) {
				add_action('wp_footer','sonaar_player', 12);
			}
		}
	}

	public function getUserPlaylists(){
		//this is called only when we add tracks or remove to the playlist
		$playlists = [];
		if ( is_user_logged_in() ) {
			$user = wp_get_current_user();
			$playlists = get_user_meta($user->ID, 'sonaar_mp3_playlists', true);
			// Check if the playlists exist and is not empty
			
		}else{
			if (isset($_COOKIE['sonaar_mp3_playlists'])) {
				$playlists = json_decode(stripslashes($_COOKIE['sonaar_mp3_playlists']), true);
			} else {
				// Handle the case where the cookie is not set or do nothing
				$playlists = [];
			}
		}
		if (empty($playlists)) {
			// Create a default playlist if playlists don't exist
			$playlists = array(
				array(
					"playlistName" => "Favorites",
					"tracks" => array()
				)
			);
		}
		
		// Ensure the RecentlyPlayed playlist exists
		$foundRecentlyPlayed = false;
		foreach ($playlists as $playlist) {
			if ($playlist['playlistName'] === 'RecentlyPlayed') {
				$foundRecentlyPlayed = true;
				break;
			}
		}
	
		if (!$foundRecentlyPlayed) {
			// Add the RecentlyPlayed playlist if not found
			$playlists[] = array(
				"playlistName" => "RecentlyPlayed",
				"tracks" => array()
			);
		}
	   
		return $playlists;
	}
	public function srp_advanced_triggers_enqueue_scripts() {
		$advanced_triggers = get_posts(array(
			'post_type' => 'sr_advanced_triggers',
			'numberposts' => -1,
			'meta_query' => array(
				array(
					'key'     => 'sr_advancedtriggers_enabled',
					'value'   => 'true',
					'compare' => '='
				)
			)
		));
	
		$scenarios = array();
	
		foreach ($advanced_triggers as $action) {
			$type = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_type', true));
			$action_when = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_action_when', true));
			$isRequired = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_is_required', true)); // Returns 'true' or 'false' as string.
			$isRequired = ($isRequired === 'true');
			$reached_value = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_reached_value', true));
			$reached_unit = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_reached_unit', true));	

			$pausePlayer = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_pause_player', true));
			$applyFor = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_applyfor', true));
			$userRoles = get_post_meta($action->ID, 'sr_advancedtriggers_user_role_is', true);
			$userRoles = is_array($userRoles) ? array_map('sanitize_text_field', $userRoles) : array(sanitize_text_field($userRoles));
			
			$selector = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_selector', true));
			$specificPlayers = get_post_meta($action->ID, 'sr_advancedtriggers_specific_players_ids', true);
			$specificPlayers = is_array($specificPlayers) ? array_map('sanitize_text_field', $specificPlayers) : array(sanitize_text_field($specificPlayers));
			$cssSelectorValue = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_css_selector_value', true));
			$exclude_cssSelectorValue = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_exclude_css_selector_value', true));
			$tracks = get_post_meta($action->ID, 'sr_advancedtriggers_tracks', true);
			$tracks = is_array($tracks) ? array_map('sanitize_text_field', $tracks) : '';
			
			
			$rememberAndDontShowAgainForThisTrackUntilPageRefresh = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_rememberAndDontShowAgainForThisTrackUntilPageRefresh', true));
			$rememberAndDontShowAgainForThisTrackUntilPageRefresh = filter_var($rememberAndDontShowAgainForThisTrackUntilPageRefresh, FILTER_VALIDATE_BOOLEAN);

			$rememberAndDontShowAgainForThisPlayerUntilPageRefresh = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_rememberAndDontShowAgainForThisPlayerUntilPageRefresh', true));
			$rememberAndDontShowAgainForThisPlayerUntilPageRefresh = filter_var($rememberAndDontShowAgainForThisPlayerUntilPageRefresh, FILTER_VALIDATE_BOOLEAN);

			$rememberAndDontShowAgainIfAlreadySubmitted = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_rememberAndDontShowAgainIfAlreadySubmitted', true));
			$rememberAndDontShowAgainIfAlreadySubmitted = filter_var($rememberAndDontShowAgainIfAlreadySubmitted, FILTER_VALIDATE_BOOLEAN);

			$conditions = array();
			if ($action_when === 'play' && $reached_value !== '' && is_numeric($reached_value)) {
				$conditions['reached_value'] = $reached_value;
				$conditions['reached_unit'] = $reached_unit;
				if (!$isRequired && $rememberAndDontShowAgainForThisTrackUntilPageRefresh === "true") {
					$conditions['times'] = 1;
				}
			} elseif ($action_when === 'downloadButtonClicked') {
				$conditions['downloadButtonClicked'] = true;
			}

			if(empty($action_when)){
				$conditions['reached_value'] = 0;
				$conditions['reached_unit'] = 'seconds';
			}
	
			$actions = array();
			$audioLength = array();
	
			switch ($type) {

				case 'trim':
					$actions[] = array(
						'type' 		=> 'trim',
					);
					$audioLength['start_time'] = intval(get_post_meta($action->ID, 'sr_advancedtriggers_start_time', true));
					$audioLength['audio_duration'] = intval(get_post_meta($action->ID, 'sr_advancedtriggers_audio_duration', true));
					$audioLength['fade_in'] = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_trim_fadein', true));
					$audioLength['fade_out'] = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_trim_fadeout', true));
					break;
				case 'popup_askemail':
					$actions[] = array(
						'type' 			=> 'popup',
						'popupHook' 	=> 'askForEmail',
						'stopPlayer' 	=> ($pausePlayer === 'true') ? true : false,
						'required' 		=> ($isRequired) ? true : false
					);
					break;
				case 'popup':
					$popupHook = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_popup_hook', true));
                    $popupContent = ($popupHook == 'custom') ? wpautop(get_post_meta($action->ID, 'sr_advancedtriggers_popup_hook_custom', true)) : '';
					$elementorPopupID = ($popupHook === 'elementorPopup') ? intval(get_post_meta($action->ID, 'sr_advancedtriggers_popup_hook_elementor', true)) : '';
					$actions[] = array(
						'type' 			=> 'popup',
						'popupHook' 	=> $popupHook,
						'popupContent' 	=> $popupContent,
						'popupID' 		=> $elementorPopupID,
						'stopPlayer' 	=> ($pausePlayer === 'true') ? true : false,
						'required' 		=> ($isRequired) ? true : false
					);
					break;

				case 'audio':
					$audioFile = esc_url(get_post_meta($action->ID, 'sr_advancedtriggers_audio', true));
					$lockControl = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_lock_control', true));
					$message = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_message', true));
					$actions[] = array(
						'type' 			=> 'playAd',
						'url' 			=> $audioFile,
						'lockControl' 	=> $lockControl,
						'message'		=> $message,
						'stopPlayer' 	=> ($pausePlayer === 'true') ? true : false,
						'required' 		=> ($isRequired) ? true : false
					);
					break;

				case 'watermark':
					$audioFile = esc_url(get_post_meta($action->ID, 'sr_advancedtriggers_watermark', true));
					$loopGap = intval(get_post_meta($action->ID, 'sr_advancedtriggers_loopGap', true));
					$actions[] = array(
						'type'		=> 'watermark',
						'url'		=> $audioFile,
						'loopGap' 	=> $loopGap,
						'required'	=> true,
					);
					break;
	
				case 'redirect':
					$redirectUrl = esc_url(get_post_meta($action->ID, 'sr_advancedtriggers_redirect_url', true));
					$redirectTarget = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_target', true));
					$actions[] = array(
						'type' 		=> 'redirect',
						'stopPlayer' 	=> ($pausePlayer === 'true') ? true : false,
						'url' 		=> $redirectUrl,
						'target' 	=> $redirectTarget
					);
					break;
	
	
				case 'scroll':
					$scrollToId = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_scroll_to', true));
					$actions[] = array(
						'type' 		=> 'scrollToId',
						'stopPlayer' 	=> ($pausePlayer === 'true') ? true : false,
						'cssId' 		=> $scrollToId
					);
					break;
				

			}
	
			$applyForArray = array();
			if ($applyFor === 'everybody') {
				$applyForArray['everybody'] = true;
			} elseif ($applyFor === 'logged_in') {
				$applyForArray['loggedIn'] = true;
			} elseif ($applyFor === 'logged_out') {
				$applyForArray['loggedOut'] = true;
			} elseif ($applyFor === 'user_role' && !empty($userRoles)) {
				$applyForArray['roles'] = $userRoles;
			}
	
			$applyOnArray = array();

			if ($selector === 'allplayers' && !$tracks) {

				$applyOnArray['allPlayers'] = true;

			} elseif ($selector === 'specific_players' && !empty($specificPlayers)) {
			
				// Ensure all values are integers (no need for explode)
				$specificPlayerIDs = array_map('intval', $specificPlayers);
			
				$playersClasses = array_map(function ($id) {
					$post_type = get_post_type($id);
					switch ($post_type) {
						case 'page':
							return '.page-id-' . $id;
						case 'post':
							return '.postid-' . $id;
						default:
							return '.postid-' . $id; // Custom post type
					}
				}, $specificPlayerIDs);
			
				$applyOnArray['players'] = $playersClasses; // Output as array of CSS classes
			} elseif ($selector === 'css_selector' && !empty($cssSelectorValue)) {
				$applyOnArray['players'] = array_map('sanitize_text_field', explode(',', $cssSelectorValue)); // Output as array
			}

			$excludeOn = array();
			if (!empty($exclude_cssSelectorValue)) {
				$excludeOn['css_selector'] = array_map('sanitize_text_field', explode(',', $exclude_cssSelectorValue)); // Output as array
			}
			
	
			if (!empty($tracks)) {
				// If $tracks is a string, convert it to an array using explode
				$trackIDs = is_array($tracks) ? $tracks : explode(',', $tracks);
			
				// Convert all IDs to integers
				$trackIDs = array_map('intval', $trackIDs);
			
				$applyOnArray['specificTracks'] = $trackIDs;
			}

			$advancedRules = array();
			$advancedRules['applyTimeSpan'] = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_apply_timespan', true));
			$advancedRules['applyAfter'] = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_apply_after', true));
			$advancedRules['applyMaxTimes'] = sanitize_text_field(get_post_meta($action->ID, 'sr_advancedtriggers_apply_max_time', true));
			
			$modified_time = strtotime($action->post_modified); // Modification date of this specific scenario
			$scenario = array(
				'name' => esc_html($action->post_title),
				'id' => $action->ID,
				'modified_date' => $modified_time,
				'audio' => $audioLength,
				'action_when' => $conditions,
				'trigger' => $actions,
				'applyFor' => $applyForArray,
				'applyOn' => $applyOnArray,
				'advancedRules' => $advancedRules,
				'excludeOn' => $excludeOn,
				'onceActionFilled' => array(
					'rememberAndDontShowAgainForThisTrackUntilPageRefresh' => $rememberAndDontShowAgainForThisTrackUntilPageRefresh,
					'rememberAndDontShowAgainUntilLocalStorageCleared' => false,
					'rememberAndDontShowAgainForThisPlayerUntilPageRefresh' => $rememberAndDontShowAgainForThisPlayerUntilPageRefresh,
					'rememberAndDontShowAgainIfAlreadySubmitted' => $rememberAndDontShowAgainIfAlreadySubmitted
				)
			);
	
			$scenarios[] = $scenario;
		}
	
		//error_log(print_r($scenarios, true));
		return $scenarios;
	}
	
}
