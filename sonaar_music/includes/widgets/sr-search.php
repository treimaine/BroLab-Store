<?php
namespace Elementor;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Background;
use Elementor\Group_Control_Typography;

/**
 * Elementor Hello World
 *
 * Elementor widget for hello world.
 *
 * @since 1.0.0
 */

class SR_Search extends Widget_Base {
	
	public function __construct($data = [], $args = null) {
		parent::__construct($data, $args);
	}

	public function get_script_depends() {
		return [ 'elementor-sonaar' ];
	}
	public function get_name() {
		return 'sonaar-search';
	}

	public function get_title() {
		return esc_html__( 'Search Tracklist', 'sonaar-music' );
	}

	public function get_icon() {
		return 'sricons-logo sonaar-badge--dark sonaar-badge';
	}

	public function get_help_url() {
		return 'https://support.sonaar.io';
	}

	public function get_categories() {
		return [ 'elementor-sonaar' ];
	}

	public function get_keywords() {
		return [ 'mp3', 'search', 'searchbar', 'filter', 'select', 'player', 'tag', 'audio', 'sonaar', 'podcast', 'music', 'beat', 'sermon', 'episode', 'radio' ,'stream', 'sonar', 'sonnar', 'sonnaar', 'music player', 'podcast player'];
	}

