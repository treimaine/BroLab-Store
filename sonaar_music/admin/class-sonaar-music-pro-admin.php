<?php

/**
* The admin-specific functionality of the plugin.
*
* @link       sonaar.io
* @since      1.0.0
*
* @package    Sonaar_Music_Pro
* @subpackage Sonaar_Music_Pro/admin
*/

/**
* The admin-specific functionality of the plugin.
*
* Defines the plugin name, version, and two examples hooks for how to
* enqueue the admin-specific stylesheet and JavaScript.
*
* @package    Sonaar_Music_Pro
* @subpackage Sonaar_Music_Pro/admin
* @author     Edouard Duplessis <eduplessis@gmail.com>
*/

class Sonaar_Music_Pro_Admin {
    
    
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

    public $registered_plugins_data = false;
    /**
    * Initialize the class and set its properties.
    *
    * @since    1.0.0
    * @param      string    $plugin_name       The name of this plugin.
    * @param      string    $version    The version of this plugin.
    */
    public function __construct( $plugin_name, $version ) {
        
        $this->plugin_name = $plugin_name;
        $this->version = $version;
		
		global $iron_music_player;
		$iron_music_player = get_option( 'iron_music_player' );

        
        if ( get_site_option('SRMP3_ecommerce') == '1' ) {
            add_filter( 'manage_sr_email_submission_posts_columns',         array($this, 'srp_collectemail_add_custom_columns'));
            add_filter( 'manage_edit-sr_email_submission_sortable_columns', array($this, 'srp_collectemail_make_columns_sortable'));
            add_action( 'manage_sr_email_submission_posts_custom_column',   array($this, 'srp_collectemail_custom_columns_content'), 10, 2);
            add_action( 'pre_get_posts',                                    array($this, 'srp_collectemail_orderby_custom_columns'));
            add_action( 'restrict_manage_posts',                            array($this, 'srp_collectemail_add_export_button'));
            add_action( 'srmp3_cpt_defined',                                array($this, 'srp_collectemail_register_post_type'));
            add_action( 'wp_ajax_srmp3_export_emails',                      array($this, 'srmp3_export_emails_ajax'));

            add_action( 'srmp3_cpt_defined',                                array($this, 'srp_advanced_triggers_register_post_type'));
        }

        add_action( 'wp_ajax_index_alb_tracklist_for_lazyload',         array($this, 'index_alb_tracklist_for_lazyload_ajax_handler')); 
        add_action( 'plugins_loaded',                                   array($this, 'load_audioPreview_class' ) );
        add_filter( 'plugins_list',                                     array($this, 'srp_plugins_list'),99);
        add_filter( 'plugins_api',                                      array($this, 'plugins_api_filter'), 10, 3);
        add_action( 'admin_init',                                       array($this, 'generate_register_plugin_data' ) );
        add_action( 'current_screen',                                   array($this, 'srmp3_disable_admin_notices') );
        add_filter( 'plugin_row_meta',                                  array($this, 'plugin_row_meta' ), 10, 3 );
       
        if ( is_admin() ) {
            //should set more action here. WIP
            add_action( 'load-post.php', array($this, 'sonaar_meta_boxes_setup' ));
            add_action( 'load-post-new.php', array($this, 'sonaar_meta_boxes_setup' ));
            add_action( 'wp_ajax_get_posts_for_select', array($this, 'get_posts_for_select_callback' ));

            if ( get_site_option('SRMP3_ecommerce') == '1' ) {
                add_filter( 'manage_sr_advanced_triggers_posts_columns',        array($this, 'sr_advancedtrigger_add_enable_column'));
                add_action( 'manage_sr_advanced_triggers_posts_custom_column',  array($this, 'sr_advancedtrigger_display_enable_column'), 10, 2);
                add_action( 'wp_ajax_toggle_post_status',                       array($this, 'sr_advancedtrigger_toggle_post_status'));
                add_action( 'save_post',                                        array($this, 'sr_advancedtrigger_toggle_enable_on_status_change'), 10, 2);
            }
        }
    }
   
    public function sr_advancedtrigger_add_enable_column($columns) {
        if (!isset($_GET['post_status']) || $_GET['post_status'] !== 'trash') {
            $columns['enable'] = __('Enable', 'sonaar-music');
        }
        return $columns;
    }
    public function sr_advancedtrigger_display_enable_column($column, $post_id) {
        if ($column === 'enable') {
            $status = get_post_meta($post_id, 'sr_advancedtriggers_enabled', true) === 'true' ? 'checked' : '';
            echo '<label class="sr-advanced-trigger-editscreen-switch">
                    <input type="checkbox" class="sr-advanced-trigger-editscreen-enable-toggle" data-post_id="' . $post_id . '" ' . $status . '>
                    <span class="sr-advanced-trigger-editscreen-slider"></span>
                  </label>';
        }
    }
    public function sr_advancedtrigger_toggle_enable_on_status_change($post_id, $post) {

        // Only proceed for the 'sr_advanced_triggers' post type
        if ($post->post_type !== 'sr_advanced_triggers') {
            return;
        }
        // Check if the post status is 'publish' or 'draft'
        if ($post->post_status === 'publish') {
            update_post_meta($post_id, 'sr_advancedtriggers_enabled', 'true');
        } elseif ($post->post_status === 'draft') {
            update_post_meta($post_id, 'sr_advancedtriggers_enabled', 'false');
        }
    }
    public function sr_advancedtrigger_toggle_post_status() {
        check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');
         // Check if the user has the correct permissions
         if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'You do not have permission to export emails.'));
        }
    
        $post_id = intval($_POST['post_id']);
        $enable = $_POST['enable'] === 'true' ? 'true' : 'false';
    
        update_post_meta($post_id, 'sr_advancedtriggers_enabled', $enable);
    
        wp_send_json_success(array('message' => 'Post status updated.'));
    }
   




    public function srmp3_disable_admin_notices() {
        $screen = get_current_screen();
        if ($screen->id === 'sr_playlist_page_sonaar_music_pro_license') {
            remove_all_actions('admin_notices');
        }
    }
    /*
    * STICKY PLAYER META BOX 
    */
    public function get_posts_for_select_callback() {
        
        $sr_postypes = Sonaar_Music_Admin::get_cpt($all = true);

        $search_term = isset($_GET['q']) ? sanitize_text_field($_GET['q']) : '';

        $query_args = array(
            'post_type' => $sr_postypes, // specify your post type
            'post_status' => 'publish',
            's' => $search_term,
            'posts_per_page' => 20 // adjust as needed
        );

        $query = new WP_Query($query_args);
        $results = array();
        if($query->have_posts()) {
            while($query->have_posts()) {
                $query->the_post();
                $results[] = array('id' => get_the_ID(), 'text' => get_the_title());
            }
        }

        wp_reset_postdata();
        wp_send_json($results);
    }
    public function footer_player_meta_box( $post ) { 
        $current_values = get_post_meta( $post->ID, 'sonaar_footer_player_meta', true);
        if( !is_array($current_values)){
            $current_values = [];
        }

        wp_nonce_field( basename( __FILE__ ), 'footer_player_class_nonce' );
        ?>

        <p>
            <label for="sonaar_footer_player_meta"><?php _e( 'Display sticky player when page is loaded. Select playlist:', 'sonaar-music-pro' ); ?></label>
            <div id="sonaar_footer_player_wrapper">
                <select multiple name="sonaar_footer_player_meta[]" id="sonaar_footer_player_meta" style="width:100%">
                    <option value=""><?php _e( '- Select -', 'sonaar-music-pro' ); ?></option>
                    <?php
                    // Pre-load selected posts
                    if(!empty($current_values)) {
                        foreach ($current_values as $post_id) {
                            $post_title = get_the_title($post_id);
                            if($post_title) {
                                echo '<option value="' . esc_attr($post_id) . '" selected="selected">' . esc_html($post_title) . '</option>';
                            }
                        }
                    }
                    ?>
                </select>
            </div>
            <label for="footer-player-shuffle">
                <input type="checkbox" name="sonaar_footer_player_shuffle_meta" id="sonaar_footer_player_shuffle_meta" value="true" <?php checked(get_post_meta( $post->ID, 'sonaar_footer_player_shuffle_meta', true )); ?> >
                <?php _e( 'Enable Shuffle', 'sonaar-music-pro' );?>
            </label>
        </p>

        <script type="text/javascript">
            jQuery(document).ready(function($) {
                $('#sonaar_footer_player_meta').select2({
                    ajax: {
                        url: sonaar_admin_ajax.ajax.ajax_url,
                        dataType: 'json',
                        data: function (params) {
                            return {
                                q: params.term, // search term
                                action: 'get_posts_for_select' // AJAX action for the backend
                            };
                        },
                        processResults: function (data) {
                            return {
                                results: data
                            };
                        },
                        delay: 250
                    },
                    placeholder: '<?php echo esc_attr__('Search for a post', 'sonaar-music-pro'); ?>',
                    allowClear: true,
                    dropdownParent: $('#sonaar_footer_player_wrapper'),
                });
                
            });
        </script>
        <?php 
    }

    public function sonaar_save_meta( $post_id ) {
        // Check if the nonce is set and verify it.
        if (!isset($_POST['footer_player_class_nonce']) || !wp_verify_nonce($_POST['footer_player_class_nonce'], basename(__FILE__))) {
            return $post_id;
        }
        
        // If this is an autosave, do not update anything.
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return $post_id;
        }
        
        // Check the user's permissions.
        if (!current_user_can('edit_post', $post_id)) {
            return $post_id;
        }

        if(isset($_POST["sonaar_footer_player_meta"])){
            $meta_element_class = $_POST['sonaar_footer_player_meta'];
            update_post_meta($post_id, 'sonaar_footer_player_meta', $meta_element_class);
        } else {
            // delete the meta if nothing is selected
            delete_post_meta($post_id, 'sonaar_footer_player_meta');
        }

        if(isset($_POST["sonaar_footer_player_shuffle_meta"])){
            update_post_meta($post_id, 'sonaar_footer_player_shuffle_meta', true);
        } else {
            update_post_meta($post_id, 'sonaar_footer_player_shuffle_meta', false);
        }
    }

    public function enqueue_select2_scripts() {
        // Enqueue Select2 JS and CSS
        wp_enqueue_script( 'select2',  plugin_dir_url( __DIR__ ) . 'admin/js/select2.min.js', array( 'jquery' ), '4.1.0', true);
        wp_enqueue_style( 'select2', plugin_dir_url( __DIR__ ) . 'admin/css/select2.min.css' );
    }

    /* Meta box setup function. */
    public function sonaar_meta_boxes_setup() {
        if ( class_exists( 'Sonaar_Music' ) ){
            add_action( 'add_meta_boxes', array($this, 'sonaar_add_post_meta_boxes' ));
            add_action( 'save_post', array($this, 'sonaar_save_meta'), 10, 2);
            add_action( 'admin_enqueue_scripts', array($this, 'enqueue_select2_scripts' ));
            
        }
    }

     /* Register the meta box. */
     public function sonaar_add_post_meta_boxes() {
        add_meta_box(
            'meta-footer-player',      // Unique ID
            esc_html__( 'Sticky Audio Player', 'sonaar-music-pro' ), // Title
            array($this, 'footer_player_meta_box'), // Callback function
            $this->get_allowed_post_types(),  // Post types
            'side',  // Context
            'default'  // Priority
        );
    }

    /* Get all public post types, excluding attachments. */
    private function get_allowed_post_types() {
        $public_post_types = get_post_types(['public' => true]);
        unset($public_post_types['attachment']); // Exclude media post type
        return array_keys($public_post_types);   // Return the list of allowed post types
    }

    // -------------------  END META BOXES ----------------//


    public function generate_register_plugin_data() {
        if ( is_admin() ) {
            if( ! function_exists('get_plugin_data') ){
                require_once( ABSPATH . 'wp-admin/includes/plugin.php' );
            }
        }

        $plugin_info = get_plugin_data( SRMP3_DIRNAME );

        $this->registered_plugins_data = array(
            'name'       => $plugin_info['Name'],
            'slug'       => $this->plugin_name,
            'author'     => $plugin_info['Author'],
            'plugin_url' => $plugin_info['PluginURI'],
            'requires'   => '5.2',
            'banners'    => array(
                'high' => 'https://ps.w.org/mp3-music-player-by-sonaar/assets/banner-1544x500.jpg?rev=2569652',
                'low'  => 'https://ps.w.org/mp3-music-player-by-sonaar/assets/banner-1544x500.jpg?rev=2569652'
            ),
            'version'       => $plugin_info['Version'],
            'changelog'     => false,
        );
	}

    public function plugins_api_filter( $_data, $_action = '', $_args = null) {
		if ( 'plugin_information' !== $_action ) {
			return $_data;
		}
        if ( ! isset( $_args->slug ) || ( $_args->slug !== $this->plugin_name ) ) {
			return $_data;
		}

        $plugin_api_data = get_site_transient('srmp3_pro_api_request');
        //delete site_transient('srmp3_pro_api_request');

        if ( empty( $plugin_api_data ) ) {

            $changelog_remote_response = $this->changelog_remote_query();

			if ( ! $changelog_remote_response ) {
				return $_data;
			}

            $plugin_api_data = new \stdClass();

			$plugin_api_data->name =  $this->registered_plugins_data['name'];
			$plugin_api_data->slug = $this->registered_plugins_data['slug'];
			$plugin_api_data->author = $this->registered_plugins_data['author'];//'<a href="https://sonaar.io/">Sonaar.io</a>';
			$plugin_api_data->homepage = $this->registered_plugins_data['plugin_url'];//'https://sonaar.io/';
			$plugin_api_data->requires = $this->registered_plugins_data['requires'];
			$plugin_api_data->version = $this->registered_plugins_data['version'];
			//$plugin_api_data->download_link = $this->registered_plugins_data['download_link'];
			$plugin_api_data->banners = $this->registered_plugins_data['banners'];
            $plugin_api_data->sections = array(
				'changelog' =>  $changelog_remote_response,
			);
			

			// Expires in 1 day
			set_site_transient( 'srmp3_pro_api_request', $plugin_api_data, DAY_IN_SECONDS );
        }

        $_data = $plugin_api_data;
        return $_data;
    }

    public function changelog_remote_query() {
		$response = wp_remote_get('https://assets.sonaar.io/plugins/MP3-Music-Player-By-Sonaar-Pro/changelog.txt');

		if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) != '200' ) {
			return false;
		}

		$response = $response['body'];
          // Convert newlines to HTML line breaks
        $response = nl2br($response);

		return $response;
	}

    public function plugin_row_meta( $plugin_meta, $plugin_file, $plugin_data ) {		
        if ($plugin_file == PLUGIN_INSTALLATION_NAME) {
            $plugin_meta['view-details'] = sprintf(
                '<a href="%s" class="thickbox open-plugin-details-modal" aria-label="%s" data-title="%s">%s</a>',
                esc_url(
                    network_admin_url(
                        'plugin-install.php?tab=plugin-information&plugin=' . $this->plugin_name . '&TB_iframe=true&width=600&height=550'
                    )
                ),
                esc_attr(__('More information about Sonaar Music Pro', 'your-text-domain')), // Replace with your desired aria-label text
                esc_attr(__('Sonaar Music Pro Details', 'your-text-domain')), // Replace with your desired data-title text
                'View details'
            );
        }
		
		return $plugin_meta;
	}
    
    public function load_audioPreview_class(){
        if ( !is_admin() || !is_user_logged_in() || !class_exists( 'Sonaar_Music' )) {
            return;
        }

        $sonaar_music_licence = get_site_option('sonaar_music_licence');
        $srmp3_ecommerce = get_site_option('SRMP3_ecommerce');
        $purchasedPlan = get_site_option('SRMP3_purchased_plan');
        if ( !empty($sonaar_music_licence) && false !== $sonaar_music_licence && $srmp3_ecommerce == '1' && $purchasedPlan != false) {
            //here we need to check if license is active

            require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-sonaar-audiopreview.php';
            $srmp3_audio_preview = SRMP3_AudioPreview::getInstance();

            if(Sonaar_Music::get_option('force_audio_preview', 'srmp3_settings_audiopreview') === 'true'){
                function add_audiopreview_generate_bt_to_bulk_dropdown() {
                    global $post_type, $pagenow;
                    if ( $pagenow == 'edit.php' && (SR_PLAYLIST_CPT == $post_type || 'product' == $post_type)) {
                        ?>
                        <script type="text/javascript">
                            jQuery(document).ready(function() {
                                jQuery('<option>').val('generate_audiopreview').text('<?php _e('Generate Audio Preview')?>').appendTo("select[name='action']");
                                jQuery('<option>').val('generate_audiopreview').text('<?php _e('Generate Audio Preview')?>').appendTo("select[name='action2']");
                            });
                        </script>
                        <?php
                    }
                }
                add_action('admin_footer', 'add_audiopreview_generate_bt_to_bulk_dropdown');

                function redirect_generate_bt_to_settings( $redirect_to, $doaction, $post_ids ) {
                    //error_log($doaction);
                    if ( $doaction === 'generate_audiopreview' ) {
                        // Prepare the list of post IDs
                        $ids = join(',', $post_ids);
                        
                        // Redirect to your custom URL
                        $redirect_to = admin_url( "edit.php?post_type=sr_playlist&page=srmp3_settings_audiopreview&posts_in=" . $ids );
                        
                        return $redirect_to;
                    }
                    
                    return $redirect_to;
                }
                add_filter('handle_bulk_actions-edit-sr_playlist', 'redirect_generate_bt_to_settings', 10, 3);
                add_filter('handle_bulk_actions-edit-product', 'redirect_generate_bt_to_settings', 10, 3);
            }
      }  
    }
    /**
    * Register the stylesheets for the admin area.
    *
    * @since    1.0.0
    */
    public function enqueue_styles($hook) {
      
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
        if ( class_exists( 'Sonaar_Music' ) ){
            if ( $hook == SR_PLAYLIST_CPT . '_page_sonaar_music_pro' || $hook == SR_PLAYLIST_CPT . '_page_sonaar_music_pro_license' || $hook == 'post.php' || $hook=='post-new.php' || ($hook === 'edit.php' && isset($_GET['post_type']) && $_GET['post_type'] === 'sr_advanced_triggers') ) {
                wp_enqueue_style( 'daterangepicker', plugin_dir_url( dirname( __FILE__ ) ) . 'admin/css/daterangepicker.min.css', array(), '4.2.1', 'all' );
                wp_enqueue_style( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'css/sonaar-music-pro-admin.css', array('daterangepicker'), $this->version, 'all' );
            }
        }
    }
    
    /**
    * Register the JavaScript for the admin area.
    *
    * @since    1.0.0
    */
    public function enqueue_scripts($hook) {
        
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
        if ( class_exists( 'Sonaar_Music' ) ){
            if ($hook == SR_PLAYLIST_CPT . '_page_sonaar_music_pro' || $hook == SR_PLAYLIST_CPT . '_page_sonaar_music_pro_license' ) {
                wp_enqueue_script( 'vuejs', plugin_dir_url( __DIR__ ) . 'public/js/vue.min.js', array(), '2.6.14', false );
                wp_enqueue_script( 'polyfill', plugin_dir_url( __DIR__ ) . 'public/js/polyfill.min.js', array(), '6.26.0', false );
                wp_enqueue_script( 'bootstrap-vue', plugin_dir_url( __DIR__ ) . 'public/js/bootstrap-vue.min.js', array(), '2.21.2', false );
                wp_enqueue_script( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'js/sonaar-music-pro-admin.js', array( 'jquery','vuejs', 'polyfill', 'bootstrap-vue' ), $this->version, true );
                wp_enqueue_style( 'bootstrap-css', plugin_dir_url( __FILE__ ) . 'css/bootstrap.min.css', array(), '5.1.3', 'all' );
                wp_enqueue_style( 'bootstrapvue-css', plugin_dir_url( __FILE__ ) . 'css/bootstrap-vue.min.css', array(), $this->version, 'all' );
                
                wp_localize_script( $this->plugin_name, strtr($this->plugin_name, '-', '_'), array(
                    'licence' => get_site_option( 'sonaar_music_licence', '' ),
			        'SRMP3_purchased_plan' => esc_html(printPurchasedPlan()),
                ));
            }
            if ($hook == SR_PLAYLIST_CPT . '_page_sonaar_music_pro') {
                wp_enqueue_script( 'chart', plugin_dir_url( __DIR__ ) . 'public/js/Chart.min.js' , array(), '2.9.4', false );
                wp_enqueue_script( 'daterangepicker-moment', plugin_dir_url( __DIR__ ) . 'public/js/moment.min.js', array('jquery'), $this->version, false );
                wp_enqueue_script( 'daterangepicker', plugin_dir_url( __DIR__ ) . 'public/js/daterangepicker.min.js', array('jquery'), $this->version, false );
                
                $sonaar_data = new Sonaar_Music_Get;
                
                $date_start = ( isset( $_GET['date_start']) )? $_GET['date_start']: date('Y-m-d H:i:s', strtotime('today - 14 day'));
                $date_end = ( isset( $_GET['date_end']) )? $_GET['date_end']: date('Y-m-d H:i:s', strtotime('today'));
                $sonaar_data->set_date($date_start, $date_end);
                $date1 = new DateTime($sonaar_data->get_date()[0]);
                $date2 = new DateTime($sonaar_data->get_date()[1]);
                $interval = $date2->diff($date1);
                $interval = ( $interval->days < 2 )? 1 : $interval->days;
                
                $sonaar_data->set_interval($interval);
                
                $get_play_count_per_page = $sonaar_data->get_play_count_per_page();
                foreach ( $get_play_count_per_page as $i => $value ) {
                    $get_play_count_per_page[$i]->id = url_to_postid( $get_play_count_per_page[$i]->page_url );
                }
                
                $url = ( isset( $_GET['url']) && url_to_postid( $_GET['url'] ) )? $_GET['url']: false;
                
                $play_count_by_day = $sonaar_data->get_play_count_by_day($url) ;
                
                $get_play_count_per_track = $sonaar_data->get_play_count_per_track(array('url' => $url));
                $get_download_count_per_track = $sonaar_data->get_download_count_per_track(array('url' => $url));
                

                $dataDate = array();
                $dataCount = array();
                foreach ( $play_count_by_day as $play ) {
                    if ( !empty($play->date) ) {
                        array_push($dataDate, $play->date);
                    }
                    if ( !empty($play->play_count) ) {
                        array_push($dataCount, $play->play_count);
                    }
                }

                if( count( $dataDate ) == 1 )
                    array_push($dataDate, $dataDate[0]);
            
                if( count( $dataCount ) == 1 )
                    array_push($dataCount, $dataCount[0]);
                
                foreach ($get_play_count_per_track as $count) {
                    $count->track_title =  ( get_the_title( $count->target_url ) )? get_the_title( $count->target_url ): $count->target_title ;
                    $count->target_url = ( get_edit_post_link( $count->target_url ) )? admin_url( 'upload.php?item=' . $count->target_url ): FALSE;
                }

                foreach ($get_download_count_per_track as $count) {
                    $count->track_title =  ( get_the_title( $count->target_url ) )? get_the_title( $count->target_url ): $count->target_title ;
                    $count->target_url = ( get_edit_post_link( $count->target_url ) )? admin_url( 'upload.php?item=' . $count->target_url ): FALSE;
                }

                function get_total_track(){
                    $albums = new WP_Query( array(
                        'post_type' => SR_PLAYLIST_CPT,
                        'post_status' => 'publish',
                        'posts_per_page' => -1
                    ) );
                    $tracks = 0;
                    while ($albums->have_posts()) {
                        $albums->the_post();
                        $albumTracks = get_post_meta(get_the_id(),'alb_tracklist', true);
                        $tracks = (is_array($albumTracks)) ? $tracks + count($albumTracks) : 0;
                    }
                    return $tracks;
                }
                
                wp_localize_script( $this->plugin_name, strtr($this->plugin_name, '-', '_'), array(
                'get_play_count_by_day'=> $play_count_by_day,
                'get_play_count_per_page'=> $get_play_count_per_page,
                'get_play_count_per_track'=> $get_play_count_per_track,
                'get_download_count_per_track'=> $get_download_count_per_track,
                'totalPlay' => $sonaar_data->get_play_count($url),
                'totalDownload' => $sonaar_data->get_download_count($url),
                'totalTrack' => get_total_track(),
                'interval'=> array(
                    'start'=> $date1->format('m/d/Y'),
                    'end'=> $date2->format('m/d/Y')
                    ),
                'licence' => get_site_option( 'sonaar_music_licence', '' ),
                'SRMP3_purchased_plan' => get_site_option('SRMP3_purchased_plan'),
                ));              

            }
            
            wp_enqueue_script( $this->plugin_name. 'global', plugin_dir_url( __FILE__ ) . 'js/sonaar-music-pro-admin-global.js', array( 'jquery' ), $this->version, true );
		
            $locale_settings = array(
                'ajax_url' 		=> admin_url('admin-ajax.php'),
                'ajax_nonce' 	=> wp_create_nonce('sonaar_music_pro'),
                'option'        => Sonaar_Music::get_option( 'allOptions' )
            );
            wp_localize_script($this->plugin_name. 'global', 'sonaar_music_pro', $locale_settings);
        }
       
        
    }
