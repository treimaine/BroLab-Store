<?php

/**
* The file that defines the core plugin class
*
* A class definition that includes attributes and functions used across both the
* public-facing side of the site and the admin area.
*
* @link       sonaar.io
* @since      1.0.0
*
* @package    Sonaar_Music_Pro
* @subpackage Sonaar_Music_Pro/includes
*/

/**
* The core plugin class.
*
* This is used to define internationalization, admin-specific hooks, and
* public-facing site hooks.
*
* Also maintains the unique identifier of this plugin as well as the current
* version of the plugin.
*
* @since      1.0.0
* @package    Sonaar_Music_Pro
* @subpackage Sonaar_Music_Pro/includes
* @author     Edouard Duplessis <eduplessis@gmail.com>
*/
class Sonaar_Music_Pro {
    
    /**
    * The loader that's responsible for maintaining and registering all hooks that power
    * the plugin.
    *
    * @since    1.0.0
    * @access   protected
    * @var      Sonaar_Music_Pro_Loader    $loader    Maintains and registers all hooks for the plugin.
    */
    protected $loader;
    
    /**
    * The unique identifier of this plugin.
    *
    * @since    1.0.0
    * @access   protected
    * @var      string    $plugin_name    The string used to uniquely identify this plugin.
    */
    protected $plugin_name;
    
    /**
    * The current version of the plugin.
    *
    * @since    1.0.0
    * @access   protected
    * @var      string    $version    The current version of the plugin.
    */
    protected $version;
    
    /**
    * Define the core functionality of the plugin.
    *
    * Set the plugin name and the plugin version that can be used throughout the plugin.
    * Load the dependencies, define the locale, and set the hooks for the admin area and
    * the public-facing side of the site.
    *
    * @since    1.0.0
    */
    public function __construct() {
        
        $this->version = SRMP3PRO_VERSION;
        $this->plugin_name = 'sonaar-music-pro';
        
        
        $this->load_dependencies();
        $this->set_locale();
        $this->define_admin_hooks();
        $this->define_public_hooks();
        
        add_action( 'plugins_loaded', array( $this, 'load' ) );
    }
   
    public function load() {
        if ( class_exists( 'Sonaar_Music' ) ){
            if ( defined( 'WC_VERSION' ) && get_site_option('SRMP3_ecommerce') == '1') {
                    require_once __DIR__ . '/class-woocommerce.php';
            }
            if (get_site_option('SRMP3_ecommerce') == '1'){
                require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-filters.php';
                require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-chips.php';
                require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-search.php';
                
                add_filter( 'the_content', [ $this, 'remove_cf_data'], 1 ); //Remove_cf_data if not required
                add_filter( 'render_block', [ $this, 'editor_remove_cf_data'], 1 ); //Remove_cf_data if not required
                add_action( 'elementor/frontend/the_content', [ $this, 'editor_remove_cf_data' ] ); //Remove_cf_data if not required
            }
        }
    }
    /**
    * Load the required dependencies for this plugin.
    *
    * Include the following files that make up the plugin:
    *
    * - Sonaar_Music_Pro_Loader. Orchestrates the hooks of the plugin.
    * - Sonaar_Music_Pro_i18n. Defines internationalization functionality.
    * - Sonaar_Music_Pro_Admin. Defines all hooks for the admin area.
    * - Sonaar_Music_Pro_Public. Defines all hooks for the public side of the site.
    *
    * Create an instance of the loader which will be used to register the hooks
    * with WordPress.
    *
    * @since    1.0.0
    * @access   private
    */
    private function load_dependencies() {
       // require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-music-pro-elementor.php';
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-music-licences.php';
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-music-db.php';
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-music-get.php';
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-music-post.php';
        
        
        /**
        * The class responsible for orchestrating the actions and filters of the
        * core plugin.
        */
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-music-pro-loader.php';
        
        /**
        * The class responsible for defining internationalization functionality
        * of the plugin.
        */
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-music-pro-i18n.php';
        
        /**
        * The class responsible for defining all actions that occur in the admin area.
        */
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/class-sonaar-music-pro-admin.php';
        
        /**
        * The class responsible for defining all actions that occur in the public-facing
        * side of the site.
        */
        require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-sonaar-music-pro-public.php';


        $this->loader = new Sonaar_Music_Pro_Loader();
        
    }
    /**
	 * Initialize the plugin
	 *
	 * Validates that Elementor is already loaded.
	 * Checks for basic plugin requirements, if one check fail don't continue,
	 * if all check have passed include the plugin class.
	 *
	 *
	 * @since 1.2.0
	 * @access public
	 */
	