	protected function register_controls() {

		$this->start_controls_section(
			'section_content',
			[
				'label' 							=> esc_html__( 'Search Bar', 'sonaar-music' ),
				'tab'   							=> Controls_Manager::TAB_CONTENT,
			]
		);
		$this->add_control(
			'placeholder',
			[
				'label' 						=> esc_html__( 'Placeholder Text', 'sonaar-music' ),
				'type' 							=> Controls_Manager::TEXT,
				'default' 						=> '',
				'placeholder' 					=> esc_html__( 'Enter any keyword', 'sonaar-music' ),
				'separator' 					=> 'after',
				'dynamic' 						=> [
					'active' 					=> true,
				],
			]
		);
		$this->add_control(
			'url_enable',
			[
				'label' 						=> esc_html__( 'Redirect the search to another URL ', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
			]
		);
		$this->add_control(
			'url',
			[
				'label' 						=> esc_html__( 'URL', 'textdomain' ),
				'type' 							=> \Elementor\Controls_Manager::URL,
				'placeholder' 					=> esc_html__( 'https://your-link.com', 'textdomain' ),
				'options' 						=> [ 'url'],
				'default' 						=> [
					'url'						=> '',
					'is_external' 				=> false,
					'nofollow' 					=> false,
					//'custom_attributes' 		=> '',
				],
				'condition' => [
					'url_enable' 				=> 'true',
				],
				'label_block' 					=> true,
			]
		);
		$this->add_control(
			'target_id',
			[
				'label' 						=> esc_html__( 'Target Player ID', 'sonaar-music' ),
				'type' 							=> Controls_Manager::TEXT,
				'separator' 					=> 'before',
				'default' 						=> '',
				'dynamic' 						=> [
					'active' 					=> true,
				],
				'description' 					=> esc_html__( 'Add your player id WITHOUT the Pound key. e.g: my-id. Leave blank if only one player is used in this page', 'sonaar-music' ),
				'style_transfer' 				=> false,
			]
		);
		$this->end_controls_section();
		/**
		 * STYLE: BUTTON STYLE
		 * -------------------------------------------------
		 */
		$this->start_controls_section(
			'filter_bt_style',
			[
				'label'                 		=> esc_html__( 'Search Bar Style', 'sonaar-music' ),
				'tab'                   		=> Controls_Manager::TAB_STYLE,
			]
		);
		$this->add_control(
			'searchbar_placeholdercolor',
			[
				'label'                		 	=> esc_html__( 'Placeholder Color', 'sonaar-music' ),
				'type'                		 	=> Controls_Manager::COLOR,
				'default'            		    => '',
				'selectors'             		=> [
					'{{WRAPPER}} .srp_search_container .srp_search::placeholder' => 'color: {{VALUE}}',
				],
			]
		);
		$this->add_control(
			'searchbar_color',
			[
				'label'                		 	=> esc_html__( 'Keyword Color', 'sonaar-music' ),
				'type'                		 	=> Controls_Manager::COLOR,
				'default'            		    => '',
				'selectors'             		=> [
					'{{WRAPPER}} .srp_search_container .srp_search, {{WRAPPER}} .srp_search_container .fa-search' => 'color: {{VALUE}}',
				],
			]
		);
		$this->add_control(
			'reset_color',
			[
				'label'                		 	=> esc_html__( 'Reset Color', 'sonaar-music' ),
				'type'                		 	=> Controls_Manager::COLOR,
				'default'            		    => '',
				'selectors'             		=> [
					'{{WRAPPER}} .srp_search_container .srp_reset_search' => 'color: {{VALUE}}',
				],
			]
		);
		$this->add_control(
			'searchbar_bg',
			[
				'label'                		 	=> esc_html__( 'Background Color', 'sonaar-music' ),
				'type'                		 	=> Controls_Manager::COLOR,
				'default'            		    => '',
				'selectors'             		=> [
					'{{WRAPPER}} .srp_search_container .srp_search' => 'background: {{VALUE}}',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'searchbar_typo',
				'label' 						=> esc_html__( 'Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp_search_container .srp_search',
				'separator' 					=> 'after',
			]
		);
		$this->add_responsive_control(
			'search_width',
			[
				'label' 						=> esc_html__( 'Width', 'sonaar-music' ) . ' (px)',
				'type'							=> Controls_Manager::SLIDER,
				'range' 						=> [
					'px' 						=> [
						'max' 					=> 2500,
					],
				],
				'size_units' 					=> [ 'px', 'vw', '%' ],
				'selectors' 					=> [
												//'{{WRAPPER}} .iron-audioplayer .sonaar-grid-2' => 'grid-template-columns: auto {{SIZE}}{{UNIT}};',
												'{{WRAPPER}} .srp_search_main' => 'width: {{SIZE}}{{UNIT}};',
				],
				
				//'render_type'					=> 'template',
			]
		);
		$this->add_responsive_control(
			'searchbar_padding',
			[
				'label' 						=> esc_html__( 'Search Bar Padding', 'sonaar-music' ),
				'type' 							=> Controls_Manager::DIMENSIONS,
				'size_units' 					=> [ 'px', 'em', '%' ],
				'selectors' 					=> [
												'{{WRAPPER}} .srp_search_container .srp_search' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->add_control(
			'searchbar_border',
			[
				'label' => esc_html__( 'Border Type', 'sonaar-music' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'none' => esc_html__( 'None', 'elementor' ),
					'solid' => _x( 'Solid', 'Border Control', 'elementor' ),
					'dotted' => _x( 'Dotted', 'Border Control', 'elementor' ),
					'dashed' => _x( 'Dashed', 'Border Control', 'elementor' ),
				],
				'selectors' => [
					'{{WRAPPER}} .srp_search' => 'border-top-style: {{VALUE}};border-bottom-style: {{VALUE}};border-left-style: {{VALUE}};border-right-style: {{VALUE}};',
				],
				'separator' => 'before',
			]
		);
		$this->add_responsive_control(
			'searchbar_border_dimension',
			[
				'label' => esc_html__( 'Width', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp_search' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->add_control(
			'searchbar_border_color',
			[
				'label' => esc_html__( 'Color', 'elementor-pro' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .srp_search' => 'border-color: {{VALUE}};',
				],
			]
		);
		$this->add_responsive_control(
			'searchbar_border_radius',
			[
				'label' => esc_html__( 'Radius', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp_search' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->add_responsive_control(
			'searchbar_container_padding',
			[
				'label' 						=> esc_html__( 'Search Bar Container Padding', 'sonaar-music' ),
				'type' 							=> Controls_Manager::DIMENSIONS,
				'size_units' 					=> [ 'px', 'em', '%' ],
				'selectors' 					=> [
												'{{WRAPPER}} .srp_search_main' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' 							=> 'searchbar_container_bg',
				'label' 						=> esc_html__( 'Search Bar Container Background', 'elementor-sonaar' ),
				'types' 						=> [ 'classic', 'gradient'],
				'selector' 						=> '{{WRAPPER}} .srp_search_main',
			]
		);
		$this->end_controls_section();
	
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		//var_dump($settings['url']);
		$shortcode = '[sonaar_search';
		$shortcode .= (isset($settings['url']['url'])) ? ' url="' . $settings['url']['url'] . '"' : '';
		$shortcode .= ($settings['placeholder']) ? ' placeholder="' . $settings['placeholder'] . '"' : '';
		$shortcode .= ' player_id="' . $settings['target_id'] . '"';
		$shortcode .= ']';
	
		//Attention: double brackets are required if using var_dump to display a shortcode otherwise it will render it!
		//print_r("Shortcode = [" . $shortcode . "]");
		echo do_shortcode( $shortcode );
	}
	public function render_plain_content() {
	}
}
Plugin::instance()->widgets_manager->register( new SR_Search() );