private function fetch_meta_data($post_id, $generalfields, $taxonomies) {
    $processed_data = [];
    
    // Get the post title
    if (in_array('post_title', $generalfields)) {
        $post_title = get_the_title($post_id);
        if (!empty($post_title)) {
            $processed_data['post_title'] = sanitize_text_field($post_title);
        }
    }

    // Loop through the defined taxonomies and fetch terms
    if(is_array($taxonomies)){
        foreach ($taxonomies as $taxonomy) {
            $terms = wp_get_post_terms($post_id, $taxonomy);
            if (!empty($terms) && !is_wp_error($terms)) {
                $term_names = array_map(function($term) {
                    return $term->name;
                }, $terms);
                $processed_data[$taxonomy] = sanitize_text_field(implode(', ', $term_names));
            }
        }
    }

    if(function_exists('acf')){
        $acf_get_fields = Sonaar_Music::get_option('srtools_regenerate_acf_field', 'srmp3_settings_tools');
        if(is_array($acf_get_fields)){
            foreach ($acf_get_fields as $field) {
                $acf_field = get_field($field, $post_id);
                
                if (!empty($acf_field)) {
                    if (is_array($acf_field)) {
                        $processed_data['acf_' . $field] = sanitize_text_field(implode(', ', $acf_field));
                    } else {
                        $processed_data['acf_' . $field] = sanitize_text_field($acf_field);
                    }
                }
            }
        }
    }
    if ( function_exists('jet_engine') && jet_engine()->meta_boxes ) {
        $je_get_fields = Sonaar_Music::get_option('srtools_regenerate_jetengine_field', 'srmp3_settings_tools');
        if(is_array($je_get_fields)){
            foreach ($je_get_fields as $field) {
                $je_field = get_post_meta( $post_id,  $field, true );
                if (!empty($je_field)) {
                    if (is_array($je_field)) {
                        $processed_data['jetengine_' . $field] = sanitize_text_field(implode(', ', $je_field));
                    } else {
                        $processed_data['jetengine_' . $field] = sanitize_text_field($je_field);
                    }
                }
            }
        }
    }

    return $processed_data;
}

private function process_data_item($item, $generalfields, $post_id = null) {
    $temp_data = [];

    if (isset($item['track_mp3_id']) && !empty($item['track_mp3_id'])) {
        $attachment_title = get_the_title($item['track_mp3_id']);
        
        if (in_array('track_mp3_title', $generalfields)) {
            $temp_data['track_mp3_title'] = sanitize_text_field($attachment_title);
        }

        $metadata = wp_get_attachment_metadata($item['track_mp3_id']);
        if (in_array('track_mp3_length', $generalfields) && isset($metadata['length']) && !empty($metadata['length'])) {
            // set track duration in seconds
            update_post_meta( $post_id, 'srmp3_track_length', $metadata['length'] );
        }
        if (in_array('track_mp3_album', $generalfields) && isset($metadata['album']) && !empty($metadata['album'])) {
            $temp_data['track_mp3_album'] = sanitize_text_field($metadata['album']);
        }
        if (in_array('track_mp3_artist', $generalfields) && isset($metadata['artist']) && !empty($metadata['artist'])) {
            $temp_data['track_mp3_artist'] = sanitize_text_field($metadata['artist']);
        }
    }
    $new_fields = ['track_description', 'stream_title', 'stream_album', 'artist_name', 'stream_lenght'];
    foreach ($new_fields as $field) {
        if (in_array($field, $generalfields) && isset($item[$field]) && !empty($item[$field])) {
            if($field == 'stream_lenght'){
                // set track duration in seconds
                $timeInSeconds = $this->timeToSeconds($item['stream_lenght']);
                update_post_meta( $post_id, 'srmp3_track_length', $timeInSeconds );
            }else{
                $temp_data[$field] = sanitize_text_field($item[$field]);
            }
        }
    }

    return $temp_data;
}

