<?php
namespace Elementor;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Base;
use Elementor\Group_Control_Background;
use Elementor\Group_Control_Typography;

/**
 * Elementor Hello World
 *
 * Elementor widget for hello world.
 *
 * @since 1.0.0
 */

class SR_Chips extends Widget_Base {
	
	public function __construct($data = [], $args = null) {
		parent::__construct($data, $args);
	}

	public function get_script_depends() {
		return [ 'elementor-sonaar' ];
	}
	public function get_name() {
		return 'sonaar-chips';
	}

	public function get_title() {
		return esc_html__( 'Chips Result', 'sonaar-music' );
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
		return [ 'mp3', 'chip', 'tag', 'search', 'searchbar', 'filter', 'select', 'player', 'tag', 'audio', 'sonaar', 'podcast', 'music', 'beat', 'sermon', 'episode', 'radio' ,'stream', 'sonar', 'sonnar', 'sonnaar', 'music player', 'podcast player'];
	}

	protected function register_controls() {

		$this->start_controls_section(
			'section_content',
			[
				'label' 							=> esc_html__( 'Chips & Tags', 'sonaar-music' ),
				'tab'   							=> Controls_Manager::TAB_CONTENT,
			]
		);
		$this->add_control(
			'searchbar_searchheading',
			[
				'label' 						=> esc_html__( 'Chips & Tags', 'sonaar-music' ),
				'type' 							=> Controls_Manager::HEADING,
			]
		);
		$this->add_control(
			'hide_clearall',
			[
				'label' 						=> esc_html__( 'Hide Clear All Filter', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'selectors' => [
					'{{WRAPPER}} .srp_chip_clear_all' => 'display:none;',
				],
				//'separator'						=> 'after',
			]
		);
		$this->add_control(
			'clearall_label',
			[
				'label'     => __( 'Clear All Label', 'sonaar-music' ),
				'placeholder' => __( 'Clear All', 'sonaar-music' ),
				'type' 		=> Controls_Manager::TEXT,
				'default' 						=> 'Clear All',
				'label_block' 					=> true,
				'condition' => [
					'hide_clearall' => '',
				],
			]
		);
		$this->add_control(
			'target_id',
			[
				'label' => esc_html__( 'Target Player ID', 'sonaar-music' ),
				'type' => Controls_Manager::TEXT,
				'default' => '',
				'dynamic' => [
					'active' => true,
				],
				'description' => esc_html__( 'Add your player id WITHOUT the Pound key. e.g: my-id. Leave blank if only one player is used in this page', 'sonaar-music' ),
				'style_transfer' => false,
			]
		);
		$this->end_controls_section();
		$this->start_controls_section(
			'chips_style',
			[
				'label'                 		=> esc_html__( 'Chips Style', 'sonaar-music' ),
				'tab'                   		=> Controls_Manager::TAB_STYLE,
			]
		);
		$this->add_responsive_control(
			'filter_justify',
			[
			'label' => esc_html_x( 'Justify Content', 'Flex Container Control', 'elementor' ),
			'type' => Controls_Manager::CHOOSE,
			'label_block' => true,
			'default' => '',
			'options' => [
				'flex-start' => [
					'title' => esc_html_x( 'Start', 'Flex Container Control', 'elementor' ),
					'icon' => 'eicon-flex eicon-justify-start-h',
				],
				'center' => [
					'title' => esc_html_x( 'Center', 'Flex Container Control', 'elementor' ),
					'icon' => 'eicon-flex eicon-justify-center-h',
				],
				'flex-end' => [
					'title' => esc_html_x( 'End', 'Flex Container Control', 'elementor' ),
					'icon' => 'eicon-flex eicon-justify-end-h',
				],
				'space-between' => [
					'title' => esc_html_x( 'Space Between', 'Flex Container Control', 'elementor' ),
					'icon' => 'eicon-flex eicon-justify-space-between-h',
				],
				'space-around' => [
					'title' => esc_html_x( 'Space Around', 'Flex Container Control', 'elementor' ),
					'icon' => 'eicon-flex eicon-justify-space-around-h',
				],
				'space-evenly' => [
					'title' => esc_html_x( 'Space Evenly', 'Flex Container Control', 'elementor' ),
					'icon' => 'eicon-flex eicon-justify-space-evenly-h',
				],
			],
			'selectors' => [
				'{{WRAPPER}} .srp_chips' => 'justify-content: {{VALUE}};',
			],
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'chip_typo',
				'label' 						=> esc_html__( 'Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp_chip',
				'separator' 					=> 'after',
			]
		);
		$this->start_controls_tabs( 'tabs_button_style' );

		$this->start_controls_tab(
			'tab_button_normal',
			[
				'label' 						=> esc_html__( 'Normal', 'elementor' ),
			]
		);
		$this->add_control(
			'chip_color',
			[
				'label'                		 	=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                		 	=> Controls_Manager::COLOR,
				'default'            		    => '',
				'selectors'             		=> [
					'{{WRAPPER}} .srp_chip' => 'color: {{VALUE}};border-color: {{VALUE}}',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' 							=> 'chip_bg',
				'label' 						=> esc_html__( 'Background', 'elementor-sonaar' ),
				'types' 						=> [ 'classic', 'gradient'],
				'exclude' 						=> [ 'image' ],
				'selector' 						=> '{{WRAPPER}} .srp_chip',
				'separator' => 'before',
			]
		);
		$this->add_control(
			'chip_border_color',
			[
				'label' 						=> esc_html__( 'Border Color', 'elementor-pro' ),
				'type' 							=> Controls_Manager::COLOR,
				'selectors' 					=> [
					'{{WRAPPER}} .srp_chip' => 'border-color: {{VALUE}};',
				],
				'separator' 					=> 'before',
			]
		);
		$this->end_controls_tab();
		$this->start_controls_tab(
			'tab_button_hover',
			[
				'label' 						=> esc_html__( 'Hover', 'elementor' ),
			]
		);
		$this->add_control(
			'chip_color_hover',
			[
				'label'                		 	=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                		 	=> Controls_Manager::COLOR,
				'default'            		    => '',
				'selectors'             		=> [
					'{{WRAPPER}} .srp_chip:hover' => 'color: {{VALUE}};border-color: {{VALUE}}',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' 							=> 'chip_bg_hover',
				'label' 						=> esc_html__( 'Background', 'elementor-sonaar' ),
				'types' 						=> [ 'classic', 'gradient'],
				'exclude' 						=> [ 'image' ],
				'selector' 						=> '{{WRAPPER}} .srp_chip:hover',
				'separator'						=> 'before',
			]
		);
		$this->add_control(
			'chip_border_color_hover',
			[
				'label' 						=> esc_html__( 'Border Color', 'elementor-pro' ),
				'type' 							=> Controls_Manager::COLOR,
				'selectors' 					=> [
					'{{WRAPPER}} .srp_chip:hover' => 'border-color: {{VALUE}};',
				],
				'separator' 					=> 'before',
			]
		);

		$this->end_controls_tab();
		$this->end_controls_tabs();

		$this->add_responsive_control(
			'chip_padding',
			[
				'label' 						=> esc_html__( 'Padding', 'sonaar-music' ),
				'type' 							=> Controls_Manager::DIMENSIONS,
				'size_units' 					=> [ 'px', 'em', '%' ],
				'selectors' 					=> [
												'{{WRAPPER}} .srp_chip' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'separator' => 'before',

			]
		);
		$this->add_control(
			'chip_border',
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
					'{{WRAPPER}} .srp_chip' => 'border-top-style: {{VALUE}};border-bottom-style: {{VALUE}};border-left-style: {{VALUE}};border-right-style: {{VALUE}};',
				],
				'separator' => 'before',
			]
		);
		$this->add_responsive_control(
			'chip_border_dimension',
			[
				'label' => esc_html__( 'Border Width', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp_chip' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->add_responsive_control(
			'chip_border_radius',
			[
				'label' => esc_html__( 'Chip Radius', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp_chip' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		
		$this->end_controls_section();


		/**
		* STYLE: clear ALL BUTTON
		* -------------------------------------------------
		*/


		$this->start_controls_section(
			'clear_style',
			[
				'label'                 		=> esc_html__( 'Clear All Style', 'sonaar-music' ),
				'tab'                   		=> Controls_Manager::TAB_STYLE,
				'condition' => [
					'hide_clearall' => '',
				],
			]
		);
		$this->add_control(
			'clear_margin',
			[
				'label' 						=> esc_html__( 'Move Clear All Button to the right', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> 'true',
				'return_value' 					=> 'true',
				'selectors' => [
					'{{WRAPPER}} .srp_chip_clear_all' => 'margin-left:auto;',
				],
				//'separator'						=> 'after',
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'clear_typo',
				'label' 						=> esc_html__( 'Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp_chip_clear_all',
				'separator' 					=> 'after',
			]
		);
		$this->start_controls_tabs( 'clear_tabs_button_style' );

		$this->start_controls_tab(
			'clear_tab_button_normal',
			[
				'label' 						=> esc_html__( 'Normal', 'elementor' ),
			]
		);
		$this->add_control(
			'clear_color',
			[
				'label'                		 	=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                		 	=> Controls_Manager::COLOR,
				'default'            		    => '',
				'selectors'             		=> [
					'{{WRAPPER}} .srp_chip_clear_all' => 'color: {{VALUE}};border-color: {{VALUE}}',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' 							=> 'clear_bg',
				'label' 						=> esc_html__( 'Background', 'elementor-sonaar' ),
				'types' 						=> [ 'classic', 'gradient'],
				'exclude' 						=> [ 'image' ],
				'selector' 						=> '{{WRAPPER}} .srp_chip_clear_all',
				'separator' => 'before',
			]
		);
		$this->add_control(
			'clear_border_color',
			[
				'label' 						=> esc_html__( 'Border Color', 'elementor-pro' ),
				'type' 							=> Controls_Manager::COLOR,
				'selectors' 					=> [
					'{{WRAPPER}} .srp_chip_clear_all' => 'border-color: {{VALUE}};',
				],
				'separator' 					=> 'before',
			]
		);
		$this->end_controls_tab();
		$this->start_controls_tab(
			'clear_tab_button_hover',
			[
				'label' 						=> esc_html__( 'Hover', 'elementor' ),
			]
		);
		$this->add_control(
			'clear_color_hover',
			[
				'label'                		 	=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                		 	=> Controls_Manager::COLOR,
				'default'            		    => '',
				'selectors'             		=> [
					'{{WRAPPER}} .srp_chip_clear_all:hover' => 'color: {{VALUE}};border-color: {{VALUE}}',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' 							=> 'clear_bg_hover',
				'label' 						=> esc_html__( 'Background', 'elementor-sonaar' ),
				'types' 						=> [ 'classic', 'gradient'],
				'exclude' 						=> [ 'image' ],
				'selector' 						=> '{{WRAPPER}} .srp_chip_clear_all:hover',
				'separator'						=> 'before',
			]
		);
		$this->add_control(
			'clear_border_color_hover',
			[
				'label' 						=> esc_html__( 'Border Color', 'elementor-pro' ),
				'type' 							=> Controls_Manager::COLOR,
				'selectors' 					=> [
					'{{WRAPPER}} .srp_chip_clear_all:hover' => 'border-color: {{VALUE}};',
				],
				'separator' 					=> 'before',
			]
		);

		$this->end_controls_tab();
		$this->end_controls_tabs();

		$this->add_responsive_control(
			'clear_padding',
			[
				'label' 						=> esc_html__( 'Padding', 'sonaar-music' ),
				'type' 							=> Controls_Manager::DIMENSIONS,
				'size_units' 					=> [ 'px', 'em', '%' ],
				'selectors' 					=> [
												'{{WRAPPER}} .srp_chip_clear_all' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'separator' => 'before',

			]
		);
		$this->add_control(
			'clear_border',
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
					'{{WRAPPER}} .srp_chip_clear_all' => 'border-top-style: {{VALUE}};border-bottom-style: {{VALUE}};border-left-style: {{VALUE}};border-right-style: {{VALUE}};',
				],
				'separator' => 'before',
			]
		);
		$this->add_responsive_control(
			'clear_border_dimension',
			[
				'label' => esc_html__( 'Border Width', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp_chip_clear_all' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->add_responsive_control(
			'clear_border_radius',
			[
				'label' => esc_html__( 'Chip Radius', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp_chip_clear_all' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		
		$this->end_controls_section();

	
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$shortcode = '[sonaar_chips';
		$shortcode .= (isset($settings['hide_clearall']) && $settings['hide_clearall'] === 'true') ? ' hide_clearall="true"' : '';
		$shortcode .= (isset($settings['clearall_label']) && $settings['clearall_label'] !== '') ? ' clearall_label="' . $settings['clearall_label'] . '"' : '';
		$shortcode .= ' player_id="' . $settings['target_id'] . '"';
		$shortcode .= ']';
	
		//Attention: double brackets are required if using var_dump to display a shortcode otherwise it will render it!
		//print_r("Shortcode = [" . $shortcode . "]");
		echo do_shortcode( $shortcode );
	}
	public function render_plain_content() {
	}
}
Plugin::instance()->widgets_manager->register( new SR_Chips() );