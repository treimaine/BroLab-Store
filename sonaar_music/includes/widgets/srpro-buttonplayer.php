<?php
namespace Elementor;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Elementor\Widget_Base;
use Elementor\Controls_Manager;


/**
 * Elementor Hello World
 *
 * Elementor widget for hello world.
 *
 * @since 1.0.0
 */


class SRPRO_ButtonPlayer {
	public function get_name() {
		return 'sr-buttonplayer';
	}

	public static function register_controls(Element_Base $element) {

		$element->start_controls_section(
			'sr_buttonplayer_section',
			[
				'label' => esc_html__( 'Launch the Sticky Audio Player', 'sonaar-music' ),
				
			]
		);
		$element->add_control(
			'sr_music_cpt_toggle',
			[
				'label' => esc_html__( 'Launch Sticky Audio Player', 'sonaar-music' ),
				'type' => \Elementor\Controls_Manager::SWITCHER,
				'default' => '',
				'description' => esc_html__( 'Important: Make sure the button link parameter is blank in the section above (eg: remove the hashtag #)', 'sonaar-music' ),
				'label_on' => 'Yes',
				'label_off' => 'No',
				'return_value' => 'yes',
			]
		);
		$element->add_control(
			'sr_music_cpt_getlatest',
			[
				'label' => esc_html__( 'Play Most Recent Playlist', 'sonaar-music' ),
				'type' => \Elementor\Controls_Manager::SWITCHER,
				'default' => '',
				'label_on' => 'Yes',
				'label_off' => 'No',
				'return_value' => 'yes',
				'condition' => ['sr_music_cpt_toggle' => 'yes','sr_play_current_id!' => 'yes',],
			]
		);
		$element->add_control(
			'playlist_list',
				[
					'label' => esc_html__( 'Select Playlist(s)', 'sonaar-music' ),
					'label_block' => true,
					'type' => \Elementor\Controls_Manager::SELECT,
					'multiple' => true,
					'options'               => sr_plugin_elementor_select_playlist(),            	
					'condition' => ['sr_music_cpt_toggle' => 'yes', 'sr_play_current_id!' => 'yes', 'sr_music_cpt_getlatest!' => 'yes'],
				]
		);
		$element->add_control(
			'sr_play_current_id',
			[
				'label'							 	=> esc_html__( 'Play its own Post Tracklist', 'sonaar-music' ),
				'description' 						=> esc_html__( 'Check this case if you want to launch the sticky player with the tracks found in this post', 'sonaar-music' ),
				'type' 								=> \Elementor\Controls_Manager::SWITCHER,
				'yes' 								=> esc_html__( 'Yes', 'sonaar-music' ),
				'no' 								=> esc_html__( 'No', 'sonaar-music' ),
				'return_value' 						=> 'yes',
				'default' 							=> '',

			]
		);
		$element->add_control(
			'notrackskip',
			[
				'label'							 	=> esc_html__( 'Stop when track ends', 'sonaar-music' ),
				'type' 								=> \Elementor\Controls_Manager::SWITCHER,
				'yes' 								=> esc_html__( 'Yes', 'sonaar-music' ),
				'' 									=> esc_html__( 'No', 'sonaar-music' ),
				'return_value' 						=> 'on',
				'default' 							=> '',

			]
		);
		$element->add_control(
			'nolooptracklist',
			[
				'label'							 	=> esc_html__( 'Do not loop playlist', 'sonaar-music' ),
				'type' 								=> \Elementor\Controls_Manager::SWITCHER,
				'yes' 								=> esc_html__( 'Yes', 'sonaar-music' ),
				'' 									=> esc_html__( 'No', 'sonaar-music' ),
				'return_value' 						=> 'on',
				'default' 							=> '',

			]
		);

			$element->end_controls_section();

		}

		public static function renderfnc($button) {
			 if( 'button' === $button->get_name() ) {
			    // Get the settings
			    $settings = $button->get_settings();
			    if( $settings['sr_music_cpt_toggle'] =="yes" && $settings['playlist_list'] ||  $settings['sr_play_current_id'] == 'yes') {
					wp_enqueue_style( 'sonaar-music' );
					wp_enqueue_style( 'sonaar-music-pro' );
					wp_enqueue_script( 'sonaar-music-mp3player' );
					wp_enqueue_script( 'sonaar-music-pro-mp3player' );
					wp_enqueue_script( 'sonaar_player' );
					if ( function_exists('sonaar_player') ) {
						add_action('wp_footer','sonaar_player', 12);
					}
			    
					if ( $settings['sr_play_current_id']=='yes' ){ //If "Play its own Post ID track" option is enable
						$display_playlist_ar = get_the_ID();
					} else if( $settings['sr_music_cpt_getlatest'] != 'yes' ){
			    		$display_playlist_ar = $settings['playlist_list'];
			    	} else {
			    		$display_playlist_ar = sr_plugin_elementor_getLatestPost(SR_PLAYLIST_CPT);
			    	
					}

					$notrackskip = (isset($settings['notrackskip']) && $settings['notrackskip'] === 'on') ? ', notrackskip:"on"' : '';
					$notrackskip = (isset($settings['nolooptracklist']) && $settings['nolooptracklist'] === 'on') ? ', nolooptracklist:"on"' : '';
					$audiocall = "javascript:IRON.sonaar.player.setPlayerAndPlay({id:" . $display_playlist_ar . $notrackskip . "})";
					
					//print_r($audiocall);					
					$button->add_render_attribute( 'button', 'href', $audiocall, true );
			    }
			   
			  }
		}
		
		public static function init_control() {
			add_action( 'elementor/element/button/section_button/after_section_end',  [  __CLASS__, 'register_controls' ] );
			add_action( 'elementor/widget/before_render_content', [  __CLASS__, 'renderfnc' ] );

		}
	}
SRPRO_ButtonPlayer::init_control();
