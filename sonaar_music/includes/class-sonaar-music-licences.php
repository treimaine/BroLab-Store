<?php 


add_action( 'wp_ajax_sonaar_music_registerLicence', 'sonaar_music_registerLicence' );
function printPurchasedPlan(){
	$SRMP3_plan = get_site_option('SRMP3_purchased_plan');
	if(!$SRMP3_plan) return 'Unregistered';

	switch ($SRMP3_plan) {
		case '1':
		$SRMP3_plan = 'Starter';
		break;
		case '6':
		$SRMP3_plan = 'Starter with Template Addon';
		break;
		case '5':
		$SRMP3_plan = 'Business';
		break;
		case '7':
		$SRMP3_plan = 'Business with Template Addon';
		break;
		case '3':
		$SRMP3_plan = 'Unlimited';
		break;
		case '4':
		$SRMP3_plan = 'Lifetime';
		break;
		default:
		$SRMP3_plan = false;
		break;
	}
	return $SRMP3_plan;
}
function sonaar_music_registerLicence($localdata) {
	$data = ( $localdata )? $localdata : $_POST['data'];
	$response = update_site_option('sonaar_music_licence', $data['licenceKey']);
	delete_site_transient('sonaar_music_licence');
	delete_site_transient('SRMP3_plugin_update_transient');

	$response = set_site_transient( 'sonaar_music_licence', $data, 7 * DAY_IN_SECONDS );

	//delete_site_option('SRMP3_ecommerce');
	delete_site_option('SRMP3_purchased_plan');

	$data['response'] = (array) $data['response'];

	if(array_key_exists('license_info', $data['response'])){
		$data['response']['license_info'] = (array) $data['response']['license_info'];
		update_site_option('SRMP3_License_Status', $data['response']['license_info']['status']);
		if($data['response']['license_info']['status'] === 'active'){
			add_site_option('SRMP3_purchased_plan', $data['response']['license_info']['price_id']);
			if ($data['response']['license_info']['price_id'] == '3' || $data['response']['license_info']['price_id'] == '4' || $data['response']['license_info']['price_id'] == '5' || $data['response']['license_info']['price_id'] == '7'){
				add_site_option('SRMP3_ecommerce', true);
			}else{
				delete_site_option('SRMP3_ecommerce');
			}
		}
	}
 	
	if ($localdata) {
		return $response;
	}

	 // Create an associative array containing response and price_id
	 $result = array(
        'response' => $data['response'],
        'price_id' => printPurchasedPlan()
    );

	wp_send_json( $result );
}

add_action( 'wp_ajax_sonaar_music_activateRemoteLicence', 'sonaar_music_activateRemoteLicence' );

function sonaar_music_activateRemoteLicence($localdata) {
	global $wp_version;
	$data = ($localdata)? $localdata : $_POST['data'];
	$data['item_id'] = '5816';
	$api_url = 'https://sonaar.io/wp-json/wp/v2/sonaar-api/';
	$user_agent = 'SRMP3PRO/' . SRMP3PRO_VERSION . ' WordPress/' . $wp_version . '; ' . get_bloginfo('url');

	$data = wp_remote_post($api_url, array(
		'body' => array('remotelicence' => $data),
		'headers' => array(
			'User-Agent' => $user_agent
		)
	));


	if ($localdata) {
		return $data;
	}
	
	wp_send_json( $data );
}


function sonaar_music_validateCurrentLicence( $licence ){
	if(get_site_url()!='https://sonaar.io'){
		if ( $licence ) {
			return $licence['licenceKey'];
		}
		
		$response =  sonaar_music_activateRemoteLicence( array(
	    	'licenceKey' => get_site_option('sonaar_music_licence'),
	    	'siteUrl' => $_SERVER['SERVER_NAME']
			)
		);

		if ( is_wp_error( $response ) ){
			return false;
		}
		
		$response =  json_decode($response['body']);

		$register = sonaar_music_registerLicence( array(
			'licenceKey'=> get_site_option('sonaar_music_licence'),
			'response'=> $response
			)
		);

		if (!$register) {
			return false;
		}

		$licence = get_site_transient('sonaar_music_licence');
		return $licence['licenceKey'];
	}
}


if ( is_admin() ) {
	sonaar_music_validateCurrentLicence( get_site_transient('sonaar_music_licence') );

}

add_action( 'wp_ajax_sonaar_music_clearCache', 'sonaar_music_clearCache' );

function sonaar_music_clearCache($type){
	$data = $_POST['data'];

	switch ($data['type']) {
		case 'transient':
			delete_site_transient('sonaar_music_licence');
			delete_site_transient('SRMP3_plugin_update_transient');
			break;
		case 'option':
			delete_site_transient('sonaar_music_licence');
			delete_site_transient('SRMP3_plugin_update_transient');
			delete_site_option('sonaar_music_licence');
			//delete_site_option('SRMP3_ecommerce');
			delete_site_option('SRMP3_purchased_plan');
			break;
		default:

			break;
	}

}

add_action( 'wp_ajax_sonaar_music_invalidateLicense', 'sonaar_music_invalidateLicense' );
function sonaar_music_invalidateLicense(){
	delete_site_transient('SRMP3_plugin_update_transient');
	delete_site_transient('sonaar_music_licence');
	delete_site_option('SRMP3_purchased_plan');
	
}
/*
 * Display Admin Notice when license key expire
 *
 */



add_action( 'plugins_loaded', 'sr_plugin_check' );