    public function srmp3_pro_register_widgets() {
        if ( class_exists( 'Sonaar_Music_Admin' )){
            // Its is now safe to include Widgets files
            if (  get_site_option('SRMP3_ecommerce') == '1' ) {
                require_once( __DIR__ . '/widgets/sr-filters.php' );
                require_once( __DIR__ . '/widgets/sr-search.php' );
                require_once( __DIR__ . '/widgets/sr-chips.php' );
            }
            require_once( __DIR__ . '/widgets/srpro-buttonplayer.php' );
	    }
    }

    /**
    * Define the locale for this plugin for internationalization.
    *
    * Uses the Sonaar_Music_Pro_i18n class in order to set the domain and to register the hook
    * with WordPress.
    *
    * @since    1.0.0
    * @access   private
    */
    private function set_locale() {
        
        $plugin_i18n = new Sonaar_Music_Pro_i18n();
        
        $this->loader->add_action( 'plugins_loaded', $plugin_i18n, 'load_plugin_textdomain' );
        
    }
    
    /**
    * Register all of the hooks related to the admin area functionality
    * of the plugin.
    *
    * @since    1.0.0
    * @access   private
    */
    private function define_admin_hooks() {
        
        $plugin_admin = new Sonaar_Music_Pro_Admin( $this->get_plugin_name(), $this->get_version() );
        
        $this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles' );
        $this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts' );
        $this->loader->add_action( 'cmb2_admin_init', $plugin_admin, 'init_options', 9999 );
        $this->loader->add_action( 'wp_ajax_post_stats', $plugin_admin ,'post_stats' );
        $this->loader->add_action( 'wp_ajax_nopriv_post_stats', $plugin_admin ,'post_stats' );
        $this->loader->add_action( 'wp_ajax_get_stats', $plugin_admin ,'get_stats' );
        $this->loader->add_action( 'wp_ajax_nopriv_get_stats', $plugin_admin ,'get_stats' );
       
		$this->loader->add_filter( 'upload_mimes', $plugin_admin, 'srmp3_set_mimes' );
		$this->loader->add_action( 'wp_ajax_srmp3_create_mp3_playlists', $plugin_admin ,'srmp3_create_mp3_playlists_ajax' );
		$this->loader->add_action( 'wp_ajax_srmp3_update_mp3_playlists', $plugin_admin ,'srmp3_update_mp3_playlists_ajax' );
        $this->loader->add_action( 'wp_ajax_srmp3_create_single_mp3_playlists', $plugin_admin ,'srmp3_create_single_mp3_playlists_ajax' );
        //
        $this->loader->add_action( 'wp_ajax_srmp3_create_mp3_playlists_from_import_file', $plugin_admin ,'srmp3_create_mp3_playlists_from_import_file_ajax' );
        $this->loader->add_action( 'wp_ajax_srmp3_create_single_mp3_playlists_from_import_file', $plugin_admin ,'srmp3_create_single_mp3_playlists_from_import_file_ajax' );
		//
        if(defined('SR_PLAYLIST_CPT')){
            $this->loader->add_action('manage_album_posts_custom_column', $plugin_admin , 'manage_album_custom_column', 10, 2, 9999);
            $this->loader->add_filter('manage_album_posts_columns', $plugin_admin , 'manage_album_columns', 9999);
        }
        $this->loader->add_action( 'widgets_init', $plugin_admin, 'register_widget' );
        add_action( 'elementor/widgets/register', [ $this, 'srmp3_pro_register_widgets' ] );
        $this->loader->add_action( 'init', $plugin_admin, 'srmp3_pro_add_shortcode' );
  
    }
    
