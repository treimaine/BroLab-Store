<?php

/**
 *
 * @link              sonaar.io
 * @since             1.0.0
 * @package           Sonaar_Music_Pro
 *
 * @wordpress-plugin
 * Plugin Name:       MP3 Audio Player by Sonaar - Pro Addon
 * Plugin URI:        https://sonaar.io/?utm_source=Sonaar%20Music%20Free%20Plugin&utm_medium=plugin
 * Slug:			  sonaar-music-pro
 * Description:       Unlock the full power of MP3 Audio Player by Sonaar. Many Customizable Options, Unlocked Features and Statistic Reports Available.
 * Version:           5.9.3
 * Author:            Sonaar Music
 * Author URI:        https://sonaar.io/?utm_source=Sonaar%20Music%20Free%20Plugin&utm_medium=plugin
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       sonaar-music-pro
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Currently plugin version.
 * Start at version 1.0.0 and use SemVer - https://semver.org
 * Rename this for your plugin and update it as you release new versions.
 */
define( 'SRMP3PRO_VERSION', '5.9.3'); // important to avoid cache issues on update
define( 'SRMP3_MIN_VERSION', '5.9.3'); // if SRMP3 public is lower than this, show noticifcation to update plugin
define( 'SRMP3_DIRNAME', __FILE__ );
define( 'PLUGIN_INSTALLATION_NAME', plugin_basename(__FILE__) );

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-sonaar-music-pro-activator.php
 */
function activate_sonaar_music_pro() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-sonaar-music-pro-activator.php';
	Sonaar_Music_Pro_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/class-sonaar-music-pro-deactivator.php
 */
function deactivate_sonaar_music_pro() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-sonaar-music-pro-deactivator.php';
	Sonaar_Music_Pro_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'activate_sonaar_music_pro' );