function sr_plugin_check(){
	if ( !class_exists( 'Sonaar_Music' ) ){
		add_action( 'admin_notices', 'sonaar_free_required' );
	}else{
		if (SRMP3_MIN_VERSION > SRMP3_VERSION){
			add_action( 'admin_notices', 'sonaar_free_need_update' );
		}
		add_action( 'admin_notices', 'sonnar_admin_notice_license_expire' );
		
	}
}

function sonaar_free_need_update() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	
	$action = 'upgrade-plugin';
	$slug = 'mp3-music-player-by-sonaar';
	$link = wp_nonce_url(
		add_query_arg(
			array(
				'action' => $action,
				'plugin' => $slug
			),
			admin_url( 'update.php' )
		),
		$action.'_'.$slug
	);

	$message = '<p>' . __( 'WordPress requires MP3 Music Player by Sonaar to be updated to v.' . SRMP3_MIN_VERSION . ' or higher. Your audio player might not be working properly', 'sonaar-music-pro' ) . '</p>';
	$message .= '<p>' . sprintf( '<a href="%s" class="button-primary">%s</a>', $link, __( 'Update MP3 Player Now', 'sonaar-music-pro' ) ) . '</p>';
	

	echo '<div class="error"><p>' . $message . '</p></div>';
}

function sonaar_free_required() {
	$plugin = 'mp3-music-player-by-sonaar/sonaar-music.php';

	if ( _is_sonaar_music_installed() ) {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		$activation_url = wp_nonce_url( 'plugins.php?action=activate&amp;plugin=' . $plugin . '&amp;plugin_status=all&amp;paged=1&amp;s', 'activate-plugin_' . $plugin );

		$message = '<p>' . __( 'MP3 Player Pro is not working because you need to activate the MP3 Player Free plugin.', 'sonaar-music-pro' ) . '</p>';
		$message .= '<p>' . sprintf( '<a href="%s" class="button-primary">%s</a>', $activation_url, __( 'Activate MP3 Player Now', 'sonaar-music-pro' ) ) . '</p>';
	} else {
		if ( ! current_user_can( 'install_plugins' ) ) {
			return;
		}

		$action = 'install-plugin';
		$slug = 'mp3-music-player-by-sonaar';
		$link = wp_nonce_url(
			add_query_arg(
				array(
					'action' => $action,
					'plugin' => $slug
				),
				admin_url( 'update.php' )
			),
			$action.'_'.$slug
		);

		$message = '<p>' . __( 'MP3 Player Pro is not working because you need to install the MP3 Player Free plugin.', 'sonaar-music-pro' ) . '</p>';
		$message .= '<p>' . sprintf( '<a href="%s" class="button-primary">%s</a>', $link, __( 'Install MP3 Player Now', 'sonaar-music-pro' ) ) . '</p>';
	}

	echo '<div class="error"><p>' . $message . '</p></div>';
}



if ( ! function_exists( '_is_sonaar_music_installed' ) ) {

	function _is_sonaar_music_installed() {
		$file_path = 'mp3-music-player-by-sonaar/sonaar-music.php';
		$installed_plugins = get_plugins();

		return isset( $installed_plugins[ $file_path ] );
	}
}

function sonnar_admin_notice_license_expire() {
	$sonaar_music_licence = get_site_option('sonaar_music_licence');
	if ( $sonaar_music_licence == '' ) {
		?>
		<div class="notice notice-success is-dismissible">
			<h4><?php esc_html_e( 'Welcome to MP3 Audio Player Pro', 'sonaar-music-pro' ); ?></h4>
			<p><?php echo sprintf( __( 'Please <a href="%1$s" >activate your license</a> to get access to pro features, updates, statistic reports and premium support', 'sonaar-music-pro' ), admin_url( 'edit.php?post_type=' . SR_PLAYLIST_CPT . '&page=sonaar_music_pro_license' ) ); ?></p>
		</div>
		<?php
	}
	
	$sonaar_licence = (array) get_site_transient('sonaar_music_licence');
	if ( $sonaar_music_licence != '' && $sonaar_licence != '' && isset($sonaar_licence['response'])) {
		$sonaar_licence['response'] = (array) $sonaar_licence['response'];

		if(array_key_exists('license_info', $sonaar_licence['response'])){
			$sonaar_licence['response']['license_info'] = (array) $sonaar_licence['response']['license_info'];
		}
		$force_expire = false;
		
		if ( array_key_exists('license_info', $sonaar_licence['response']) && (int)$sonaar_licence['response']['license_info']['expiration'] < strtotime( date('Y-m-d h:i:s') ) ) {
			$force_expire = true;
		}
		if ( array_key_exists('license_info', $sonaar_licence['response']) && ($sonaar_licence['response']['license_info']['status'] == 'expired' || $sonaar_licence['response']['license_info']['status'] == 'disabled') || $force_expire) {	
			if($sonaar_licence['response']['license_info']['price_id'] === '4') return;
			$errror_msg = (isset($sonaar_licence['response']['license_info']['status']) && !$force_expire) ? $sonaar_licence['response']['license_info']['status'] : 'expired';
			delete_site_option('SRMP3_purchased_plan');
			?>
			<div class="notice notice-error is-dismissible">
				<p><?php echo sprintf( __( 'Oh no! Your license key is <strong>' . esc_html( $errror_msg ) . '</strong> and you cannot update your MP3 Audio Player Pro! Make sure to renew your subscription at <a href="%1$s" target="_blank">https://sonaar.io/</a>', 'sonaar-music-pro' ), 'https://sonaar.io/' ); ?></p>
			</div>
			<?php
		}
	}
}