public function srmp3_customize_cmb2_file_save( $override, $args ) {
    // If it's not our field, don't modify the value.
    if ( $args['field_id'] != 'alb_tracklist' ) {
        return $override;
    }

    $generalfields = Sonaar_Music::get_option('srtools_regenerate_generalfields', 'srmp3_settings_tools');
    $taxonomies = Sonaar_Music::get_option('srtools_regenerate_tax', 'srmp3_settings_tools');

    // Do not index! Check if both are not arrays and return $override
    if (!is_array($generalfields) || !is_array($taxonomies)) {
        return $override;
    }

    $post_id = $args['id'];
    $data = $args['value'];

    // Fetch metadata and process the main data
    $processed_data = $this->fetch_meta_data($post_id, $generalfields, $taxonomies);

    // Process each item in the data array
    foreach ($data as $index => $item) {
        $temp_data = $this->process_data_item($item, $generalfields, $post_id);
        if (!empty($temp_data)) {
            $processed_data[] = $temp_data;
        }
    }

    // Update the post meta with the processed data
    update_post_meta( $post_id, 'srmp3_search_data', $processed_data );

    return $override;
}
private function timeToSeconds($timeStr) {
    $parts = explode(":", $timeStr);
    $parts = array_map('intval', $parts);

    if (count($parts) === 3) { // HH:MM:SS format
        return $parts[0] * 3600 + $parts[1] * 60 + $parts[2];
    } elseif (count($parts) === 2) { // MM:SS format
        return $parts[0] * 60 + $parts[1];
    } else {
        return 0;
    }
}
public function index_alb_tracklist() {
    // Fetch generalfields and taxonomies once at the beginning
    $generalfields = Sonaar_Music::get_option('srtools_regenerate_generalfields', 'srmp3_settings_tools');
    $taxonomies = Sonaar_Music::get_option('srtools_regenerate_tax', 'srmp3_settings_tools');
      // Check if either is null and return if so
      if ($generalfields === null || $taxonomies === null) {
        echo json_encode([
            'message' => 'Error! Save this page first.',
            'progress' => 0,
            'completed' => true,
            'totalPosts' => 0,
            'processedPosts' => 0
        ]);
        wp_die();
    }
    // Arguments to get all products and sr_playlist posts with alb_tracklist meta key.
    $offset = isset($_POST['offset']) ? intval($_POST['offset']) : 0;
    $limit = 250; // Process 250 posts at a time. Adjust this value based on your needs.
    
    $args = array(
        'post_type' => Sonaar_Music_Admin::get_cpt($all = true),
        'meta_key'  => 'alb_tracklist',
        'posts_per_page' => $limit,
        'offset' => $offset,
    );

    $query = new WP_Query( $args );

    $totalPosts = $query->found_posts;
    $processedPosts = $offset;

    if ( $query->have_posts() ) {
        while ( $query->have_posts() ) {
            $query->the_post();
            $post_id = get_the_ID();
            $data = get_post_meta($post_id, 'alb_tracklist', true);

            if ($data && is_array($data)) {
                // Fetch metadata and process the main data
                 $processed_data = $this->fetch_meta_data($post_id, $generalfields, $taxonomies);

                // Process each item in the data array
                foreach ($data as $index => $item) {
                    $temp_data = $this->process_data_item($item, $generalfields, $post_id);
                    if (!empty($temp_data)) {
                        $processed_data[] = $temp_data;
                    }
                }

                // Update the post meta with the processed data
                //error_log("srmp3_search_data: " . print_r($processed_data, true));
                update_post_meta($post_id, 'srmp3_search_data', $processed_data);
                $processedPosts++;
            }
        }

        $progress = ($processedPosts / $totalPosts) * 100;
    }

    $response = array(
        'progress' => isset($progress) ? $progress : 0,  // Ensure that $progress is set
        'message' => '',
        'completed' => ($progress >= 100),
        'totalPosts' => $totalPosts,
        'processedPosts' => $processedPosts
    );

    // Reset post data.
    wp_reset_postdata();
    echo json_encode($response);
    wp_die();
}

    
    public function index_alb_tracklist_for_lazyload_ajax_handler() {
        if ( !class_exists( 'Sonaar_Music' ) ){
            return;
        }
        check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');
        $this->index_alb_tracklist();
        wp_die();
    }
    public function init_options() {
        if(get_site_option('SRMP3_ecommerce') == '1'){

            add_filter( 'cmb2_override_meta_save', array( $this, 'srmp3_customize_cmb2_file_save' ), 10, 2 );
       
            $advanced_trigger_enable = new_cmb2_box( array(
                'id'            => 'srp_advanced_triggers_enable_cmb2_box',
                'title'         => esc_html__('Enable Trigger', 'sonaar-music'),
                'classes'       => 'page_srmp3_settings',
                'object_types'  => 'sr_advanced_triggers',
                'context'       => 'normal',
                'priority'      => 'high',
                'show_names'    => true,
                'capability'    => 'manage_options',
            ) );
            
            $advanced_trigger_enable->add_field( array(
                'id'            => 'sr_advancedtriggers_enabled',
                'type'          => 'switch',
                'default'       => 'true',
            ) );


            $advanced_trigger = new_cmb2_box( array(
                'id'            => 'srp_advanced_triggers_cmb2_box',
                'title'         => esc_html__('Scenario', 'sonaar-music'),
                'classes'       => 'page_srmp3_settings',
                'object_types'  => 'sr_advanced_triggers',
                'context'       => 'normal',
                'priority'      => 'low',
                'show_names'    => true,
                'capability'    => 'manage_options',
            ) );
        
            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Trigger Type', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_trigger_type',
            ) );
            
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_type',
                'column' => array(
                    'position' => 2,
                    'name'     => esc_html__('Trigger','sonaar-music')
                ),
                'type'              => 'select',
                'show_option_none'  => esc_html__('-- Select Trigger --','sonaar-music'),
                'options'           => array(
                    'trim'              => esc_html__( 'Trim Audio Track', 'sonaar-music' ),
                    'popup_askemail'    => esc_html__( 'Ask for Email', 'sonaar-music' ),
                    'audio'             => esc_html__( 'Play Audio Roll', 'sonaar-music' ),
                    'watermark'         => esc_html__( 'Play Audio Watermark', 'sonaar-music' ),
                    'popup'             => esc_html__( 'Show Popup', 'sonaar-music' ),
                    'redirect'          => esc_html__( 'Redirect User to an URL', 'sonaar-music' ),
                    'scroll'            => esc_html__( 'Scroll to an Element', 'sonaar-music' ),
                ),
            ) );

            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Activate when', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_action_when',
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_action_when',
                'column' => array(
                    'position' => 3,
                    'name'     => esc_html__('When','sonaar-music')
                ),
                'type'              => 'select',
                'options'           => array(
                    'play'                      => esc_html__( 'Playing a Track', 'sonaar-music' ),
                    'downloadButtonClicked'     => esc_html__( 'Clicking on Download Button', 'sonaar-music' ),
                ),
                'attributes'  => array(
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => wp_json_encode( array( 'popup', 'popup_askemail', 'audio', 'watermark', 'redirect', 'scroll' ) ),
                    
                ),
                
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_reached_unit',
                'name'              => esc_html__('Has Reached', 'sonaar-music'),
                'classes'           => 'srmp3-settings--subitem',
                'type'              => 'select',
                'options'           => array(
                    'percent'         => esc_html__( 'Percentage (%)', 'sonaar-music' ),
                    'seconds'         => esc_html__( 'Time (HHMMSS)', 'sonaar-music' ),
                ),
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_action_when',
                                'value' => 'play'
                            ),
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array( 'popup', 'popup_askemail', 'audio', 'watermark', 'redirect', 'scroll' )
                            ),
                        ),
                    )),
                ),
                
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_reached_value',
                'name'              => esc_html__('Trigger at', 'sonaar-music'),
                'classes'           => 'srmp3-settings--subitem',
                'type'              => 'text_small',
                'default'           => 0,
                'column' => array(
                    'position' => 4,
                    'name'     => esc_html__('Reached','sonaar-music')
                ),
                'attributes'        => array(
                    'type' => 'number',
                    'pattern' => '\d*',
                    'placeholder'            => '10',
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_action_when',
                                'value' => 'play'
                            ),
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array( 'popup', 'popup_askemail', 'audio', 'watermark', 'redirect', 'scroll' )
                            ),
                        ),
                    )),
                ),
            ) );
            
            
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_is_required',
                'name'          => esc_html__('Keep Triggering for Remaining Time', 'sonaar-music'),
                'type'          => 'switch',
                'classes'       => 'srmp3-settings--subitem srmp3-settings--subitem2',
                'default'       => 'false',
                'after'         => 'srmp3_add_tooltip_to_label',
                'tooltip'       => array(
                    'text'      => esc_html__('The trigger activates at the value specified above. Enable this option to activate the trigger even when the user skips ahead.', 'sonaar-music'),
                ),
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_action_when',
                                'value' => 'play'
                            ),
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array( 'popup', 'popup_askemail', 'audio', 'redirect', 'scroll' )
                            ),
                        ),
                    )),
                ),
            ) );





            
            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Popup Type', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_popup_hook',
            ) );

            $options = array(
                //'askForEmail' => esc_html__( 'Ask for an Email', 'sonaar-music' ),
                'custom'      => esc_html__( 'Custom Popup', 'sonaar-music' ),
            );


            // Check if Elementor is activated
            if (did_action('elementor/loaded')) {
                $options['elementorPopup'] = esc_html__( 'Elementor Popup', 'sonaar-music' );
            }
            
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_popup_hook',
                'type'              => 'select',
                'options'           => $options,
                'attributes' => array(
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => 'popup',
                ),
            ) );
        
            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Preview Durations', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_trim_times',
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_start_time',
                'name'              => esc_html__('Start Audio at', 'sonaar-music'),
                'type'              => 'text_small',           
                'attributes'        => array(
                    'type' => 'number',
                    'pattern' => '\d*',
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => 'trim',
                ),
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_audio_duration',
                'name'              => esc_html__('Audio Duration', 'sonaar-music'),
                'type'              => 'text_small',
                'attributes'        => array(
                    'type' => 'number',
                    'pattern' => '\d*',
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => 'trim',
                ),
            ) );
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_trim_fadein',
                'name'          => esc_html__('Add Fade-in', 'sonaar-music'),
                'type'          => 'switch',
                'default'       => 'true',
                'attributes'    => array(
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => wp_json_encode( array( 'trim' ) ),
                ),
            ) );
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_trim_fadeout',
                'name'          => esc_html__('Add Fade-out', 'sonaar-music'),
                'type'          => 'switch',
                'default'       => 'true',
                'attributes'    => array(
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => wp_json_encode( array( 'trim' ) ),
                ),
            ) );



            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Ask For Email', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_popup_askforemail',
            ) );
        
            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Ask for Email Form Title', 'sonaar-music'),
                'id'            => 'download_settings_afe_form_title',
                'type'          => 'text_medium',
                'default'       => esc_html__('Unlock Your Free Download', 'sonaar-music'),
                'after'         => 'srmp3_add_tooltip_to_label',
                'tooltip'       => array(
                    'text'      => esc_html__('Main title of the user\'s form', 'sonaar-music'),
                    'pro'       => true,
                ),
                'attributes'    => array(
                    'placeholder'               => esc_html__( 'Unlock Your Free Download', 'sonaar-music' ),
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array( 'popup_askemail' )
                            ),
                        ),
                    )),
                ),
            ) );
            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Ask for Email Form Description', 'sonaar-music'),
                'id'            => 'download_settings_afe_form_desc',
                'classes'       => 'srmp3-settings--subitem',
                'type'          => 'wysiwyg',
                'default'       => __('Enter your email address and full name to unlock your free download. We will send the <strong>{{track_title}}</strong>\'s file to your email address.', 'sonaar-music'),
                'after'         => 'srmp3_add_tooltip_to_label',
                'after_field'  => '<input type="hidden" data-conditional=\'{"logic":"AND","conditions":[{"id":"sr_advancedtriggers_type","value":"popup_askemail"}]}\' />',
                'tooltip'       => array(
                    'text'      => esc_html__('Sub heading of the user\'s form. You can use also the following dynamic variables: {{track_title}}', 'sonaar-music'),
                    'pro'       => true,
                ),
                'options' => array(
                    'textarea_rows' => get_option('default_post_edit_rows', 5),
                    'media_buttons' => false,
                ),
            ) );
            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Ask for Email Form', 'sonaar-music'),
                'id'            => 'download_settings_afe_form_markup',
                'classes'       => 'srmp3-settings--subitem',
                'type'          => 'textarea_code',
                'default'       => __('
<p>
<label for="user_firstname">First Name:</label>
<input type="text" id="user_firstname" name="user_firstname" required>
<label for="user_lastname">Last Name:</label>
<input type="text" id="user_lastname" name="user_lastname" required>
<label for="user_email">Email Address:</label>
<input type="email" id="user_email" name="user_email" required>
</p>
<p>
<button type="submit" class="button alt">Send</button>
</p>', 'sonaar-music'),
            'after'         => 'srmp3_add_tooltip_to_label',   
            'tooltip'       => array(
                    'text'      => esc_html__('Customize the form. You can use also the following dynamic variables: {track_title}, {post_id}, {image_src}', 'sonaar-music'),
                    'pro'       => true,
            ),
            'attributes'    => array(
                'data-conditional' => wp_json_encode(array(
                    'logic' => 'AND', // Could be 'OR'
                    'conditions' => array(
                        array(
                            'id'    => 'sr_advancedtriggers_type',
                            'value' => array( 'popup_askemail' )
                        ),
                    ),
                )),
            ),
            ));
            $advanced_trigger->add_field( array(
                'name'          => esc_html__('How to deliver the download file?', 'sonaar-music'),
                'id'            => 'download_settings_afe_deliver_method',
                'type'          => 'select',
                'options' 						=> [
                    'direct_download' 			=> __( 'Direct Download', 'sonaar-music' ),
                    'send_email' 			    => __( 'Send by Email', 'sonaar-music' ),
                ],
                'default'       => 'direct_download',
                'after'         => 'srmp3_add_tooltip_to_label',
                'tooltip'       => array(
                    'text'      => esc_html__('When the user fill the form, how do you want the file to be delivered?', 'sonaar-music'),
                    'pro'       => true,
                ),
                'attributes'    => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array( 'popup_askemail' )
                            ),
                        ),
                    )),
                ),
            ) );
            $advanced_trigger->add_field( array(
                'name'    => esc_html__('Form Success Notice', 'sonaar-music'),
                'id'      => 'download_settings_afe_direct_download_markup',
                'classes'       => 'srmp3-settings--subitem',
                'type'    => 'wysiwyg',
                'after_field'  => '<input type="hidden" data-conditional=\'{"logic":"AND","conditions":[{"id":"sr_advancedtriggers_type","value":"popup_askemail"},{"id":"download_settings_afe_deliver_method","value":["direct_download"]}]}\' />',
                'default' => __( '<h3>Thank you {{user_firstname}},</h3>
            
                    Here is your free download link for <strong>{{track_title}}</strong>

                    <a class="srp_button" href="{{download_link}}" target="_blank" rel="noopener">Download Now</a>
                    
                    ', 'sonaar-music' ),
                'options' => array(
                    'textarea_rows' => get_option('default_post_edit_rows', 10),
                    'media_buttons' => false,
                ),
                'desc'    => '<strong>{{track_title}}</strong> - ' . __('Track Title of the Download File', 'sonaar-music') . '<br>
                <strong>{{download_link}}</strong> - ' . __('The Download URL', 'sonaar-music') . '<br>
                <strong>{{user_email}}</strong> - ' . __('The Email of the user', 'sonaar-music') . '<br>
                <strong>{{user_firstname}}</strong> - ' . __('User first name', 'sonaar-music') . '<br>
                <strong>{{user_lastname}}</strong> - ' . __('User last name', 'sonaar-music') . '<br>
                <strong>{{admin_firstname}}</strong> - ' . __('First name of the admin.', 'sonaar-music') . '<br>
                <strong>{{admin_lastname}}</strong> - ' . __('Last name of the admin.', 'sonaar-music') . '<br>
                <strong>{{admin_email}}</strong> - ' . __('Admin Email Address.', 'sonaar-music') . '<br>
                <strong>{{website_url}}</strong> - ' . __('The URL of your Website', 'sonaar-music') . '<br>
                <strong>{{website_name}}</strong> - ' . __('The name of your website.', 'sonaar-music'),
            ) );
            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Form Success Notice', 'sonaar-music'),
                'id'            => 'download_settings_afe_success_email',
                'classes'       => 'srmp3-settings--subitem',
                'type'          => 'wysiwyg',
                'after'         => 'srmp3_add_tooltip_to_label',
                'after_field'  => '<input type="hidden" data-conditional=\'{"logic":"AND","conditions":[{"id":"sr_advancedtriggers_type","value":"popup_askemail"}, {"id":"download_settings_afe_deliver_method","value":["send_email"]}]}\' />',
                'default'       => __('<h3>Thanks {{user_firstname}},</h3>

                We\'ve just sent the download link to your email address.', 'sonaar-music'),
                'options' => array(
                    'textarea_rows' => get_option('default_post_edit_rows', 3),
                    'media_buttons' => false,
                ),
                'desc'    => '<strong>{{track_title}}</strong> - ' . __('Track Title of the Download File', 'sonaar-music') . '<br>
                <strong>{{download_link}}</strong> - ' . __('The Download URL', 'sonaar-music') . '<br>
                <strong>{{user_email}}</strong> - ' . __('The Email of the user', 'sonaar-music') . '<br>
                <strong>{{user_firstname}}</strong> - ' . __('User first name', 'sonaar-music') . '<br>
                <strong>{{user_lastname}}</strong> - ' . __('User last name', 'sonaar-music') . '<br>
                <strong>{{admin_firstname}}</strong> - ' . __('First name of the admin.', 'sonaar-music') . '<br>
                <strong>{{admin_lastname}}</strong> - ' . __('Last name of the admin.', 'sonaar-music') . '<br>
                <strong>{{admin_email}}</strong> - ' . __('Admin Email Address.', 'sonaar-music') . '<br>
                <strong>{{website_url}}</strong> - ' . __('The URL of your Website', 'sonaar-music') . '<br>
                <strong>{{website_name}}</strong> - ' . __('The name of your website.', 'sonaar-music'),
                'tooltip'       => array(
                    'text'      => esc_html__('Notice to the user when the form has successfully been sent', 'sonaar-music'),
                    'pro'       => true,
                ),
            ) );
            $advanced_trigger->add_field( array(
                'name'    => esc_html__('Email Subject', 'sonaar-music'),
                'id'      => 'download_settings_afe_email_subject',
                'classes' => 'srmp3-settings--subitem',
                'type'    => 'text',
                'default' => esc_html__('Download Link of {{track_title}}', 'sonaar-music'),
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array( 'popup_askemail' )
                            ),
                            array(
                                'id'    => 'download_settings_afe_deliver_method',
                                'value' => array( 'send_email' )
                            ),
                        ),
                    )),
                ),
            ) );
            $advanced_trigger->add_field( array(
                'name'    => esc_html__('Email Markup', 'sonaar-music'),
                'id'      => 'download_settings_afe_email_markup',
                'classes' => 'srmp3-settings--subitem',
                'type'    => 'wysiwyg',
                'desc'    => '<strong>{{track_title}}</strong> - ' . __('Track Title of the Download File', 'sonaar-music') . '<br>
                <strong>{{download_link}}</strong> - ' . __('The Download URL', 'sonaar-music') . '<br>
                <strong>{{user_email}}</strong> - ' . __('The email of the user', 'sonaar-music') . '<br>
                <strong>{{user_firstname}}</strong> - ' . __('User first name', 'sonaar-music') . '<br>
                <strong>{{user_lastname}}</strong> - ' . __('User last name', 'sonaar-music') . '<br>
                <strong>{{admin_firstname}}</strong> - ' . __('First name of the admin.', 'sonaar-music') . '<br>
                <strong>{{admin_lastname}}</strong> - ' . __('Last name of the admin.', 'sonaar-music') . '<br>
                <strong>{{admin_email}}</strong> - ' . __('Admin Email Address', 'sonaar-music') . '<br>
                <strong>{{website_url}}</strong> - ' . __('The URL of your Website', 'sonaar-music') . '<br>
                <strong>{{website_name}}</strong> - ' . __('The name of your website.', 'sonaar-music'),
                'after_field'  => '<input type="hidden" data-conditional=\'{"logic":"AND","conditions":[{"id":"sr_advancedtriggers_type","value":"popup_askemail"},{"id":"download_settings_afe_deliver_method","value":["send_email"]}]}\' />',
                'options' => array(
                    'textarea_rows' => get_option('default_post_edit_rows', 20), // rows="..."
                ),
                
                'default' => __( 'Hello {{user_firstname}},
            
            Thank you for providing your email. Here is your free download link for <strong>{{track_title}}</strong><br>
            <a href="{{download_link}}" download>Download Now</a>
            <br><br>
            Enjoy!
            <br>
            {{admin_firstname}} {{admin_lastname}}
            <a href="{{website_url}}" download>{{website_name}}</a>
            ', 'sonaar-music' )
            ) );



            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Custom Popup', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_popup_custom',
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_popup_hook_custom',
                'type'              => 'wysiwyg',
                'after_field'  => '<input type="hidden" data-conditional=\'{"logic":"AND","conditions":[{"id":"sr_advancedtriggers_type","value":"popup"},{"id":"sr_advancedtriggers_popup_hook","value":"custom"}]}\' />',
                'default' => __( '<h3>Content Restricted</h3>
                            
                                    This content is restricted to member only.

                                    <a class="srp_button" href="#" target="_blank" rel="noopener">Subscribe Now</a>
                                    
                                    ', 'sonaar-music' ),
                'options' => array(
                    'textarea_rows' => get_option('default_post_edit_rows', 15),
                    'media_buttons' => false,
                ),
                'desc'    => 'You can include the following dynamic variables:<br>
                <strong>{{track_title}}</strong> - ' . Sonaar_Music_Admin::sr_GetString('Track Title') . '<br>
                <strong>{{album_title}}</strong> - ' . Sonaar_Music_Admin::sr_GetString('Track Album') . '<br>
                <strong>{{artist_name}}</strong> - ' . Sonaar_Music_Admin::sr_GetString('Artist Name') . '<br>
                <strong>{{cover_img}}</strong> - ' . Sonaar_Music_Admin::sr_GetString('Playlist Cover Image'),
            ) );

            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Select an Elementor Popup', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_popup_elementorPopup',
            ) );
            
            $advanced_trigger->add_field(array(
                'id'              => 'sr_advancedtriggers_popup_hook_elementor',
                'type'            => 'sr_post_search_ajax',
                'select_behavior' => 'replace', // could be 'add'
                'post_type'       => array('elementor_library'),//Sonaar_Music_Admin::get_cpt($all = true),//array('elementor_library'),
                'meta_query'      => [
                    [
                        'key'   => '_elementor_template_type',
                        'value' => 'popup',
                    ],
                ],
                'attributes'      => array(
                    'data-conditional-id'    => 'sr_advancedtriggers_popup_hook',
                    'data-conditional-value' => 'elementorPopup',
                ),
            ));

            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Audio Roll', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_box_audio',
            ) );
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_audio',
                'description'   => esc_html__('Recommended Format: MP3 file encoded at 320kbps with sample rate of 44.1kHz','sonaar-music'),
                'type'          => 'file',
                'text'              => array(
                    'add_upload_file_text' => esc_html__('Upload Audio Roll MP3', 'sonaar-music'), // Change upload button text. Default: "Add or Upload File"
                ),
                'query_args'    => array(
                    'type'          => 'audio',
                ),
                'options' => array(
                    'url' => false, // Hide the text input for the url
                ),
                'attributes' => array(
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => 'audio',
                ),
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_message',
                'name'              => esc_html__('Display text overlay while Audio Roll is playing', 'sonaar-music'),
                'classes'           => 'srmp3-settings--subitem',
                'desc'              => esc_html__('Eg.: Playback will resume after this message. Leave blank if no overlay wanted', 'sonaar-music'),
                'type'              => 'text',
                'attributes'        => array(
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => 'audio',
                ),
                
            ) );
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_lock_control',
                'name'          => esc_html__('Lock player controls while Audio Roll is playing', 'sonaar-music'),
                'classes'           => 'srmp3-settings--subitem',
                'type'          => 'switch',
                'default'       => 'false',
                'attributes'    => array(
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => wp_json_encode( array( 'audio' ) ),
                ),
            ) );

            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Audio Watermark', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_watermark',
            ) );
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_watermark',
                'description'   => esc_html__('Recommended Format: MP3 file encoded at 320kbps with sample rate of 44.1kHz','sonaar-music'),
                'type'          => 'file',
                'text'              => array(
                    'add_upload_file_text' => 'Upload Watermark MP3' // Change upload button text. Default: "Add or Upload File"
                ),
                'query_args'    => array(
                    'type'          => 'audio',
                ),
                'options' => array(
                    'url' => false, // Hide the text input for the url
                ),
                
                'attributes' => array(
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => 'watermark',
                ),
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_loopGap',
                'name'              => esc_html__('Player Sample Every', 'sonaar-music'),
                'classes'           => 'srmp3-settings--subitem',
                'desc'              => esc_html__('seconds', 'sonaar-music'),
                'type'              => 'text_small',
                'default'           => 10,
                'attributes'        => array(
                    'type' => 'number',
                    'pattern' => '\d*',
                    'placeholder'            => '10',
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => 'watermark',
                ),
            ) );

            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Redirection', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_redirection',
            ) );
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_redirect_url',
                'name'          => esc_html__('Redirection URL', 'sonaar-music'),
                'type'          => 'text_medium',
                'attributes'    => array(
                    'placeholder'            => 'https://yourdomain.com/login',
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => wp_json_encode( array( 'redirect' ) ),
                ),
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_target',
                'name'              => esc_html__('Target', 'sonaar-music'),
                'classes'           => 'srmp3-settings--subitem',
                'type'              => 'select',
                'options'           => array(
                    '_blank'           => esc_html__( 'Open in New Window', 'sonaar-music' ),
                    '_self'             => esc_html__( 'Open in Same Window', 'sonaar-music' ), 
                ),
                'attributes'    => array(
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => wp_json_encode( array( 'redirect' ) ),
                ),
            ) );
            
            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Scroll to', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_scroll_to',
            ) );
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_scroll_to',
                'name'          => esc_html__('CSS ID', 'sonaar-music'),
                'type'          => 'text_medium',
                'attributes'    => array(
                    'placeholder'            => '#id_to_scroll_to',
                    'data-conditional-id'    => 'sr_advancedtriggers_type',
                    'data-conditional-value' => wp_json_encode( array( 'scroll' ) ),
                ),
            ) );

            $advanced_trigger->add_field( array(
                'name'          => esc_html__('If User', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_applyfor',
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_applyfor',
                'column' => array(
                    'position' => 5,
                    'name'     => esc_html__('If Visitor','sonaar-music')
                ),
                'type'              => 'select',
                'options'           => array(
                    'everybody'         => esc_html__( 'Is Anyone', 'sonaar-music' ),
                    'logged_in'         => esc_html__( 'Is Logged In', 'sonaar-music' ),
                    'logged_out'        => esc_html__( 'Is Logged Out', 'sonaar-music' ),
                    'user_role'         => esc_html__( 'Has User Roles', 'sonaar-music' ),
                ),
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'watermark', 'audio', 'trim', 'redirect', 'scroll')
                            ),
                        ),
                    )),
                ),
            ) );
            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Role is', 'sonaar-music'),
                'classes'       => 'srmp3-settings--subitem',
                'id'            => 'sr_advancedtriggers_user_role_is',
                'type'          => 'multicheck',
                'options'       => Sonaar_Music::get_user_roles(),
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'watermark', 'audio', 'trim', 'redirect', 'scroll')
                            ),
                            array(
                                'id'    => 'sr_advancedtriggers_applyfor',
                                'value' => array('user_role')
                            ),
                        ),
                    )),
                ),
                'default'       => ''
            ) );


            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Target Players', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_applyon',
            ) );
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_selector',
                'column' => array(
                    'position' => 6,
                    'name'     => esc_html__('Apply On','sonaar-music')
                ),
                'type'              => 'select',
                'options'           => array(
                    'allplayers'            => esc_html__( 'All Players on your website', 'sonaar-music' ),
                    'specific_players'      => esc_html__( 'Players within Specific Pages', 'sonaar-music' ),
                    'css_selector'          => esc_html__( 'Players within CSS Selectors', 'sonaar-music' ), 
                ),
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'watermark', 'audio', 'trim', 'redirect', 'scroll')
                            ),
                        ),
                    )),
                ),
            ) );

            $advanced_trigger->add_field(array(
                'id'              => 'sr_advancedtriggers_specific_players_ids',
                'name'              => esc_html__( 'Select Page(s)', 'sonaar-music'),
                'classes'           => 'srmp3-settings--subitem',
                'desc'          => esc_html__('Enter a comma separated list of playlist IDs. Click Select Button to search for playlist','sonaar-music'),
                'type'            => 'sr_post_search_ajax',
                'select_behavior' => 'add', // could be 'add'
                'post_type'       => 'any',//Sonaar_Music_Admin::get_cpt($all = true),//array('elementor_library'),
                'attributes'  => array(
                    'required' => 'required',

                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'watermark', 'audio', 'trim', 'redirect', 'scroll')
                            ),
                            array(
                                'id'    => 'sr_advancedtriggers_selector',
                                'value' => array('specific_players')
                            ),
                        ),
                    )),
                ),
            ));

            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_css_selector_value',
                'name'              => esc_html__('CSS Selector(s)', 'sonaar-music'),
                'classes'           => 'srmp3-settings--subitem',
                'desc'              => esc_html__('Eg: .page-id-123, #section-id, .term-68', 'sonaar-music'),
                'type'              => 'text',
                'column' => array(
                    'position' => 7,
                    'name'     => esc_html__('CSS Selector','sonaar-music')
                ),

                'attributes'  => array(
                    'placeholder'            => '.page-id-123, #section-id-456',
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'watermark', 'audio', 'trim', 'redirect', 'scroll')
                            ),
                            array(
                                'id'    => 'sr_advancedtriggers_selector',
                                'value' => array('css_selector')
                            ),
                        ),
                    )),
                ),
            ) );
        
            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_tracks',
                'name'              => esc_html__('Target only the following post tracks:', 'sonaar-music'),
                'classes'           => 'srmp3-settings--subitem',
                'description'       => esc_html__('Do you want to aim any specific track? Leave blank to trigger on all tracks found', 'sonaar-music'),
                'type'              => 'sr_post_search_ajax',
                'post_type'         => Sonaar_Music_Admin::get_cpt($all = true),
                'desc'              => esc_html__('Enter a comma separated list of playlist IDs. Click Select Button to search for playlist','sonaar-music'),
                'select_behavior'   => 'add',
                'column' => array(
                    'position' => 8,
                    'name'     => esc_html__('Tracks','sonaar-music')
                ),
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'watermark', 'audio', 'trim', 'redirect', 'scroll')
                            ),
                        ),
                    )),
                ),
            ) );

            $advanced_trigger->add_field( array(
                'id'                => 'sr_advancedtriggers_exclude_css_selector_value',
                'name'              => esc_html__('Exclude player(s) within these CSS selector(s)', 'sonaar-music'),
                'classes'           => 'srmp3-settings--subitem',
                'desc'              => esc_html__('Eg: .page-id-123, #section-id, .term-68', 'sonaar-music'),
                'type'              => 'text',
                'attributes'  => array(
                    'placeholder'            => '.page-id-123, #section-id-456',
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'watermark', 'audio', 'trim', 'redirect', 'scroll')
                            ),
                        ),
                    )),
                ),
            ) );


            $advanced_trigger->add_field( array(
                'name'          => esc_html__('Additional Options', 'sonaar-music'),
                'type'          => 'title',
                'id'            => 'srp_advanced_triggers_title_advanced_rules',
            ) );
           
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_pause_player',
                'name'          => esc_html__('Pause the player if its currently playing', 'sonaar-music'),
                'type'          => 'switch',
                'default'       => 'false',
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'audio', 'redirect', 'scroll')
                            ),
                        ),
                    )),
                ),
            ) );
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_rememberAndDontShowAgainIfAlreadySubmitted',
                'name'          => esc_html__('Do not trigger again if user already submitted his email address', 'sonaar-music'),
                'type'          => 'switch',
                'default'       => 'false',
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup_askemail')
                            ),
                        ),
                    )),
                ),
            ) );
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_rememberAndDontShowAgainForThisTrackUntilPageRefresh',
                'name'          => esc_html__('Do not trigger again for this TRACK until the page refresh', 'sonaar-music'),
                'type'          => 'switch',
                'default'       => 'false',
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_action_when',
                                'value' => 'play'
                            ),
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'audio', 'redirect', 'scroll')
                            ),
                            array(
                                'id'    => 'sr_advancedtriggers_rememberAndDontShowAgainIfAlreadySubmitted',
                                'value' => 'false'
                            ),
                        ),
                    )),
                ),
            ) );

            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_rememberAndDontShowAgainForThisPlayerUntilPageRefresh',
                'name'          => esc_html__('Do not trigger again on the PLAYER until the page refresh', 'sonaar-music'),
                'type'          => 'switch',
                'default'       => 'false',
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_action_when',
                                'value' => 'play'
                            ),
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'audio', 'redirect', 'scroll')
                            ),
                            array(
                                'id'    => 'sr_advancedtriggers_rememberAndDontShowAgainIfAlreadySubmitted',
                                'value' => 'false'
                            ),
                        ),
                    )),
                ),
            ) );

            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_apply_max_time',
                'name'          => esc_html__('Trigger maximum of X times', 'sonaar-music'),
                'description'   => esc_html__('Example: If you want an Audio Ad to play 3 times, set the value to 3. After 3 ads, the Audio Roll will not play again for this user.', 'sonaar-music'),
                //'classes'       => 'srmp3-settings--subitem srmp3-settings--subitem2',
                'type'          => 'text_small',
                'attributes'  => array(
                    'type' => 'number',
                    'pattern' => '\d*',
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'watermark', 'audio', 'trim', 'redirect', 'scroll')
                            ),
                        ),
                    )),
                ),
            ) );
            
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_apply_after',
                'name'          => esc_html__('Trigger after X times', 'sonaar-music'),
                'description'   => esc_html__('Example: If you want to offer 3 free downloads per day, set the value to 3. After 3 free downloads, a popup will be triggered and lock the download', 'sonaar-music'),
                //'classes'       => 'srmp3-settings--subitem srmp3-settings--subitem2',
                'type'          => 'text_small',
                'attributes'  => array(
                    'type' => 'number',
                    'pattern' => '\d*',
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'watermark', 'audio', 'trim', 'redirect', 'scroll')
                            ),
                        ),
                    )),
                ),
            ) );
            $advanced_trigger->add_field( array(
                'id'            => 'sr_advancedtriggers_apply_timespan',
                'name'          => esc_html__('per', 'sonaar-music'),
                'classes'       => 'srmp3-settings--subitem',
                'type'          => 'select',
                'options'       => array(
                    'persistent'    => esc_html__( 'Persisting', 'sonaar-music' ),
                    'minute'        => esc_html__( 'Minute', 'sonaar-music' ),
                    'hour'          => esc_html__( 'Hour', 'sonaar-music' ),
                    'day'           => esc_html__( 'Day', 'sonaar-music' ),
                    'week'          => esc_html__( 'Week', 'sonaar-music' ),
                    'month'         => esc_html__( 'Month', 'sonaar-music' ),
                ),
                'attributes'  => array(
                    'data-conditional' => wp_json_encode(array(
                        'logic' => 'AND', // Could be 'OR'
                        'conditions' => array(
                            array(
                                'id'    => 'sr_advancedtriggers_type',
                                'value' => array('popup', 'popup_askemail', 'watermark', 'audio', 'trim', 'redirect', 'scroll')
                            ),
                        ),
                    )),
                ),
            ) );
        }
        
        
		if ( class_exists( 'Sonaar_Music' )) {
            if (Sonaar_Music::get_option('srmp3_use_built_in_stats', 'srmp3_settings_stats')=='true'){
                $cmb_options = new_cmb2_box( array(
                'id'           		=> 'sonaar_music_pro_network_option_metabox',
                'title'        		=> esc_html__( 'Sonaar Music', 'sonaar-music-pro' ),
                'object_types' 		=> array( 'options-page' ),
                'option_key'      	=> 'sonaar_music_pro', // The option key and admin menu page slug.
                'icon_url'        	=> 'dashicons-palmtree', // Menu icon. Only applicable if 'parent_slug' is left empty.
                'menu_title'      	=> esc_html__( 'Statistics', 'sonaar-music-pro' ), // Falls back to 'title' (above).
                'parent_slug'     	=> 'edit.php?post_type=' . SR_PLAYLIST_CPT, // Make options page a submenu item of the themes menu.
                'capability'      	=> 'manage_options', // Cap required to view options-page.
                'enqueue_js' 		=> false,
                'cmb_styles' 		=> false,
                'display_cb'		=> 'sonaar_music_pro_admin_display',
                'position' 			=> 9999,
                ) );
            }
            $cmb_tools_options = new_cmb2_box( array(
                'id'           		=> 'sonaar_music_pro_tools_network_option_metabox',
                'title'        		=> esc_html__( 'Sonaar Music', 'sonaar-music-pro' ),
                'object_types' 		=> array( 'options-page' ),
                'option_key'      	=> 'sonaar_music_pro_tools', // The option key and admin menu page slug.
                'icon_url'        	=> 'dashicons-palmtree', // Menu icon. Only applicable if 'parent_slug' is left empty.
                'menu_title'      	=> esc_html__( 'Tools', 'sonaar-music-pro' ), // Falls back to 'title' (above).
                'parent_slug'     	=> 'edit.php?post_type=' . SR_PLAYLIST_CPT, // Make options page a submenu item of the themes menu.
                'capability'      	=> 'manage_options', // Cap required to view options-page.
                'enqueue_js' 		=> false,
                'cmb_styles' 		=> false,
                'display_cb'		=> 'sonaar_music_pro_tools_admin_display',
                'position' 			=> 9999,
            ) );
            $cmb_options_license = new_cmb2_box( array(
                'id'           		=> 'sonaar_music_pro_license_network_option_metabox',
                'title'        		=> esc_html__( 'Sonaar Music', 'sonaar-music-pro' ),
                'object_types' 		=> array( 'options-page' ),
                'option_key'      	=> 'sonaar_music_pro_license', // The option key and admin menu page slug.
                'icon_url'        	=> 'dashicons-palmtree', // Menu icon. Only applicable if 'parent_slug' is left empty.
                'menu_title'      	=> esc_html__( 'License', 'sonaar-music-pro' ), // Falls back to 'title' (above).
                'parent_slug'     	=> 'edit.php?post_type=' . SR_PLAYLIST_CPT, // Make options page a submenu item of the themes menu.
                'capability'      	=> 'manage_options', // Cap required to view options-page.
                'enqueue_js' 		=> false,
                'cmb_styles' 		=> false,
                'display_cb'		=> 'sonaar_music_pro_license_admin_display',
                'position' 			=> 9999,
            ) );
            
            function sonaar_music_pro_tools_admin_display() {
                require_once plugin_dir_path( __FILE__ ) . 'partials/sonaar-music-pro-tools-display.php';
            }
            
            
            function sonaar_music_pro_admin_display(){       
                if (Sonaar_Music::get_option('srmp3_use_built_in_stats', 'srmp3_settings_stats')!=='true'){
                    return;
                }
                require_once plugin_dir_path( __FILE__ ) . 'partials/sonaar-music-pro-admin-display.php';
            }
            
            function sonaar_music_pro_license_admin_display(){
                require_once plugin_dir_path( __FILE__ ) . 'partials/sonaar-music-pro-license-admin-display.php';
            }
        }
    }








    public function srp_collectemail_register_post_type() {
        $labels = array(
            'name'               => __('Collected Emails', 'sonaar-music'),
            'singular_name'      => __('Collected Emails', 'sonaar-music'),
            'menu_name'          => __('Collected Emails', 'sonaar-music'),
            'name_admin_bar'     => __('Collected Emails', 'sonaar-music'),
            'edit_item'          => __('Edit Email', 'sonaar-music'),
            'view_item'          => __('View Email', 'sonaar-music'),
            'all_items'          => __('Collected Emails', 'sonaar-music'),
            'search_items'       => __('Search Email Address', 'sonaar-music'),
            'not_found'          => __('No Email found.', 'sonaar-music'),
            'not_found_in_trash' => __('No Email found in Trash.', 'sonaar-music'),
        );

        $args = array(
            'labels'             => $labels,
            'public'             => false,
            'publicly_queryable' => false,
            'show_ui'            => true,
            'show_in_menu'        => 'edit.php?post_type=' . SR_PLAYLIST_CPT,
            'query_var'          => true,
            'rewrite'            => false,
            'capability_type'    => 'post',
            'has_archive'        => false,
            'hierarchical'       => false,
            'supports'           => array('title','custom-fields'),
            'capabilities'       => array(
                'create_posts'              => false,
                'edit_posts'                => 'edit_posts',
                'edit_others_posts'         => 'edit_others_posts',
                'delete_posts'              => 'delete_posts',
                'delete_others_posts'       => 'delete_others_posts',
                'publish_posts'             => 'publish_posts',
                'read_private_posts'        => 'read_private_posts',
                'delete_published_posts'    => 'delete_published_posts',
            ),
            'map_meta_cap'       => true,
           
        );

        register_post_type('sr_email_submission', $args);
        
    }
   
    public function srp_collectemail_add_custom_columns($columns) {
        $new_columns = array(
            'cb'             => $columns['cb'], // The checkbox column
            'title'          => __('Email', 'sonaar-music'),
            'firstname'      => __('First Name', 'sonaar-music'),
            'lastname'       => __('Last Name', 'sonaar-music'),
            'action'         => __('Action', 'sonaar-music'),
            'track_title'    => __('Track Title', 'sonaar-music'),
            'post_id'        => __('Post ID', 'sonaar-music'), // Add Post ID column
            'date'           => __('Date', 'sonaar-music'), // Re-add the date column
        );

        return $new_columns;
    }

    public function srp_collectemail_custom_columns_content($column, $post_id) {
        switch ($column) {
            case 'firstname':
                echo esc_html(get_post_meta($post_id, 'user_firstname', true));
                break;
            case 'lastname':
                echo esc_html(get_post_meta($post_id, 'user_lastname', true));
                break;
            case 'track_title':
                echo esc_html(get_post_meta($post_id, 'track_title', true));
                break;
            case 'action':
                echo esc_html(get_post_meta($post_id, 'action', true));
                break;
            case 'post_id':
                echo esc_html(get_post_meta($post_id, 'post_id', true));
                break;
        }
    }

    public function srp_collectemail_make_columns_sortable($sortable_columns) {
        $sortable_columns['track_title']    = 'track_title';
        $sortable_columns['action']         = 'action';
        $sortable_columns['post_id']        = 'post_id';
        return $sortable_columns;
    }

    public function srp_collectemail_orderby_custom_columns($query) {
        if (!is_admin()) {
            return;
        }
    
        $orderby = $query->get('orderby');
        if ('post_id' === $orderby) {
            $query->set('meta_key', 'post_id'); // Meta key to sort by
            $query->set('orderby', 'meta_value_num'); // Sort by the meta value
        }
        if ('track_title' === $orderby) {
            $query->set('meta_key', 'track_title'); // Meta key to sort by
            $query->set('orderby', 'meta_value'); // Sort by the meta value
        }
       
    }
    
    public function srp_collectemail_add_export_button() {
        $screen = get_current_screen();

        // Only add the export button on the 'sr_email_submission' post type listing page
        if ($screen->post_type == 'sr_email_submission') {
            ?>
            <div class="alignright actions" id="srmp3-export-actions">
                <label for="start_date" style="vertical-align: middle;"><?php _e('Start Date', 'sonaar-music'); ?></label>
                <input type="date" id="start_date" name="start_date" placeholder="<?php esc_attr_e('Start Date', 'sonaar-music'); ?>" style="vertical-align: middle; margin-right: 10px;" />

                <label for="end_date" style="vertical-align: middle;"><?php _e('End Date', 'sonaar-music'); ?></label>
                <input type="date" id="end_date" name="end_date" placeholder="<?php esc_attr_e('End Date', 'sonaar-music'); ?>" style="vertical-align: middle; margin-right: 10px;" />

                <button id="srmp3_export_emails" class="button button-primary" style="vertical-align: middle;"><?php _e('Export Emails to CSV', 'sonaar-music'); ?></button>
            </div>

            <style>
                #srmp3-export-actions {
                    float: right;
                    margin-left:30px;
                    margin-right: 15px;
                }

                #srmp3-export-actions label {
                    margin-right: 5px;
                    font-weight: 600;
                }

                #srmp3-export-actions input[type="date"] {
                    height: auto;
                    vertical-align: middle;
                }

                #srmp3_export_emails {
                    vertical-align: middle;
                }
            </style>
            <?php
        }
    }
    
    public function srmp3_export_emails_ajax() {
        check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');
        
        // Check if the user has the correct permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'You do not have permission to export emails.'));
        }
    
        // Get the start and end dates from the request, if provided
        $start_date = isset($_POST['start_date']) ? sanitize_text_field($_POST['start_date']) : '';
        $end_date = isset($_POST['end_date']) ? sanitize_text_field($_POST['end_date']) : '';
    
        // If no start date is specified, default to the earliest possible date
        if (empty($start_date)) {
            $start_date = '1970-01-01 00:00:00';
        }
    
        // If no end date is specified, default to the current date
        if (empty($end_date)) {
            $end_date = date('Y-m-d 23:59:59');
        } else {
            $end_date .= ' 23:59:59';
        }
    
        // Set the name of the CSV file
        $filename = sanitize_file_name('exported_emails_' . date('Y-m-d') . '.csv');
        
        // Set the path where the file will be saved
        $upload_dir = wp_upload_dir();
        $file_path = $upload_dir['path'] . '/' . $filename;
        $file_url = $upload_dir['url'] . '/' . $filename;
    
        // Open file for writing
        $output = fopen($file_path, 'w');
        if (!$output) {
            wp_send_json_error(array('message' => 'Failed to create CSV file.'));
        }
    
        // Query to get all 'sr_email_submission' posts within the date range
        $args = array(
            'post_type'      => 'sr_email_submission',
            'posts_per_page' => -1,
            'date_query'     => array(
                array(
                    'after'     => $start_date,
                    'before'    => $end_date,
                    'inclusive' => true,
                ),
            ),
        );
    
        // Get the posts based on the query
        $posts = get_posts($args);
    
        // Define excluded meta keys
        $excluded_meta_keys = ['post_id', 'track_pos', '_edit_last', '_edit_lock', 'sonaar_footer_player_shuffle_meta', 'user_firstname', 'user_lastname', 'email', 'track_title'];
    
        // Prepare dynamic headers (collect all possible custom meta fields)
        $custom_meta_keys = [];
    
        // Collect all custom meta fields from posts
        foreach ($posts as $post) {
            $meta_data = get_post_meta($post->ID);
    
            // Add all meta keys to the array (unique values), excluding unwanted ones
            foreach ($meta_data as $key => $value) {
                if (!in_array($key, $custom_meta_keys) && !in_array($key, $excluded_meta_keys)) {
                    $custom_meta_keys[] = $key;
                }
            }
        }
    
        // Define the CSV column headers (static and dynamic)
        $headers = array_merge(
            ['Email Address', 'First Name', 'Last Name', 'Track Title', 'Date'], // Static fields
            $custom_meta_keys // Dynamically collected meta fields
        );
    
        // Write the headers to the CSV
        fputcsv($output, $headers);
    
        // Loop through each post and get the necessary meta data
        foreach ($posts as $post) {
            $email = get_the_title($post->ID);  // Assuming the post title stores the email address
            $first_name = get_post_meta($post->ID, 'user_firstname', true);
            $last_name = get_post_meta($post->ID, 'user_lastname', true);
            $track_title = get_post_meta($post->ID, 'track_title', true);
            $date = get_the_date('Y-m-d H:i:s', $post->ID);
    
            // Start with static fields
            $row = array(
                $email,
                $first_name,
                $last_name,
                $track_title,
                $date
            );
    
            // Add dynamic meta fields (excluding unwanted keys)
            foreach ($custom_meta_keys as $meta_key) {
                $meta_value = get_post_meta($post->ID, $meta_key, true);
                $row[] = $meta_value ? $meta_value : '';  // Add meta value or empty if not set
            }
    
            // Write the row to the CSV
            fputcsv($output, $row);
        }
    
        // Close the CSV file
        fclose($output);
    
        // Send the file URL back for download
        wp_send_json_success(array('csv_url' => $file_url, 'filename' => $filename));
    }
    
    



    public function srp_advanced_triggers_register_post_type() {
        $labels = array(
            'name'               => __('Advanced Triggers', 'sonaar-music'),
            'singular_name'      => __('Advanced Trigger', 'sonaar-music'),
            'menu_name'          => __('Advanced Triggers', 'sonaar-music'),
            'name_admin_bar'     => __('Advanced Triggers', 'sonaar-music'),
            'edit_item'          => __('Edit Trigger', 'sonaar-music'),
            'view_item'          => __('View Trigger', 'sonaar-music'),
            'all_items'          => __('Advanced Triggers', 'sonaar-music'),
            'add_new'            => __('Add New', 'sonaar-music'),
            'add_new_item'       => __('Add New Trigger', 'sonaar-music'),
            'search_items'       => __('Search Trigger', 'sonaar-music'),
            'not_found'          => __('No Trigger found.', 'sonaar-music'),
            'not_found_in_trash' => __('No Trigger found in Trash.', 'sonaar-music'),
        );

        $args = array(
            'labels'             => $labels,
            'public'             => false,
            'publicly_queryable' => false,
            'show_ui'            => true,
            'show_in_menu'       => 'edit.php?post_type=' . SR_PLAYLIST_CPT,
            'query_var'          => true,
            'rewrite'            => false, // Disables slug support
            'capability_type'    => 'post',
            'has_archive'        => false,
            'hierarchical'       => false,
            'supports'           => array('title'),
            'map_meta_cap'       => true,
           
        );

        register_post_type('sr_advanced_triggers', $args);
        
        add_action('add_meta_boxes', function() {
            remove_meta_box('slugdiv', 'sr_advanced_triggers', 'normal'); // Removes the slug box
        });
        
    }
   





    
    public static function post_stats(){
        check_ajax_referer('sonaar_music_ajax_nonce', 'nonce');

        global $wpdb;
        $sonaar_music_post_data = new Sonaar_Music_Post;
        $request = $_POST['post_stats'];
        
        wp_send_json( $sonaar_music_post_data->log( $request ) );
    }
    
    public static function get_stats(){
        $getStats = $_POST['get_stats'];
        
        
        
        $sonaar_music_get_data = new Sonaar_Music_Get;
        
        $interval = ( $getStats['interval'] !== '' )? $getStats['interval'] : 14 ;
        
        $sonaar_music_get_data->set_interval( $interval );
        
        $countPer = $getStats['count_per'];
        
        switch ($countPer) {
            case 'track':
                wp_send_json( $sonaar_music_get_data->get_play_count_per_track() );
                break;
            
            case 'page':
                wp_send_json( $sonaar_music_get_data->get_play_count_per_page() );
                break;
            
            default:
                $play_count_by_day = $sonaar_music_get_data->get_play_count_by_day() ;
                $dataDate = array();
                $dataCount = array();
                foreach ( $play_count_by_day as $play ) {
                    array_push($dataDate, $play->date);
                    array_push($dataCount, $play->play_count);
            }
            wp_send_json( array(
            'date' => $dataDate,
            'count' => $dataCount
            ) );
            break;
        }
    }


    public function manage_album_columns ($columns){
        
        $iron_cols = array('alb_stats' => '');
        
        $columns = Sonaar_Music_Pro::array_insert($columns, $iron_cols, 'date', 'before');
        
        $columns['date'] = esc_html__('Published', 'sonaar-music-pro');   // Renamed date column
        
        return $columns;
    }


    public function manage_album_custom_column ($column, $post_id){
        switch ($column){
            case 'alb_stats':
                echo '<a href="' . esc_url( get_admin_url( null, 'edit.php?post_type=' . SR_PLAYLIST_CPT  . '&page=sonaar_music_pro&url=') . get_permalink( $post_id ) ) . '"><span class="dashicons dashicons-chart-area"></span></a>';
                
                break;
        }
    }

    public function srmp3_set_mimes($mimes) {
        return array_merge($mimes,array (
            'ttml' => 'text/xml'
        ));
    }
    

    public function srp_plugins_list( $plugins ) {
        // without this, it displays 2x View Details link in the plugin.php page
		if ( !empty($plugins) ) {
			if ( isset($plugins['all'][PLUGIN_INSTALLATION_NAME]['slug'])) {
				unset($plugins['all'][PLUGIN_INSTALLATION_NAME]['slug']);
			}
		}
		
		return $plugins;
	}
    

	public function srmp3_create_mp3_playlists_ajax() {
        // create MULTIPLE POSTS
		if ( ! current_user_can( 'manage_options' ) ) {
				wp_die(0); 
		}
        check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');
		
		$iron_music_player = get_option( 'iron_music_player' );		
		$post_type    = isset( $_POST['post_type'] ) ? $_POST['post_type'] : SR_PLAYLIST_CPT;  
		$taxonomy     = isset( $_POST['taxonomy'] ) ? $_POST['taxonomy'] : false;
		$iron_music_player['srmp3_posttypes'][] = $post_type;
		$iron_music_player['srmp3_posttypes'] = array_unique($iron_music_player['srmp3_posttypes']);
		update_option( 'iron_music_player', $iron_music_player );	
		
		
		$type         = 'single';
		$product_type = isset( $_POST['product_type'] ) ? $_POST['product_type'] : 'simple';
        $product_download = isset( $_POST['product_download'] ) ? $_POST['product_download'] : 'no';
		$title 		  = isset( $_POST['title'] ) ? $_POST['title'] : 'simple';
		$price 		  = isset( $_POST['price'] ) ? (float) $_POST['price'] : '9.99';
		$alb_tracklist        = array();
		switch ( $type ) {
			case 'single':
				$id    = isset( $_POST['id'] ) ? (int) $_POST['id'] : 0;				
				$track = wp_get_attachment_metadata( $id );
				$post  = get_post( $id );
				if ( $post->post_title ) {
					$track['title'] = $post->post_title;
				}
                $thumbnail_id        = get_post_thumbnail_id( $id );
                $thumbnail_url       = wp_get_attachment_image_src( get_post_thumbnail_id( $id ))[0];
				$file_url            = wp_get_attachment_url( $id );
                $file_download = ($product_download === 'yes') ? $file_url : '';
				$file_hash           = md5( $file_url );
                $song_store_list = '';
				$alb_tracklist[] = array(
					'FileOrStream' 	=> 'mp3',
					'track_mp3_id' 	=> $id,
					'track_mp3' 	=> $file_url,
                    'track_image'   => $thumbnail_url,
                    'song_store_list' => $song_store_list,
                    'woocommerce_download_file' => $file_download
				);				
				break;
			
			default:
				break;
		}

		$post_id = wp_insert_post(
			array(
				'post_title'  => $track['title'],
				'post_status' => 'draft',
				'post_type'   => $post_type,
			)
		);
		
		update_post_meta( $post_id, 'alb_tracklist', $alb_tracklist );
		update_post_meta( $post_id, '_thumbnail_id', $thumbnail_id );
		
		if ( $post_type == 'product') {
            $this->srmp3SetProductAttributes($post_id, $post_type, $product_type, $price, $taxonomy, $alb_tracklist);
		}

		wp_send_json_success();
		
	}
    public function srmp3_create_mp3_playlists_from_import_file_ajax() {
		if ( ! current_user_can( 'manage_options' ) ) {
				wp_die(0); 
		}
		check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');
		
		$iron_music_player = get_option( 'iron_music_player' );		
		$post_type    = isset( $_POST['post_type'] ) ? $_POST['post_type'] : SR_PLAYLIST_CPT;  
		
		$iron_music_player['srmp3_posttypes'][] = $post_type;
		$iron_music_player['srmp3_posttypes'] = array_unique($iron_music_player['srmp3_posttypes']);
		update_option( 'iron_music_player', $iron_music_player );	
		
		
		$type         = 'single';
		$product_type = isset( $_POST['product_type'] ) ? $_POST['product_type'] : 'simple';
        $add_download = ( isset( $_POST['add_download']) && $_POST['add_download'] == 'yes' ) ? 'yes' : 'no';
		$title 		  = isset( $_POST['title'] ) ? $_POST['title'] : 'simple';
		$price 		  = isset( $_POST['price'] ) ? (float) $_POST['price'] : '9.99';
		$alb_tracklist        = array();
		switch ( $type ) {
			case 'single':
				$id    = isset( $_POST['id'] ) ? (int) $_POST['id'] : 0;				
				$track = wp_get_attachment_metadata( $id );
				$post  = get_post( $id );
				if ( $post->post_title ) {
					$track['title'] = $post->post_title;
				}
                $thumbnail_id        = get_post_thumbnail_id( $id );
                $thumbnail_url       = wp_get_attachment_image_src( get_post_thumbnail_id( $id ))[0];
				$file_url            = wp_get_attachment_url( $id );
				$file_hash           = md5( $file_url );
                if ($add_download == 'yes'){
                    $song_store_list[0] = array(
                        'store-icon'=> 'fas fa-download',
                        'store-name'=> 'Download',
                        'store-link'=> $file_url,
                        
                    );
                }else{
                    $song_store_list = '';
                }
				$alb_tracklist[] = array(
					'FileOrStream' 	=> 'mp3',
					'track_mp3_id' 	=> $id,
					'track_mp3' 	=> $file_url,
                    'track_image'   => $thumbnail_url,
                    'song_store_list' => $song_store_list

				);				
				break;
			
			default:
				break;
		}

		$post_id = wp_insert_post(
			array(
				'post_title'  => $track['title'],
				'post_status' => 'draft',
				'post_type'   => $post_type,
			)
		);
		
		update_post_meta( $post_id, 'alb_tracklist', $alb_tracklist );
		update_post_meta( $post_id, '_thumbnail_id', $thumbnail_id );
		
		if ( $post_type == 'product') {
			wp_set_object_terms( $post_id, $product_type, 'product_type' );
			update_post_meta( $post_id, '_visibility', 'visible' );
			update_post_meta( $post_id, '_stock_status', 'instock' );
			update_post_meta( $post_id, 'total_sales', '0' );
			update_post_meta( $post_id, '_virtual', 'yes' );
			update_post_meta( $post_id, '_downloadable', 'yes' );
			update_post_meta( $post_id, '_regular_price', $price );
			update_post_meta( $post_id, '_featured', 'no' );
			update_post_meta( $post_id, '_price', $price );
            update_post_meta( $post_id, 'wc_add_to_cart', 'true' );
		}

		wp_send_json_success();
		
	}
	public function sonaar_music_pro_get_post_id( $data ) {
	
		global $iron_music_player;	
		$srmp3_posttypes = ( isset($iron_music_player['srmp3_posttypes']) && !empty($iron_music_player['srmp3_posttypes']) ) ? $iron_music_player['srmp3_posttypes'] : array(SR_PLAYLIST_CPT);
		
		$post_id = false;

		$args = array(
			'posts_per_page' => 1,
			'post_status'    => 'any',
			'post_type'      => $srmp3_posttypes,
		);

		$meta_query = array();
		$music_type = '';
		if ( isset( $data['file'] ) || isset( $data['id'] ) ) {
			$value	= isset( $data['file'] ) ? $data['file'] : $data['id'];
			$meta_query[]	= array(
				'key'     => 'alb_tracklist',
				'value'   => $value,
				'compare' => 'LIKE',
			);			
		}
		
		$args['meta_query'] = $meta_query; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
		
		$query = new WP_Query( $args );		
		if ( $query->have_posts() ) {
			$query->the_post();
			$post_id = get_the_ID();
			wp_reset_postdata();
		}
		

		return $post_id;
	}
	public function sonaar_music_pro_get_audio_attachments( $posts_per_page = 20, $paged = 1, $order='desc', $orderby = 'date', $search = '' ) {
		$tracks = array();
		$albums = array();

		$args = array(
			'posts_per_page' => $posts_per_page,
			'paged'          => $paged,
			'post_type'      => 'attachment',
			'post_mime_type' => 'audio',
			'post_status'    => 'any',
            'orderby'        => $orderby,
            'order'          => $order,
		);

		if ( $search ) {
			$args['s'] = $search;
		}
		$query        = new WP_Query( $args );
		$found_tracks = $query->found_posts;

		if ( $query->have_posts() ) {
			foreach ( $query->posts as $attachment ) {
				$id          = $attachment->ID;
				$track       = wp_get_attachment_metadata( $id );
				$track['id'] = $id;
				$post        = get_post( $id );
                $track['title'] = (isset($track['title'])) ? $track['title'] : '';
				if ( $post->post_title ) {
					$track['title'] = $post->post_title;
				}

				$track_file    = wp_get_attachment_url( $id );
				$track['file'] = $track_file;

				$track['product'] = $this->sonaar_music_pro_get_post_id(
					array(
						'file' => $track_file,
						'id'   => $id,
					)
				);				
				
				$tracks[] = $track;
				if ( isset( $track['album'] ) ) {
					$key = $track['album'];
					if ( ! isset( $albums[ $key ] ) ) {
						$albums[ $key ]           = array();
						$albums[ $key ]['count']  = 0;
						$albums[ $key ]['tracks'] = array();
					}
					$albums[ $key ]['count']++;
					$albums[ $key ]['tracks'][] = $track['id'];
				}
                

			}
			foreach ( $albums as $title => $album ) {
				$album['product'] = $this->sonaar_music_pro_get_post_id( array( 'album' => $title ) );
				$album['tracks']  = implode( ',', $album['tracks'] );
				$albums[ $title ] = $album;
			}
		}
        if($orderby == 'title'){
            // Sort the array based on the 'title' field and the desired order
            usort($tracks, function($a, $b) use ($order) {
                if ($order === 'asc') {
                    return strcasecmp($a['title'], $b['title']);
                } else {
                    return strcasecmp($b['title'], $a['title']);
                }
            });
        }
		return array(
			'tracks'       => $tracks,
			'found_tracks' => $found_tracks,
		);
	}
	public function sonaar_music_pro_inputs( $posts_per_page = 20, $paged = 1, $order = 'desc', $orderby = 'date', $search = ''  ){
		//var_dump($orderby);
        $result = $this->sonaar_music_pro_get_audio_attachments( $posts_per_page, $paged, $order, $orderby, $search );
		if ( $result ) {
			$tracks       = $result['tracks'];
			$found_tracks = $result['found_tracks'];
			$per_page     = $posts_per_page;
		} else {
			return false;
		}
		$track_inputs = '';
		
		foreach ( $tracks as $track ) {
			$id       = esc_attr( $track['id'] );
			$title    = esc_attr( $track['title'] );
			$length   = esc_html( isset( $track['length_formatted'] ) ? $track['length_formatted'] : '' );
            $album    = esc_html( ( isset( $track['album'] ) && $track['album'] != null) ? $track['album']  . ' - ' : '' );
			$file     = esc_html( basename( $track['file'] ) );
			$product  = $track['product'];
			$disabled = $product > 0 ? 'disabled' : '';

			$track_inputs .= "<div><input type='checkbox' name='music_track_$id' value='$id'  data-title='$title' /><span class='$disabled'><strong>$title</strong> – $album $length ($file) [ID: $id]</span></div>";
		}
		$args = array(
			'base'      => '%_%',
			'format'    => '#%#%',
			'current'   => (int) $paged,
			'total'     => ceil( $found_tracks / $posts_per_page ),
			'prev_text' => '<',
			'next_text' => '>',
		);
		// translators: %s is the number of tracks found.
		$found_tracks_label = '<span class="found-tracks">' . sprintf( esc_attr( _n( '%s track', '%s tracks', $found_tracks, 'sonaar-music-pro' ) ), number_format_i18n( $found_tracks ) ) . '</span>'; //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		require_once ABSPATH . 'wp-admin/includes/template.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-screen.php';
		$pagination = new \WP_List_Table( array( 'ajax' => true ) );
		$pagination->set_pagination_args(
			array(
				'total_items' => $found_tracks,
				'total_pages' => ceil( $found_tracks / $posts_per_page ),
				'per_page'    => $posts_per_page,
			)
		);

		ob_start();
		?>

		<div class="tablenav-pages">
			<?php $pagination->pagination( 'top' ); ?>
		</div>

		<?php
		$paginate_links = ob_get_clean(); //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		return array(
			'track_inputs'   => $track_inputs,
			'paginate_links' => $paginate_links,
			'found_tracks'   => $found_tracks,
		);
	}
	public function srmp3_update_mp3_playlists_ajax() {
		
		if ( ! current_user_can( 'manage_options' ) ) {
				wp_die(0); 
		}
		check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');

		$per_page = isset( $_POST['per_page'] ) ? $_POST['per_page'] : 20;  
		$paged    = isset( $_POST['paged'] ) ? $_POST['paged'] : 1;  
		$search   = isset( $_POST['search'] ) ? $_POST['search'] : '';
        $orderby = isset( $_POST['orderby'] ) ? $_POST['orderby'] : 'date';
		$order    = isset( $_POST['order'] ) ? $_POST['order'] : 'desc';
		$mp3_lists_inputs = $this->sonaar_music_pro_inputs($per_page, $paged, $order, $orderby, $search);
		if ( $mp3_lists_inputs ) {
			$music_playlists	= $mp3_lists_inputs['track_inputs'];
			$paginate_info		= $mp3_lists_inputs['paginate_links'];
			wp_send_json_success(
				array(
					'music_playlists'   => $music_playlists,
					'paginate_info'		=> $paginate_info,
				)
			);
		}
		wp_send_json_error( array( 'message' => esc_html__( 'An error occurred while retrieving the audio attachments lists.', 'sonaar-music-pro' ) ) );
	}
	
	public function srmp3_create_single_mp3_playlists_ajax() {
        // CREATE ONE POST ONLY
		if ( ! current_user_can( 'manage_options' ) ) {
				wp_die(0); 
		}
		check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');
		$iron_music_player = get_option( 'iron_music_player' );		
		$post_type    = isset( $_POST['post_type'] ) ? $_POST['post_type'] : SR_PLAYLIST_CPT;  
		$taxonomy     = isset( $_POST['taxonomy'] ) ? $_POST['taxonomy'] : false;
		$iron_music_player['srmp3_posttypes'][] = $post_type;
		$iron_music_player['srmp3_posttypes'] = array_unique($iron_music_player['srmp3_posttypes']);
		update_option( 'iron_music_player', $iron_music_player );		
		
		$type         = 'single';
		$product_type = isset( $_POST['product_type'] ) ? $_POST['product_type'] : 'simple';
        $product_download = isset( $_POST['product_download'] ) ? $_POST['product_download'] : 'no';
       // $add_download = ( isset( $_POST['add_download']) && $_POST['add_download'] == 'yes' ) ? 'yes' : 'no';
		$mp3_id = isset( $_POST['mp3_id'] ) ? json_decode(stripslashes($_POST['mp3_id']), true ): '';		
		
		$price = isset( $_POST['price'] ) ? (float) $_POST['price'] : '9.99';
		$alb_tracklist        = array();
		switch ( $type ) {
			case 'single':
				$mp3_id = isset( $_POST['mp3_id'] ) ? json_decode(stripslashes($_POST['mp3_id']), true ): '';
				$track = wp_get_attachment_metadata( $mp3_id[0] );
				$post  = get_post( $mp3_id[0] );
				if ( $post->post_title   ) {
					$track['title'] = $post->post_title;
				}
				
				$attachment_metadata = get_post_meta($mp3_id[0] ,'_wp_attachment_metadata', true );
				if ( isset($attachment_metadata['album']) && $attachment_metadata['album'] != '' ) {
					$track['title'] = $attachment_metadata['album'];
				}
				$thumbnail_id       = get_post_thumbnail_id( $mp3_id[0] );
				
				
				foreach( $mp3_id as $id) {
                    $thumbnail_info = wp_get_attachment_image_src(get_post_thumbnail_id($id));
                    if (is_array($thumbnail_info)) {
                        $thumbnail_url = $thumbnail_info[0];
                    } else {
                        // Handle the case where no image is found (e.g., set a default URL or display an error message).
                        $thumbnail_url = ''; // Replace with your default URL.
                    }
                    $file_url            = wp_get_attachment_url( $id );
                    $file_download = ($product_download === 'yes') ? $file_url : '';
					$file_hash           = md5( $file_url );
                    $song_store_list     = '';
					$alb_tracklist[] = array(
						'FileOrStream' 	=> 'mp3',
						'track_mp3_id' 	=> $id,
						'track_mp3' 	=> $file_url,
                        'track_image'   => $thumbnail_url,
                        'song_store_list' => $song_store_list,
                        'woocommerce_download_file' => $file_download
					);
				}
				
				break;
			
			default:
				break;
		}		
		
		$post_id = wp_insert_post(
			array(
				'post_title'  => $track['title'],
				'post_status' => 'draft',
				'post_type'   => $post_type,
			)
		);
		
		update_post_meta( $post_id, 'alb_tracklist', $alb_tracklist );
		update_post_meta( $post_id, '_thumbnail_id', $thumbnail_id );
		
		if ( $post_type == 'product') {
            $this->srmp3SetProductAttributes($post_id, $post_type, $product_type, $price, $taxonomy, $alb_tracklist);
		}

		wp_send_json_success();
	}

    // Function to create a new product variation
    public function create_product_variation( $product_id, $variation_data ) {
        $variation = new WC_Product_Variation();
        $variation->set_parent_id( $product_id );
        
        foreach ( $variation_data as $key => $value ) {
            $variation->{"set_$key"}( $value );
        }
        
        $variation->save();
        
        return $variation->get_id();
    }

   
    public function srmp3_create_single_mp3_playlists_from_import_file_ajax() {
        if (!current_user_can('manage_options')) {
            wp_die(0);
        }
        check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');
        $response = array();
    
        // Check if file was uploaded successfully
        if ($_FILES['file']['error'] == 0) {
            // Get file name and extension
            $filename = basename($_FILES['file']['name']);
            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            // Check if file is a CSV file
            if ($extension == 'csv') {
                // Set up temporary upload folder
                $upload_dir = wp_upload_dir();
                $temp_folder = $upload_dir['basedir'] . '/temp';
                if (!is_dir($temp_folder)) {
                    mkdir($temp_folder);
                }
                // Move uploaded file to temporary folder
                $temp_file = $temp_folder . '/' . $filename;
                if (move_uploaded_file($_FILES['file']['tmp_name'], $temp_file)) {
                    $post_type = isset($_POST['post_type']) ? $_POST['post_type'] : SR_PLAYLIST_CPT;
                    $product_type = isset($_POST['product_type']) ? $_POST['product_type'] : 'simple';
                    $taxonomy = isset($_POST['taxonomy']) ? $_POST['taxonomy'] : false;
                    $price = isset($_POST['price']) ? (float)$_POST['price'] : '9.99';
                    $multiple_post = isset($_POST['multiple']) ? filter_var($_POST['multiple'], FILTER_VALIDATE_BOOLEAN) : false;
                    $cat_taxonomy = ($post_type == 'product') ? 'product_cat' : (($post_type == 'sr_playlist') ? 'playlist-category' : '');
    
                    // Process the CSV File and get the content
                    $sonaar_music_widget = new Sonaar_Music_Widget();
                    $playlists = $sonaar_music_widget->importFile($temp_file, null, false); // return an array
                    $count = 0;
                    $imported_images = array();
                    foreach ($playlists as $playlist) {
                        $alb_tracklist = array();
                        $post_title = ($playlist['playlist_name'] != '') ? $playlist['playlist_name'] : $playlist['tracks'][0]['album_title'];
    
                        foreach ($playlist['tracks'] as $track) {
                            $track_info = array(
                                'FileOrStream' => 'stream',
                                'stream_title' => $track['track_title'],
                                'stream_link' => $track['mp3'],
                                'track_image' => $track['poster'],
                                'song_store_list' => $track['song_store_list'],
                                'stream_album' => $track['album_title'],
                                'artist_name' => $track['track_artist'],
                                'stream_lenght' => $track['length'],
                                'woocommerce_download_file' => $track['woocommerce_download_file'],
                                'has_lyric' => $track['has_lyric'],
                                'track_description' => $track['description'],
                                'track_lyrics' => $track['track_lyrics'],
                            );
    
                            // Create a post for each track or accumulate tracks for a single post
                            $alb_tracklist[] = $track_info;
                            if ($multiple_post) {
                                $this->create_post($post_type, $product_type, $price, $taxonomy, $cat_taxonomy, $track, array($track_info), $imported_images);
                                $count++;
                            }
                        }
    
                        if (!$multiple_post) {
                            // Create a single post for all tracks
                            $this->create_post($post_type, $product_type, $price, $taxonomy, $cat_taxonomy, $playlist['tracks'][0], $alb_tracklist, $imported_images, $post_title);
                            $count++;
                        }
                    }
    
                    $response['success'] = true;
                    $response['itemsCount'] = $count;
                    $response['playlists'] = $playlists;
                    $response['message'] = 'CSV File imported and post(s) have been created! 🎉';
                } else {
                    $response['success'] = false;
                    $response['message'] = "⚠️ Error moving CSV file to temporary folder";
                }
            } else {
                $response['success'] = false;
                $response['message'] = "⚠️ Error: Please upload a CSV file";
            }
        } else {
            $response['success'] = false;
            $response['message'] = "⚠️ Error uploading CSV file: " . $_FILES['file']['error'];
        }
    
        wp_send_json($response);
        wp_die();
    }
    
    private function create_post($post_type, $product_type, $price, $taxonomy,$cat_taxonomy, $track, $alb_tracklist, &$imported_images, $post_title = '') {
        $post_title = ($post_title == '') ? $track['track_title'] : $post_title;
        $post = array(
            'post_title'   => $post_title,
            'post_content' => '', // Add content if needed
            'post_status'  => 'draft',
            'post_type'    => $post_type
        );
    
        $post_id = wp_insert_post($post);
    
        if (!is_wp_error($post_id)) {

            update_post_meta($post_id, 'alb_tracklist', $alb_tracklist);
            update_post_meta($post_id, 'alb_release_date', $track['release_date']);
    
            if ($post_type == 'product') {
                $this->srmp3SetProductAttributes($post_id, $post_type, $product_type, $price, $taxonomy, $alb_tracklist);
            }
    
            $featured_image = $track['playlist_image'];
            // Set featured image
            if (!empty($featured_image)) {
                // Check if the image is already in the media library
                $attachment_id = attachment_url_to_postid($featured_image);
            
                // If the image is not found in the media library, import it
                if (!$attachment_id) {
                    if (array_key_exists($featured_image, $imported_images)) {
                        // Use the previously imported image
                        $attachment_id = $imported_images[$featured_image];
                    } else {
                        // Import the image and store its attachment ID
                        $attachment_id = media_sideload_image($featured_image, $post_id, '', 'id');
                        if (!is_wp_error($attachment_id)) {
                            $imported_images[$featured_image] = $attachment_id;
                        }
                    }
                }
            
                // Set the featured image for the post
                if (!is_wp_error($attachment_id) && $attachment_id) {
                    set_post_thumbnail($post_id, $attachment_id);
                } else {
                    // Handle error, for example, log or display an error message
                    $error_message = "Warning: Featured image not imported. ";
                    if (is_wp_error($attachment_id)) {
                        $error_message .= $attachment_id->get_error_message();
                    }
                }
            }
            if (!empty($cat_taxonomy) && !empty($track['category_slug'])) {
                $slugs = array_map('trim', explode(',', $track['category_slug']));
                $category_ids = [];
                foreach ($slugs as $slug) {
                    $category = get_term_by('slug', $slug, $cat_taxonomy);
                    if (!$category) {
                        // Term doesn't exist, so create it
                        $new_term = wp_insert_term(
                            $slug, // the term 
                            $cat_taxonomy, // the taxonomy
                            array('slug' => $slug)
                        );
                        // Check if there was an error creating the term
                        if (!is_wp_error($new_term)) {
                            $term_id = $new_term['term_id'];
                        } else {
                            // Log the error or handle it as needed
                            continue; // Skip this term and continue with the next one
                        }
                    } else {
                        $term_id = $category->term_id;
                    }
                    if (isset($term_id)) {
                        $category_ids[] = $term_id;
                    }
                }
        
                if (!empty($category_ids)) {
                    // Use the correct taxonomy here as well
                    wp_set_object_terms($post_id, $category_ids, $cat_taxonomy);
                }
            }
        } else {
            
            // Handle error, for example, log or display an error message
            $error_message = "Warning: Post creation failed. " . $post_id->get_error_message();
        }
    }

    public function srmp3SetProductAttributes($post_id, $post_type, $product_type, $price, $taxonomy = false, $alb_tracklist = false){
        // once the post is created, we need to set the product type

        wp_set_object_terms( $post_id, $product_type, 'product_type' );
        update_post_meta( $post_id, '_visibility', 'visible' );
        update_post_meta( $post_id, '_stock_status', 'instock' );
        update_post_meta( $post_id, 'total_sales', '0' );
        update_post_meta( $post_id, '_virtual', 'yes' );
        update_post_meta( $post_id, '_downloadable', 'yes' );
        update_post_meta( $post_id, '_regular_price', $price );
        update_post_meta( $post_id, '_featured', 'no' );
        update_post_meta( $post_id, '_price', $price );
        update_post_meta( $post_id, 'wc_add_to_cart', 'true' ); // set the add to cart button to true
       
        if($product_type == 'simple'){
            $files = array();
            // Loop through the $alb_tracklist array
            foreach ($alb_tracklist as $track) {
                
                if (!empty($track['woocommerce_download_file'])) {
                    if($track['stream_title']){
                        $download_title = $track['stream_title'];
                    }else{
                        //get track title from track_mp3_id
                        $track_file = wp_get_attachment_metadata( $track['track_mp3_id'] );
                        $download_title =  $track_file['title'];
                    }

                    $download_file_ar = array(
                        'file' =>  $track['woocommerce_download_file'], // URL of the downloadable file
                        'name' =>  $download_title, // Display name for the downloadable file
                    );
            
                    // Add the downloadable file to the $files array
                    $files[md5($download_file_ar['file'])] = $download_file_ar;

                }
            }
            
            // Add the downloadable files to the product
            if (!empty($files)) {
                update_post_meta($post_id, '_downloadable_files', $files);
            }
        }
        if($product_type == 'variable' && $taxonomy){
            
            // Fetch all existing terms in the 'pa_license' taxonomy
            $license_terms = get_terms( array(
                'taxonomy' => $taxonomy,
                'hide_empty' => false,
            ) );

            // Collect the slugs of all terms
            $license_term_slugs = array();
            if ( !is_wp_error( $license_terms ) && !empty( $license_terms ) ) {
                foreach ( $license_terms as $term ) {
                    $license_term_slugs[] = $term->slug;
                }
            }

            // Assign all existing terms to the product
            wp_set_object_terms( $post_id, $license_term_slugs, $taxonomy, true );

            // Update the product attributes meta
            $attributes = get_post_meta( $post_id, '_product_attributes', true );
            if ( !is_array( $attributes ) ) {
                $attributes = array();
            }
            $attributes[$taxonomy] = array(
                'name' => $taxonomy,
                'value' => $license_term_slug,
                'position' => '0', // You can change the position if needed
                'is_visible' => '1',
                'is_variation' => '1',
                'is_taxonomy' => '1',
            );
            update_post_meta( $post_id, '_product_attributes', $attributes );
            // Get the 'pa_license' attribute terms
            $license_terms = wc_get_product_terms( $post_id, $taxonomy, array( 'fields' => 'all' ) );

            // Create a variation for each 'pa_license' term
            foreach ( $license_terms as $license_term ) {
                 // Get the default price for the term
                $term_default_price = (get_term_meta( $license_term->term_id, '_srmp3_license_default_price', true )) ? get_term_meta( $license_term->term_id, '_srmp3_license_default_price', true ) : $price;
                
                $variation_data = array(
                    'attributes' => array(
                        $taxonomy => $license_term->slug,
                    ),
                    'regular_price' => $term_default_price, // Use the term's default price as the regular price for the variation
                    'sale_price' => '', // Set the sale price for the variation (if applicable)
                    'stock_quantity' => '', // Set the stock quantity for the variation (if applicable)
                    'weight' => '', // Set the weight for the variation (if applicable)
                    'length' => '', // Set the length for the variation (if applicable)
                    'width' => '', // Set the width for the variation (if applicable)
                    'height' => '', // Set the height for the variation (if applicable)
                    'sku' => '', // Set the SKU for the variation (if applicable)
                    'tax_class' => '', // Set the tax class for the variation (if applicable)
                    'image_id' => '', // Set the image ID for the variation (if applicable)
                    'downloadable' => 'yes',
                    'virtual' => 'yes',
                );
                // Create the variation
                $variation_id = $this->create_product_variation( $post_id, $variation_data );
                // Prepare the downloadable files array
                $files = array();

                // Loop through the $alb_tracklist array
                foreach ($alb_tracklist as $track) {
                    if (!empty($track['woocommerce_download_file'])) {
                        if($track['stream_title']){
                            $download_title = $track['stream_title'];
                        }else{
                            //get track title from track_mp3_id
                            $track_file = wp_get_attachment_metadata( $track['track_mp3_id'] );
                            $download_title =  $track_file['title'];
                        }
    
                        $download_file_ar = array(
                            'file' =>  $track['woocommerce_download_file'], // URL of the downloadable file
                            'name' =>  $download_title, // Display name for the downloadable file
                        );
                
                        // Add the downloadable file to the $files array
                        $files[md5($download_file_ar['file'])] = $download_file_ar;
                    }
                }

                // Add the downloadable files to the variation
                if (!empty($files)) {
                    update_post_meta($variation_id, '_downloadable_files', $files);
                }
            }
        }
    }
    public function register_widget(){
        if ( class_exists( 'Sonaar_Filters_Widget' ) ){
            register_widget( 'Sonaar_Filters_Widget' );
            register_widget( 'Sonaar_Search_Widget' );
            register_widget( 'Sonaar_Chips_Widget' );
        }
    }
    public function srmp3_pro_add_shortcode(){

        function sonaar_shortcode_time_stamp($atts, $content = null) {

            /* Enqueue Sonaar Music related CSS and Js file */ 
    		wp_enqueue_style( 'sonaar-music' );
    		wp_enqueue_style( 'sonaar-music-pro' );
    		wp_enqueue_script( 'sonaar-music-mp3player' );
    		wp_enqueue_script( 'sonaar-music-pro-mp3player' );
    		wp_enqueue_script( 'sonaar_player' );
    		if ( function_exists('sonaar_player') ) {
    			add_action('wp_footer','sonaar_player', 12);
    		}

            extract(shortcode_atts(array(
                'post_id' => '',
                'widget_id' => '',
                'track_id' => '0',
                'time' => '0',
                'button' => '',
                'play_icon' => '',
                'font_size' =>'',
                'color' => '',
                'background_color' => '',
                'text' => '',
                'text_pause' => '',
                'block' => ''
            ), $atts));
            $params = [];
            if($post_id != '' && is_numeric($post_id) ){
                array_push($params, "id:'". $post_id ."'");
            }
            $content = ($text != '') ? $text : $content;
            $text_pause = ($text_pause !='') ? $text_pause : '';
            $shortcode_classname = ($button === 'true') ? 'srmp3_sonaar_ts_shortcode srmp3_sonaar_ts_shortcode_button' : 'srmp3_sonaar_ts_shortcode';
            $shortcode_classname .= ($play_icon === 'true') ? ' sricon-play': '';
            $shortcode_classname .= ($block === 'true') ? ' srmp3_sonaar_ts--block': '';
        
            $style = ($color != '' || $background_color != '' || $font_size != '') ? 'color:'. $color .';background-color:' . $background_color . ';font-size:' . $font_size . ';' : '';
            $style .=($play_icon === 'true') ? 'text-decoration:none;': '';
            if($track_id != '0' && is_numeric($track_id ) ){
                $track_id = (float)(((int)$track_id )- 1);
            }else{
                $track_id = '0'; 
            }

            if($widget_id != ''){
                array_push($params, "widget_id:'". sanitize_text_field($widget_id) ."'");
            } 

            $timeArray = explode(':',  $time);
            if ( !(count( $timeArray ) === count( array_filter( $timeArray, 'is_numeric' ) )) ) { //if time doesnt have format "00:00" set it to '0'
                $time = '0';
            }
            
            $shortcodeID = uniqid();
            array_push($params, "trackid:'". $track_id ."'", "time:'". $time ."'", "ts_id:'". $shortcodeID ."'", "play_icon:'". $play_icon ."'");
            
            $buttonLabel = ($text_pause != '')?"<span class=\"srp_ts_content\">" .$content."</span><span class=\"srp_ts_content_pause\">" . $text_pause ."</span>": $content;

            return "<a id=\"". "sonaar_ts-". $shortcodeID ."\" class=\"" . $shortcode_classname . "\"  style=\"" . $style . "\" href=\"javascript:sonaar_ts_shortcode({ ". implode(', ', $params) ." }) ;\">".$buttonLabel."</a>";
         
        }
        function sonaar_shortcode_lyrics($atts, $content = null) {
           return '<div class="srmp3_lyrics_shortcode_container"><div class="srmp3_lyrics"></div></div>';
        }
        function sonaar_shortcode_filters( $atts ) {
            extract( shortcode_atts( array(
                'title' => '',
            ), $atts ) );
            
            ob_start();
            
            the_widget('Sonaar_Filters_Widget', $atts, array('widget_id'=>'arbitrary-instance-'.uniqid(), 'before_widget'=>'<div class="sonaar_filters">', 'after_widget'=>'</div>'));
                $output = ob_get_contents();
                ob_end_clean();
                
                return $output;
        }
        function sonaar_shortcode_search( $atts ) {
            extract( shortcode_atts( array(
                'title' => '',
            ), $atts ) );
            
            ob_start();
            
            the_widget('Sonaar_Search_Widget', $atts, array('widget_id'=>'arbitrary-instance-'.uniqid(), 'before_widget'=>'<div class="sonaar_search">', 'after_widget'=>'</div>'));
                $output = ob_get_contents();
                ob_end_clean();
                
                return $output;
        }
        function sonaar_shortcode_chips( $atts ) {
            extract( shortcode_atts( array(
                'title' => '',
            ), $atts ) );
            
            ob_start();
            
            the_widget('Sonaar_Chips_Widget', $atts, array('widget_id'=>'arbitrary-instance-'.uniqid(), 'before_widget'=>'<div class="sonaar_chips">', 'after_widget'=>'</div>'));
                $output = ob_get_contents();
                ob_end_clean();
                
                return $output;
        }
        add_shortcode( 'sonaar_lyrics_placeholder', 'sonaar_shortcode_lyrics' );
        add_shortcode( 'sonaar_ts', 'sonaar_shortcode_time_stamp' );
        if(get_site_option('SRMP3_ecommerce') == '1'){
            add_shortcode( 'sonaar_license', [SRMP3_WooCommerce::class, 'sonaar_shortcode_license']);
        }
        add_shortcode( 'sonaar_filters', 'sonaar_shortcode_filters' );
        add_shortcode( 'sonaar_search', 'sonaar_shortcode_search' );
        add_shortcode( 'sonaar_chips', 'sonaar_shortcode_chips' );
    }

    /* Return TRUE if the POST has track set in the post settings */
    public static function ifPostHasTrack($post){
        $album_tracks = get_post_meta( $post, 'alb_tracklist', true );
        if( is_array($album_tracks) && is_array($album_tracks[0]) && count($album_tracks[0]) > 1 ){
            return true;
        }else{
            return false;
        }
    }

}