register_deactivation_hook( __FILE__, 'deactivate_sonaar_music_pro' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-sonaar-music-pro.php';
require __DIR__ . '/vendor/autoload.php';
/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function run_sonaar_music_pro() {

	$plugin = new Sonaar_Music_Pro();
	$plugin->run();

}


// Hook to check for database updates or table creation
add_action('plugins_loaded', 'srp_check_database_update');

//Since version 5.8, we have an option srmp3_pro_version
function srp_check_database_update() {
    
    // Check if the current version is different from the stored version
    $installed_version = get_option('srmp3_pro_version');
   
    if( $installed_version === '5.8' ){
        add_action( 'srmp3_cpt_defined', 'transferCollectedEmails_to_cpt');
    }

    if ($installed_version !== SRMP3PRO_VERSION) {
		srp_transfer_options();
        update_option('srmp3_pro_version', SRMP3PRO_VERSION); // Update the version option in the database
    }
}

function transferCollectedEmails_to_cpt(){
    global $wpdb;
    $table_name = $wpdb->prefix . 'srp_ask_for_email';

    // Check if the table exists
    if($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
        return; // Exit if the table doesn't exist
    }
   
    // Retrieve all entries from the old table
    $results = $wpdb->get_results("SELECT * FROM $table_name", ARRAY_A);

    if($results) {
        $success_count = 0; // Counter to keep track of successful insertions

        foreach($results as $row) {
            
            if (!isset($row['email'], $row['firstname'], $row['lastname'], $row['post_id'], $row['track_pos'], $row['track_title'])) {
                continue; // Skip this row if any column is missing
            }
            // Extract data from the row
            $email = $row['email'];
            $user_firstname = $row['firstname'];
            $user_lastname = $row['lastname'];
            $post_id = $row['post_id'];
            $track_pos = $row['track_pos'];
            $track_title = $row['track_title'];

            // Insert a new post into 'sr_email_submission' CPT
            $new_post_id = wp_insert_post(array(
                'post_title'  => $email,
                'post_type'   => 'sr_email_submission',
                'post_status' => 'publish',
                'meta_input'  => array(
                    'user_firstname' => $user_firstname,
                    'user_lastname'  => $user_lastname,
                    'email'          => $email,
                    'post_id'        => $post_id,
                    'action'         => 'download',
                    'track_pos'      => $track_pos,
                    'track_title'    => $track_title,
                )
            ));

            if($new_post_id) {
                $success_count++;
            }
        }
         // Check if all rows were successfully migrated
         if($success_count === count($results)) {
            // All data successfully transferred, so we can drop the old table
            $wpdb->query("DROP TABLE IF EXISTS $table_name");
        }

    }else {
        // If no rows exist, drop the table immediately
        $wpdb->query("DROP TABLE IF EXISTS $table_name");
    }
}

//For people who use version 5.7.1 or below, we transfer the download options into its own tab
function srp_transfer_options(){
	// Get the current 'srmp3_settings_download' options
	$download_options = get_option('srmp3_settings_download', array());
	// Check if the transfer has already been done by looking for 'force_cta_download_label'
	if (isset($download_options['force_cta_download_label'])) {
		return; // Exit if the key already exists in 'srmp3_settings_download'
	}
		
	// Get the current options from 'srmp3_settings_general'
	$general_options = get_option('srmp3_settings_general', array());

	// List of keys to transfer
	$keys_to_transfer = array(
		'force_cta_download_label',
		'force_cta_download',
		'cta_dl_dv_enable_main_settings',
		'cta_dl_dv_state_main_settings',
		'cta_dl_dv_condition_main_settings',
		'cta_dl_dv_role_main_settings',
		'cta_dl_dv_condition_not_met_action',
		'cta_dl_dv_redirection_url_main_settings',
		'cta_dl_dv_enable_redirect_main_settings'
	);

	// Loop through each key and transfer it if it exists in 'srmp3_settings_general'
	foreach ($keys_to_transfer as $key) {
		if (isset($general_options[$key])) {
			$download_options[$key] = $general_options[$key];
		}
	}

	// Update the 'srmp3_settings_download' option with the transferred values
	update_option('srmp3_settings_download', $download_options);
}

add_action('wp_ajax_load_ajax_player', 'load_ajax_player');
add_action('wp_ajax_nopriv_load_ajax_player', 'load_ajax_player');

function load_ajax_player() {
	check_ajax_referer('sonaar_music_ajax_nonce', 'nonce');
	$arrContextOptions=array(
		"ssl"=>array(
			"verify_peer"=>false,
			"verify_peer_name"=>false,
		),
	);

	$sonaarMusicWidgetInstance = new Sonaar_Music_Widget();
    $response = $sonaarMusicWidgetInstance->widget( $_POST['args'], $_POST['parameters']);
	
        // Send the normal response when $response is not null
    echo wp_json_encode($response);
    

	//echo wp_json_encode($response);

	wp_die();
}

add_action( 'wp_ajax_update_user_playlist', 'update_user_playlist' );
add_action( 'wp_ajax_nopriv_update_user_playlist', 'update_user_playlist' );

function update_user_playlist() {
	check_ajax_referer('sonaar_music_ajax_nonce', 'nonce');
    // Check if the request has the necessary data
    if (isset($_POST['playlists'])) {

        // Get the current user
        $user = wp_get_current_user();
        // Update the user meta with the new playlists
        update_user_meta($user->ID, 'sonaar_mp3_playlists', $_POST['playlists']);

		//response is required by ajax
        echo json_encode('Playlist updated successfully');
    } else {
		echo json_encode('No playlist data received');
    }

    // Always die in functions echoing AJAX content
   wp_die(); 
}

add_action('wp_ajax_load_ask_for_email_popup_ajax', 'load_ask_for_email_popup_callback');
add_action('wp_ajax_nopriv_load_ask_for_email_popup_ajax', 'load_ask_for_email_popup_callback');

function load_ask_for_email_popup_callback() {
	check_ajax_referer('sonaar_music_ajax_nonce', 'nonce');
   
    // Get the passed parameters
    $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
    $track_pos = isset($_POST['track_pos']) ? intval($_POST['track_pos']) : 0;
	$track_title = isset($_POST['track_title']) ? sanitize_text_field($_POST['track_title']) : '';
	$image = isset($_POST['image_src']) ? sanitize_text_field($_POST['image_src']) : '';
	$scenario_id = isset($_POST['scenario_id']) ? intval($_POST['scenario_id']) : 0;
	
	// Initialize default values
	$form_title = esc_html__('Free Download', 'sonaar-music');
	$form_desc = esc_html__('Enter your email address and full name to unlock your free download. We will send your free track to the email address.', 'sonaar-music');
	$form_markup = '<p>
	<label for="user_firstname">First Name:</label>
	<input type="text" id="user_firstname" name="user_firstname" required>
	<label for="user_lastname">Last Name:</label>
	<input type="text" id="user_lastname" name="user_lastname" required>
	</p>
	<p>
	<label for="user_email">Email Address:</label>
	<input type="email" id="user_email" name="user_email" required>
	</p>
	<p>
	<button type="submit" class="button alt">Send</button>
	</p>';

	// If scenario_id is provided, fetch metadata from the custom post
	if ($scenario_id) {
        $form_title = get_post_meta($scenario_id, 'download_settings_afe_form_title', true) ?: $form_title;
        $form_desc = get_post_meta($scenario_id, 'download_settings_afe_form_desc', true) ?: $form_desc;
        $form_markup = get_post_meta($scenario_id, 'download_settings_afe_form_markup', true) ?: $form_markup;
    } else {
        // Fallback to Sonaar_Music options if no scenario is defined
        $form_title = Sonaar_Music::get_option('download_settings_afe_form_title', 'srmp3_settings_download') ?: $form_title;
        $form_desc = Sonaar_Music::get_option('download_settings_afe_form_desc', 'srmp3_settings_download') ?: $form_desc;
        $form_markup = Sonaar_Music::get_option('download_settings_afe_form_markup', 'srmp3_settings_download') ?: $form_markup;
    }

	if (!$post_id || !$track_pos) {
       // wp_send_json_error(['message' => 'Missing parameters']);
    }
	
	$form_desc = str_replace(
		array(
			'{{track_title}}',
		),
		array(
			esc_html($track_title),
		),
		$form_desc
	);
	
	

	// Initialize response
	$response = '<div class="srp-popup-form srp-popup-form--askforemail">';
		$response .= '<div class="srp-popup-heading">';
			if (!empty($image)) {
				$response .= '<div class="srp-popup-image"><img src="' . esc_url($image) . '" alt="' . esc_attr($track_title) . '"></div>';
			}
			$response .= '<div class="srp-popup-heading-info">';
			//add the div image
			
				if (!empty($form_title)) {
					$response .= '<h1 class="srp-popup-title">' . esc_html($form_title) . '</h1>';
				}
				if (!empty($form_desc)) {
					$response .= '<div class="srp-popup-desc">' . wpautop($form_desc) . '</div>';
				}
			$response .= '</div>';
		$response .= '</div>';

		$response .= '<div id="srp-dialog-error" style="display: none;"></div>';
		// Add the form markup
		$response .= '<form id="ask-for-email-form">';
		$response .= '<input type="hidden" name="track_title" value="' . esc_attr($track_title) . '">';  // Hidden input for track title
		$response .= $form_markup;
		$response .= '</form>';
	
	// Close the response markup
	$response .= '</div>';
    // Perform your actions here (e.g., store email request, send email, etc.)
    
    // For demo, let's assume the email request is processed successfully
    echo wp_json_encode(['html' => $response], JSON_HEX_TAG);
	wp_die();
}

// Hook for logged-in users and guests
add_action('wp_ajax_srp_ask_for_email_sender', 'srp_ask_for_email_sender_callback');
add_action('wp_ajax_nopriv_srp_ask_for_email_sender', 'srp_ask_for_email_sender_callback');

function srp_ask_for_email_sender_callback() {
    check_ajax_referer('sonaar_music_ajax_nonce', 'nonce');

    global $wpdb;

    // Sanitize the received data
    $email = isset($_POST['user_email']) ? sanitize_email($_POST['user_email']) : '';
    $user_firstname = isset($_POST['user_firstname']) ? sanitize_text_field($_POST['user_firstname']) : '';
    $user_lastname = isset($_POST['user_lastname']) ? sanitize_text_field($_POST['user_lastname']) : '';
    $post_id = isset($_POST['post_id']) ? absint($_POST['post_id']) : 0;
    $track_pos = isset($_POST['track_pos']) ? absint($_POST['track_pos']) : 0;
    $track_title = isset($_POST['track_title']) ? sanitize_text_field($_POST['track_title']) : '';
    $track_id = isset($_POST['track_id']) ? absint($_POST['track_id']) : 0;
	$data_audio_path = isset($_POST['data_audio_path']) ? sanitize_text_field($_POST['data_audio_path']) : '';
	$scenario_id = isset($_POST['scenario_id']) ? absint($_POST['scenario_id']) : 0;
    $scenario_action = isset($_POST['scenario_action']) ? sanitize_text_field($_POST['scenario_action']) : 'download';
    
	// Admin email
    $admin_email = sanitize_email(get_option('admin_email'));
    $admin_user = get_user_by('email', $admin_email);
    $admin_firstname = sanitize_text_field(get_user_meta($admin_user->ID, 'first_name', true));
    $admin_lastname = sanitize_text_field(get_user_meta($admin_user->ID, 'last_name', true));

    // Check if email is valid
    if (!is_email($email)) {
        wp_send_json_error('Invalid email address.');
    }

	// Get custom options based on scenario if scenario_id is available
    if ($scenario_id) {
        $form_title = get_post_meta($scenario_id, 'download_settings_afe_form_title', true) ?: 'Free Download';
        $form_desc = get_post_meta($scenario_id, 'download_settings_afe_form_desc', true) ?: 'Enter your email to download the track.';
        $direct_download_markup = get_post_meta($scenario_id, 'download_settings_afe_direct_download_markup', true) ?: '';
        $email_template = get_post_meta($scenario_id, 'download_settings_afe_email_markup', true) ?: '';
        $email_subject = get_post_meta($scenario_id, 'download_settings_afe_email_subject', true) ?: 'Your Free Download';
        $email_success_notice = get_post_meta($scenario_id, 'download_settings_afe_success_email', true) ?: 'We have sent the download link to your email address.';
        $deliver_method = get_post_meta($scenario_id, 'download_settings_afe_deliver_method', true) ?: 'direct_download';
    } else {
        // Default fallback if no scenario is provided
        $form_title = Sonaar_Music::get_option('download_settings_afe_form_title', 'srmp3_settings_download') ?: 'Free Download';
        $form_desc = Sonaar_Music::get_option('download_settings_afe_form_desc', 'srmp3_settings_download') ?: 'Enter your email to download the track.';
        $direct_download_markup = Sonaar_Music::get_option('download_settings_afe_direct_download_markup', 'srmp3_settings_download');
        $email_template = Sonaar_Music::get_option('download_settings_afe_email_markup', 'srmp3_settings_download');
        $email_subject = Sonaar_Music::get_option('download_settings_afe_email_subject', 'srmp3_settings_download') ?: 'Your Free Download';
        $email_success_notice = Sonaar_Music::get_option('download_settings_afe_success_email', 'srmp3_settings_download') ?: 'We have sent the download link to your email address.';
        $deliver_method = Sonaar_Music::get_option('download_settings_afe_deliver_method', 'srmp3_settings_download') ?: 'direct_download';
    }

    // Fetch track information using $track_id if it's available (elementor widget by example)
    if (!$post_id) {
        // Get the file URL for the attachment
		$mp3_id = $track_id;
		$download_url = esc_url(home_url('/srp_download/' . $mp3_id));
		$download_link = $download_url;
		if (!$track_id) {
			$download_link = $data_audio_path;
		}
        if (!$download_link) {
            wp_send_json_error('Invalid track ID or no file associated with this track.');
        }

        // Set the track title to the attachment title if not provided
        if (empty($track_title)) {
            $track_title = get_the_title($track_id);
        }
    } else {
        // Fall back to the previous logic for $post_id and $track_pos
        $album_tracks = get_post_meta($post_id, 'alb_tracklist', true);

        if (is_array($album_tracks) && isset($album_tracks[$track_pos])) {
            $track = $album_tracks[$track_pos];
            $fileOrStream = sanitize_text_field($track['FileOrStream'] ?? '');

            $download_link = '';

            switch ($fileOrStream) {
                case 'mp3':
                    if (isset($track["track_mp3_id"])) {
                        $mp3_id = absint($track["track_mp3_id"]);
                        $download_url = esc_url(home_url('/srp_download/' . $mp3_id));
                        $download_link = $download_url;
                    }
                    break;

                case 'stream':
                    $download_link = esc_url($track["stream_link"] ?? '');
                    break;

                case 'icecast':
                    $download_link = esc_url($track["icecast_link"] ?? '');
                    break;

                default:
                    wp_send_json_error('Invalid track type.');
                    break;
            }
        } else {
            wp_send_json_error('Invalid track position or no tracks found.');
        }
    }

    // If download link is empty, return error
    if (empty($download_link)) {
        wp_send_json_error('No download link available.');
    }

    // Create a new post in the custom post type 'sr_email_submission'
    $new_post_id = wp_insert_post(array(
        'post_title'  => $email,
        'post_type'   => 'sr_email_submission',
        'post_status' => 'publish',
        'meta_input'  => array(
            'user_firstname' => $user_firstname,
            'user_lastname'  => $user_lastname,
            'email'          => $email,
            'post_id'        => $post_id,
            'action'         => $scenario_action,
            'track_pos'      => $track_pos,
            'track_title'    => $track_title,
            'download_link'  => $download_link,
        )
    ));
    // Loop through additional fields in $_POST
    foreach ($_POST as $field_name => $field_value) {
        // Skip known fields
        if (in_array($field_name, ['nonce', 'action', 'user_email', 'user_firstname', 'user_lastname', 'post_id', 'track_pos', 'track_title', 'track_id', 'data_audio_path'])) {
            continue;
        }

        // Sanitize the field name
        $field_name_sanitized = sanitize_key($field_name);
        
        // Sanitize the field value and add it as post meta
        if (!empty($field_name_sanitized)) {
            update_post_meta($new_post_id, $field_name_sanitized, sanitize_text_field($field_value));
        }
    }

    if ($deliver_method === 'direct_download') {
        // Success message for direct download
        //$direct_download_markup = Sonaar_Music::get_option('download_settings_afe_direct_download_markup', 'srmp3_settings_download');

        $formatted_notice = str_replace(
            array(
                '{{track_title}}',
                '{{download_link}}',
                '{{user_email}}',
                '{{user_firstname}}',
                '{{user_lastname}}',
                '{{admin_firstname}}',
                '{{admin_lastname}}',
                '{{admin_email}}',
                '{{website_url}}',
                '{{website_name}}'
            ),
            array(
                esc_html($track_title),
                esc_url($download_link),
                esc_html($email),
                esc_html($user_firstname),
                esc_html($user_lastname),
                esc_html($admin_firstname),
                esc_html($admin_lastname),
                esc_html($admin_email),
                esc_url(home_url()),
                esc_html(get_bloginfo('name'))
            ),
            $direct_download_markup
        );

        // Send the formatted notice as a response
        wp_send_json_success([
            'formatted_notice' => '<div class="srp-popup-form srp-popup-form--confirm">' . wpautop($formatted_notice) . '</div>',
            'download_link'    => $download_link,
        ]);
        //add $download_link to the response

    } else if ($deliver_method === 'send_email') {
       // Email sending logic
	   $subject = str_replace('{{track_title}}', esc_html($track_title), $email_subject);

	   $message = str_replace(
		   array(
			   '{{admin_firstname}}',
			   '{{admin_lastname}}',
			   '{{admin_email}}',
			   '{{track_title}}',
			   '{{download_link}}',
			   '{{user_email}}',
			   '{{user_firstname}}',
			   '{{user_lastname}}',
			   '{{website_url}}',
			   '{{website_name}}'
		   ),
		   array(
			   esc_html($admin_firstname),
			   esc_html($admin_lastname),
			   esc_html($admin_email),
			   esc_html($track_title),
			   esc_url($download_link),
			   esc_html($email),
			   esc_html($user_firstname),
			   esc_html($user_lastname),
			   esc_url(home_url()),
			   esc_html(get_bloginfo('name'))
		   ),
		   $email_template
	   );
	   $message = wpautop($message);

	   // Set up email headers and send email
	   $headers = array('Reply-To: ' . sanitize_email($admin_email), 'Content-Type: text/html; charset=UTF-8');

	   // Send the email
	   $mail_sent = wp_mail($email, esc_html($subject), $message, $headers);
	   if ($mail_sent) {
		   $email_success_notice = str_replace(
			   array(
				   '{{admin_firstname}}',
				   '{{admin_lastname}}',
				   '{{admin_email}}',
				   '{{track_title}}',
				   '{{download_link}}',
				   '{{user_email}}',
				   '{{user_firstname}}',
				   '{{user_lastname}}',
				   '{{website_url}}',
				   '{{website_name}}'
			   ),
			   array(
				   esc_html($admin_firstname),
				   esc_html($admin_lastname),
				   esc_html($admin_email),
				   esc_html($track_title),
				   esc_url($download_link),
				   esc_html($email),
				   esc_html($user_firstname),
				   esc_html($user_lastname),
				   esc_url(home_url()),
				   esc_html(get_bloginfo('name'))
			   ),
			   $email_success_notice
		   );

		   // Wrap the notice in the title
		   $html_content = '<div class="srp-popup-form srp-popup-form--confirm">' . wpautop($email_success_notice) . '</div>';

		   wp_send_json_success(['formatted_notice' => $html_content]);
	   } else {
		   wp_send_json_error('Failed to send the email.');
	   }
    }
}


add_action('init', 'srp_create_download_endpoint');
function srp_create_download_endpoint() {
    add_rewrite_rule('^srp_download/([^/]*)/?', 'index.php?srp_download=$matches[1]', 'top');
    add_rewrite_tag('%srp_download%', '([^&]+)');
}

add_action('template_redirect', 'srp_download_file');
function srp_download_file() {
    if ($download = get_query_var('srp_download')) {
        $file_path = wp_get_attachment_url($download);
        
        if (file_exists(get_attached_file($download))) {
            header('Content-Description: File Transfer');
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . basename($file_path) . '"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . filesize(get_attached_file($download)));
            readfile(get_attached_file($download));
            exit;
        } else {
            wp_die('File not found.');
        }
    }
}


run_sonaar_music_pro();