    /**
    * Register all of the hooks related to the public-facing functionality
    * of the plugin.
    *
    * @since    1.0.0
    * @access   private
    */
    private function define_public_hooks() {
        
        $plugin_public = new Sonaar_Music_Pro_Public( $this->get_plugin_name(), $this->get_version() );
        if ( class_exists( 'Sonaar_Music_Public' )) {
            $this->loader->add_action( 'sonaar_podcast_import', new Sonaar_Music_Public( 'sonaar-music', $this->get_version() ), 'srp_rsscron' );
        }
        $this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_styles' );
        $this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_scripts', 9999 );
        
        if(is_admin()){
            // For the Shortcode Builder
            if ( isset( $_GET['page'] ) && $_GET['page'] == 'srmp3_settings_shortcodebuilder' ) {
                $this->loader->add_action( 'admin_enqueue_scripts', $plugin_public, 'enqueue_styles' );
                $this->loader->add_action( 'admin_enqueue_scripts', $plugin_public, 'enqueue_scripts', 11);
            }

		}
        
    }
    
    /**
    * Run the loader to execute all of the hooks with WordPress.
    *
    * @since    1.0.0
    */
    public function run() {
        $this->loader->run();
    }
    
    /**
    * The name of the plugin used to uniquely identify it within the context of
    * WordPress and to define internationalization functionality.
    *
    * @since     1.0.0
    * @return    string    The name of the plugin.
    */
    public function get_plugin_name() {
        return $this->plugin_name;
    }
    
    /**
    * The reference to the class that orchestrates the hooks with the plugin.
    *
    * @since     1.0.0
    * @return    Sonaar_Music_Pro_Loader    Orchestrates the hooks of the plugin.
    */
    public function get_loader() {
        return $this->loader;
    }
    
    /**
    * Retrieve the version number of the plugin.
    *
    * @since     1.0.0
    * @return    string    The version number of the plugin.
    */
    public function get_version() {
        return $this->version;
    }


    public static function array_insert ( $array, $pairs, $key, $position = 'after' ){
		$key_pos = array_search( $key, array_keys($array) );

		if ( 'after' == $position )
			$key_pos++;

		if ( false !== $key_pos ) {
			$result = array_slice( $array, 0, $key_pos );
			$result = array_merge( $result, $pairs );
			$result = array_merge( $result, array_slice( $array, $key_pos ) );
		}
		else {
			$result = array_merge( $array, $pairs );
		}

		return $result;
	}

    /*
	  Remove cf_data if not required
	*/
    public function remove_cf_data( $content ) {
        if ( 
            strpos($content, '[sonaar_audioplayer') !== false  && 
			strpos($content, '[sonaar_filters') == false  && //Filter widget
			strpos($content, '[sonaar_search') == false  && //Search widget
            strpos($content, '  searchbar="true"') == false  //Search shortcode attribute
		) {
			$content =  str_replace('[sonaar_audioplayer','[sonaar_audioplayer hide_cf_data="true"', $content);
		}
		return $content;
    }


	public function editor_remove_cf_data( $content ) { //Remove_cf_data if not required with Gutteneberg and elementor editor

		if ( 
			strpos($content, 'elementor-widget-sonaar-filters') == false  && //Elementor filter widget
			strpos($content, 'srp_filter_container') == false  &&//filter widget
            strpos($content, 'srp_filter_container_preload') == false  && //filter widget
            strpos($content, 'srp_tags_container') == false  && //tags widget
			strpos($content, 'srp_search_container') == false  //Search widget
			) {

			if ( strpos($content, '<div class="srp_cf_output"') !== false ) {
				$newContent = '';
				$tmp = explode('<!--START CF DATA-->', $content);
				foreach ($tmp as $key => $value){
					if(!$key%2){ //if key is a pair number
						$newContent .= $value;
					}else{
						$tmp2 = explode('<!--END CF DATA-->', $value);
						$newContent .= $tmp2[1];
					}
				}
				$content =  $newContent;
			}
		}
        $content = str_replace('<!--START CF DATA-->', '', $content);  
        $content = str_replace('<!--END CF DATA-->', '', $content); 
		return $content;
	}
	/*
	 END Remove_cf_data if not required
	*/
    
}
function srp_analytics_embed() {
    // Add GA to the DOM
    $srmp3_ga_tag = Sonaar_Music::get_option('srmp3_ga_tag', 'srmp3_settings_stats');
    
    ?>
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo esc_attr($srmp3_ga_tag) ?>"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '<?php echo esc_attr($srmp3_ga_tag) ?>');
    </script>
    <!-- End Google Analytics -->
    <?php
}
//add_action('wp_footer','sonaar_player', 12);
function sonaar_player(){
    load_template( plugin_dir_path( __FILE__ ) .'player/sonaar-player.php');
}

// Share Modal
add_action('wp_ajax_load_share_by_ajax','load_share_by_ajax_callback');
add_action('wp_ajax_nopriv_load_share_by_ajax', 'load_share_by_ajax_callback');

function load_share_by_ajax_callback() {
    check_ajax_referer('sonaar_music_ajax_nonce', 'nonce');
    $share_label_title = (Sonaar_Music::get_option('share_label_title', 'srmp3_settings_share')) ? Sonaar_Music::get_option('share_label_title', 'srmp3_settings_share') : esc_html__('Share Track', 'sonaar-music'); 
    $share_label_url = (Sonaar_Music::get_option('share_label_url', 'srmp3_settings_share')) ? Sonaar_Music::get_option('share_label_url', 'srmp3_settings_share') : esc_html__('Full URL', 'sonaar-music'); 
    $share_label_stickyplayer = (Sonaar_Music::get_option('share_label_stickyplayer', 'srmp3_settings_share')) ? Sonaar_Music::get_option('share_label_stickyplayer', 'srmp3_settings_share') : esc_html__('Share current page with sticky player ready', 'sonaar-music'); 
    $share_label_startat = (Sonaar_Music::get_option('share_label_startat', 'srmp3_settings_share')) ? Sonaar_Music::get_option('share_label_startat', 'srmp3_settings_share') : esc_html__('Start at', 'sonaar-music');
    $share_label_copy = (Sonaar_Music::get_option('share_label_copy', 'srmp3_settings_share')) ? Sonaar_Music::get_option('share_label_copy', 'srmp3_settings_share') : esc_html__('Copy', 'sonaar-music');

    
    $link = filter_var($_POST['link'], FILTER_SANITIZE_URL);
    $share_email_subject = (Sonaar_Music::get_option('share_email_subject', 'srmp3_settings_share')) ? Sonaar_Music::get_option('share_email_subject', 'srmp3_settings_share') : esc_html__('Check this out', 'sonaar-music');
    $share_email_body = (Sonaar_Music::get_option('share_email_body', 'srmp3_settings_share')) ? Sonaar_Music::get_option('share_email_body', 'srmp3_settings_share') : esc_html__('Hi, I thought you might enjoy this track from this website: ', 'sonaar-music');
    $domain = wp_parse_url(home_url())['host'];
    if (strpos($share_email_body, "{{website_domain}}") !== false) {
        $share_email_body = str_replace("{{website_domain}}", $domain, $share_email_body);
    }
    // Get the track title and image src from the request, and sanitize them
    $track_title = isset($_POST['track_title']) ? esc_html($_POST['track_title']) : '';
    $image_src = isset($_POST['image_src']) ? esc_url($_POST['image_src']) : '';
    $current_time = isset($_POST['current_time']) ? esc_html($_POST['current_time']) : '';
    // Conditionally include the image element only when image source is not empty
   
    $image_element = $image_src ? '<img class="srp-share-img" src="' . $image_src . '" alt="' . $track_title . '">' : '';
    
    $share_stickyplayer = (Sonaar_Music::get_option('share_stickyplayer', 'srmp3_settings_share') == 'false' ) ? '' : '
    <div class="srp-modal-sticky-player-container">
        <input type="checkbox" id="stickyPlayerCheckbox">
        <label class="srp-modal-sticky-player-label" for="stickyPlayerCheckbox">' . $share_label_stickyplayer . '</label>
    </div>
    <div class="srp-modal-sticky-player-container srp-modal-sticky-player--time">
        <input type="checkbox" id="stickyPlayerTimeCheckbox">
        <label class="srp-modal-sticky-player-label" for="stickyPlayerTimeCheckbox">' . $share_label_startat . '</label><input type="text" value="' . $current_time . '" id="stickyPlayerCurrentTime">
    </div>';

    // Social Media
    $share_social = (Sonaar_Music::get_option('share_socialmedia', 'srmp3_settings_share')) ? Sonaar_Music::get_option('share_socialmedia', 'srmp3_settings_share') : array( 'facebook','whatsapp','twitter' );
    $social_html = '<div class="srp-modal-socialshare-container">';
    if(Sonaar_Music::get_option('share_socialmedia_enable', 'srmp3_settings_share') != 'false'){

        if (in_array('facebook', $share_social)) {
            $social_html .= '<a href="https://www.facebook.com/sharer/sharer.php?u=' . urlencode($link) . '" target="_blank" class="fab fa-facebook"></a>';
        }
        if (in_array('whatsapp', $share_social)) {
            $social_html .= '<a href="https://api.whatsapp.com/send?text=' . urlencode($link) . '"  target="_blank" class="fab fa-whatsapp"></a>';
        }
        if (in_array('twitter', $share_social)) {
            $social_html .= '<a href="https://twitter.com/intent/tweet?url=' . urlencode($link) . '" target="_blank" class="sricon sricon-x-twitter"></a>';
        }
        if (in_array('email', $share_social)) {
            $share_email_subject = str_replace('+', '%20', urlencode($share_email_subject));
            $share_email_body = str_replace('+', '%20', urlencode($share_email_body));
            $email_shared_link = str_replace('+', '%20', urlencode($link));
        
            $email_link = 'mailto:?subject=' . $share_email_subject . '&body=' . $share_email_body . '%0D%0A' . $email_shared_link;
            $social_html .= '<a href="' . $email_link . '" target="_blank" class="fas fa-envelope"></a>';
        }
        if (in_array('sms', $share_social)) {
            $social_html .= '<a href="sms:?&body=' . $share_email_body . '%0D%0A' . urlencode($link) . '" target="_blank" class="fas fa-sms"></a>';
        }
            $social_html .= '<a href="javascript:void(0);" title="' . esc_html__("More", "sonaar-music") . '" class="srp-share-mobile-more"><i class="fas fa-ellipsis-h"></i></a>';
        
    }
    $social_html .= '</div>';
    // end of Social Media
    $html = '
    <div class="srp-modal-share">
        <div class="srp-share-title">' . $share_label_title . '</div>
        <div class="srp-share-trackinfo-container">
            ' . $image_element . '
            <div class="srp-share-tracktitle">' . $track_title . '</div>
        </div>
        <div class="srp-modal-linkurl-container">
            <label class="srp-modal-linkurl-label">' . $share_label_url . '</label>
            <div class="srp-modal-linkurl-input-container">
                <i class="fas fa-link" style=""></i>
                <input type="text" value="' . $link . '" id="myInput">
                <button id="copyButton" class="srp_button" onclick="srp_share_popup_CopyToClipboard()">' . $share_label_copy . '</button>
            </div>
        </div>'
        . $share_stickyplayer . $social_html .
    '</div>';

    echo wp_json_encode($html, JSON_HEX_TAG);
    wp_die();
}
