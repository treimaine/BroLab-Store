<?php
namespace Elementor;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Sonaar_Music;
use Sonaar_Music_Admin;
/**
 * Elementor Hello World
 *
 * Elementor widget for hello world.
 *
 * @since 1.0.0
 */

class SR_Filters extends Widget_Base {
	
	public $fields_groups;
	
	public function __construct($data = [], $args = null) {
		parent::__construct($data, $args);
	}

	public function get_script_depends() {
		return [ 'vue-multiselect' ];
	}
	public function get_name() {
		return 'sonaar-filters';
	}

	public function get_title() {
		return esc_html__( 'Filter Select & Tags', 'sonaar-music' );
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
		return [ 'mp3', 'filter', 'dropdown' ,'category', 'select', 'player', 'column', 'tag', 'audio', 'sonaar', 'podcast', 'music', 'beat', 'sermon', 'episode', 'radio' ,'stream', 'sonar', 'sonnar', 'sonnaar', 'music player', 'podcast player'];
	}
private function get_acf_fields_for_elementor( $field_types = ['select', 'checkbox', 'radio', 'taxonomy'] ) {
	// Check if ACF is active and functions exist
	if ( ! function_exists( 'acf_get_field_groups' ) || ! function_exists( 'acf_get_fields' ) ) {
		return [];
	}

	$acf_groups = acf_get_field_groups();
	$grouped_fields = [];

	if ( ! empty( $acf_groups ) ) {
		foreach ( $acf_groups as $group ) {
			$group_fields = acf_get_fields( $group['key'] );
			$fields_for_group = [];

			if ( ! empty( $group_fields ) ) {
				foreach ( $group_fields as $field ) {
					// Check if the field type matches the given types
					if ( in_array( $field['type'], $field_types ) ) {
						$fields_for_group[ $field['key'] ] = $field['label'];
					}
				}
			}

			if (!empty($fields_for_group)) {
				$grouped_fields[] = [
					'label' => $group['title'],  // Using the field group title as the label
					'options' => $fields_for_group
				];
			}
		}
	}

	return $grouped_fields;
}

	protected function register_controls() {

		$this->start_controls_section(
			'section_content',
			[
				'label' 							=> esc_html__( 'Audio Player Filters', 'sonaar-music' ),
				'tab'   							=> Controls_Manager::TAB_CONTENT,
			]
		);
		
		$this->add_control(
			'filter_type',
			[
				'label'					=> esc_html__( 'Filter Type ', 'sonaar-music' ),
				'type' 					=> Controls_Manager::SELECT,
				'label_block'			=> false,
				'options' 				=> [
									'dropdowns' => 'Dropdown',
									'tags' 		=> 'Tags',
									'range' 	=> 'Range Slider',
				],
				'default' 				=> 'dropdowns',
			]
		);

		$this->add_control(
			'range_notice',
			[
				'raw' => '<strong>' . __( 'Range Slider Notice:', 'sonaar-music' ) . '</strong> ' . __( 'The Range Slider only works with Lazyload pagination. You can enable Lazyload by editing your player widget and go to Style Tab > Pagination', 'sonaar-music' ),
				'type' => Controls_Manager::RAW_HTML,
				'content_classes' => 'elementor-panel-alert elementor-panel-alert-info',
				'render_type' => 'ui',
				'condition' => [
					'filter_type' => 'range',
				],
			]
		);


		$range_repeater = new \Elementor\Repeater();
		$range_repeater->add_control(
			'filter_name',
			[
				'label'     => __( 'Filter Title', 'sonaar-music' ),
				'type' 		=> Controls_Manager::TEXT,
				'dynamic' 						=> [
					'active' 					=> true,
				],
				'default' 						=> '',
				'label_block' 					=> true,
			]
		);
		$range_repeater->add_control(
			'filter_source',
			[
				'label'					=> esc_html__( 'Source ', 'sonaar-music' ),
				'type' 					=> Controls_Manager::SELECT,
				'label_block'			=> false,
				'options'				=> $this->check_column_plugin_activated('range'),
				'default' 				=> 'object',
			]
		);
		
		$range_repeater->add_control(
			'filter_acf',
			[
				'label'     => __( 'ACF Field', 'sonaar-music' ),
				'description' => esc_html__( 'Only field type Number is accepted', 'sonaar-music' ),
				'type'      => \Elementor\Controls_Manager::SELECT,
				'default'   => '',
				'groups'    => $this->get_acf_fields_for_elementor(['number']),
				'condition' => [
					'filter_source' => 'acf',
				],
			]
		);
		$range_repeater->add_control(
			'filter_object',
			[
				'label'     => __( 'Object Field', 'sonaar-music' ),
				'type'      => \Elementor\Controls_Manager::SELECT,
				'groups'    => $this->get_object_fields('range'),
				'default' 	=> '',
				'condition' => [
					'filter_source' => 'object',
				],
			]
		);
		$range_repeater->add_control(
			'filter_key', [
				'label'     => __( 'Custom Meta Key', 'sonaar-music' ),
				'description' => esc_html__( 'Only custom key that outputs an array with multiple choices are accepted', 'sonaar-music' ),
				'type' => \Elementor\Controls_Manager::TEXT,
				'label_block' => true,
				'condition' => [
					'filter_source' => 'customkey',
				],
			]
		);
		$range_repeater->add_control(
			'filter_selecttype',
				[
					'label' 					=> esc_html__( 'Select Type', 'sonaar-music' ),
					'type' 						=> Controls_Manager::SELECT,
					'options' => [
						'tempo' 			=> esc_html__( 'Tempo', 'sonaar-music' ),
						'time' 				=> esc_html__( 'Duration', 'sonaar-music' ),
						'other' 			=> esc_html__( 'Other', 'sonaar-music' ),
					],
					'separator' 				=> 'before',
					'default'					=> 'tempo',
				]
		);
		$range_repeater->add_control(
			'filter_min',
			[
				'label'     => __( 'Min value', 'sonaar-music' ),
				'type' 		=> Controls_Manager::TEXT,
				'default' 						=> '',
				'placeholder' => __( 'eg: 20 or 00:15', 'sonaar-music' ),
				'label_block' 					=> true,
			]
		);
		$range_repeater->add_control(
			'filter_max',
			[
				'label'     => __( 'Max value', 'sonaar-music' ),
				'type' 		=> Controls_Manager::TEXT,
				'default' 						=> '100',
				'placeholder' => __( 'eg: 240 or 02:59:15', 'sonaar-music' ),
				'label_block' 					=> true,
			]
		);
		$range_repeater->add_control(
			'filter_unit',
			[
				'label'     => __( 'Unit Text Suffix', 'sonaar-music' ),
				'placeholder' => __( 'eg: bpm or seconds', 'sonaar-music' ),
				'type' 		=> Controls_Manager::TEXT,
				'default' 						=> '',
				'label_block' 					=> true,
			]
		);
		$this->add_control(
			'range_repeater',
			[
				'label' => esc_html__( 'Add New Filter', 'sonaar-music' ),
				'type' => \Elementor\Controls_Manager::REPEATER,
				'prevent_empty' => false,
				'fields' => $range_repeater->get_controls(),
				'title_field' => '{{{ filter_name }}}  <# if ( "object" == filter_source ) { #> :: {{{ filter_object }}} <# } #> <# if ( "acf" == filter_source ) { #> :: {{{ filter_acf }}} <# } #> <# if ( "jetengine" == filter_source ) { #> :: {{{ filter_jetengine }}} <# } #> <# if ( "customkey" == filter_source ) { #> :: {{{ filter_key }}} <# } #>',
				'condition' => [
					'filter_type' => 'range',
				],
				
			]
		);

		$filter_repeater = new \Elementor\Repeater();
		$filter_repeater->add_control(
			'filter_name',
			[
				'label'     => __( 'Filter Title', 'sonaar-music' ),
				'type' 		=> Controls_Manager::TEXT,
				'dynamic' 						=> [
					'active' 					=> true,
				],
				'default' 						=> '',
				'label_block' 					=> true,
			]
		);
		$filter_repeater->add_control(
			'filter_source',
			[
				'label'					=> esc_html__( 'Source ', 'sonaar-music' ),
				'type' 					=> Controls_Manager::SELECT,
				'label_block'			=> false,
				'options'				=> $this->check_column_plugin_activated(),
				'default' 				=> 'object',
			]
		);
		$filter_repeater->add_control(
			'filter_acf',
			[
				'label'     => __( 'ACF Field', 'sonaar-music' ),
				'description' => esc_html__( 'Only field types Select/Checkbox/Radio or Taxonomy are accepted', 'sonaar-music' ),
				'type'      => \Elementor\Controls_Manager::SELECT,
				'default'   => '',
				'groups'    => $this->get_acf_fields_for_elementor(['select', 'checkbox', 'radio', 'taxonomy']),
				'condition' => [
					'filter_source' => 'acf',
				],
			]
		);
		if (function_exists('jet_engine')){
			$meta_fields = $this->get_meta_fields_for_post_type();
			if ( ! empty( $meta_fields ) ) {
				$filter_repeater->add_control(
					'filter_jetengine',
					[
						'label'     => __( 'Meta Field', 'sonaar-music' ),
						'description' => esc_html__( 'Only metafield types Select/Checkbox or Radio are accepted', 'sonaar-music' ),
						'type'      => \Elementor\Controls_Manager::SELECT,
						'default'   => '',
						'groups'    => $meta_fields,
						'condition' => [
							'filter_source' => 'jetengine',
						],
					]
				);
			}
		}
		$filter_repeater->add_control(
			'filter_object',
			[
				'label'     => __( 'Object Field', 'sonaar-music' ),
				'type'      => \Elementor\Controls_Manager::SELECT,
				'default'   => '',
				'groups'    => $this->get_object_fields(),
				'condition' => [
					'filter_source' => 'object',
				],
			]
		);
		$filter_repeater->add_control(
			'filter_key', [
				'label'     => __( 'Custom Meta Key', 'sonaar-music' ),
				'description' => esc_html__( 'Only custom key that outputs an array with multiple choices are accepted', 'sonaar-music' ),
				'type' => \Elementor\Controls_Manager::TEXT,
				'label_block' => true,
				'condition' => [
					'filter_source' => 'customkey',
				],
			]
		);
		$filter_repeater->add_control(
			'filter_selecttype',
				[
					'label' 					=> esc_html__( 'Select Type', 'sonaar-music' ),
					'type' 						=> Controls_Manager::SELECT,
					'options' => [
						'singleselect' 			=> esc_html__( 'Single Select', 'sonaar-music' ),
						'multiselect' 			=> esc_html__( 'Multiple Select - Relation (All)', 'sonaar-music' ),
						'multiselect_or' 		=> esc_html__( 'Multiple Select - Relation (OR)', 'sonaar-music' ),
					],
					'separator' 				=> 'before',
					'default'					=> 'singleselect',
				]
		);
		$this->add_control(
			'filter_repeater',
			[
				'label' => esc_html__( 'Add New Filter', 'sonaar-music' ),
				'type' => \Elementor\Controls_Manager::REPEATER,
				'prevent_empty' => false,
				'fields' => $filter_repeater->get_controls(),
				'title_field' => '{{{ filter_name }}}  <# if ( "object" == filter_source ) { #> :: {{{ filter_object }}} <# } #> <# if ( "acf" == filter_source ) { #> :: {{{ filter_acf }}} <# } #> <# if ( "jetengine" == filter_source ) { #> :: {{{ filter_jetengine }}} <# } #> <# if ( "customkey" == filter_source ) { #> :: {{{ filter_key }}} <# } #>',
				'condition' => [
					'filter_type!' => 'range',
				],
				
			]
		);

		$this->add_responsive_control(
			'items_per_page',
			[
				'label' 				=> esc_html__( 'How many items to list initially?', 'sonaar-music' ),
				'description' 			=> esc_html__( 'If an number is specified, a Show More button will be displayed below the item list', 'sonaar-music' ),
				'type' 					=> Controls_Manager::NUMBER,
				'default' 				=> '',
				'dynamic' 				=> [
					'active' 			=> true,
				],
				'condition' 			=> [
					'filter_type' 		=> 'tags',
				],
			]
		);
		$this->add_control(
			'show_more_label',
			[
				'label' 				=> esc_html__( 'Show More Label', 'sonaar-music' ),
				'type' 					=> Controls_Manager::TEXT,
				'default'				=> __('Show More', 'sonaar-music'),
				'dynamic' 				=> [
					'active' 			=> true,
				],
				'condition' 			=> [
					'items_per_page!' 	=> '',
				],
			]
		);
		$this->add_control(
			'show_less_label',
			[
				'label' 				=> esc_html__( 'Show Less Label', 'sonaar-music' ),
				'type' 					=> Controls_Manager::TEXT,
				'default' 				=> __('Show Less', 'sonaar-music'),
				'dynamic' 				=> [
					'active' 			=> true,
				],
				'condition' 			=> [
					'items_per_page!' 	=> '',
				],
			]
		);
		$this->add_responsive_control(
			'filter_open_on_init',
			[
				'label' 						=> __( 'Display Dropdown Open<br>(Can close)', 'sonaar-music' ),
				'render_type'					=> 'template',
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'separator'						=> 'before',
				'condition' => [
					'filter_type' => 'dropdowns',
				],
			]
		);
		$this->add_responsive_control(
			'filter_close_on_select',
			[
				'label' 						=> __( 'Close on Select', 'sonaar-music' ),
				'render_type' 					=> 'template',
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'separator'						=> 'before',
				'condition' => [
					'filter_type' => 'dropdowns',
				],
			]
		);
		$this->add_responsive_control(
			'filter_searchable',
			[
				'label' 						=> __( 'Add Search in the Dropdown', 'sonaar-music' ),
				'render_type' 					=> 'template',
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'separator'						=> 'before',
				'condition' => [
					'filter_type' => 'dropdowns',
				],
			]
		);
		$this->add_responsive_control(
			'filter_open_always',
			[
				'label' 						=> __( 'Display Dropdown Always Open<br>(Cannot Close)', 'sonaar-music' ),
				'render_type' 					=> 'template',
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'separator'						=> 'before',
				'condition' => [
					'filter_type' => 'dropdowns',
				],
			]
		);
		$this->add_responsive_control(
			'filter_position_relative',
			[
				'label' 						=> esc_html__( 'Move Content Below when Dropdown Open', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'separator'						=> 'before',
				'selectors' => [
					'{{WRAPPER}} .multiselect__content-wrapper' => 'position:relative;',
				],
				'condition' => [
					'filter_type' => 'dropdowns',
				],
			]
		);
		$this->add_control(
			'target_id',
			[
				'label' 			=> esc_html__( 'Target Player ID', 'sonaar-music' ),
				'description' 		=> esc_html__( 'Add your player id WITHOUT the Pound key. e.g: my-id. Leave blank if only one player is used in this page', 'sonaar-music' ),
				'separator'			=> 'before',
				'type' 				=> Controls_Manager::TEXT,
				'default'			=> '',
				'dynamic' 			=> [
					'active' 		=> true,
				],
				'style_transfer' 	=> false,
			]
		);
		$this->end_controls_section();
		/**
		 * STYLE: DROPDOWN STYLE
		 * -------------------------------------------------
		 */
		$this->start_controls_section(
			'filter_style',
			[
				'label'                 		=> esc_html__( 'Dropdown Style', 'sonaar-music' ),
				'tab'                   		=> Controls_Manager::TAB_STYLE,
				'condition' => [
					'filter_type' => 'dropdowns',
				],
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
				'{{WRAPPER}} .srp-filters-container' => 'justify-content: {{VALUE}};',
			],
			]
		);
		$this->add_control(
			'filter_color',
			[
				'label'                 		=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> 'before',
				'selectors'             		=> [
												'{{WRAPPER}} .srp-filters-widget' => 'color:{{VALUE}};',
												'{{WRAPPER}} .srp-filters-widget .multiselect__tags' => 'color:{{VALUE}};border-color:{{VALUE}};',
												'{{WRAPPER}} .srp-filters-widget .multiselect__select:before' => 'border-color:{{VALUE}} transparent transparent transparent;',
												'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper' => 'color:{{VALUE}};border-color:{{VALUE}};',
				],
			]
		);
		$this->add_control(
			'filter_bg_color',
			[
				'label'                 		=> esc_html__( 'Background Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp-filters-widget .multiselect__tags' => 'background-color:{{VALUE}};',
												'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'filter_typography',
				'label' 						=> esc_html__( 'Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp-filters-widget',
			]
		);
		$this->add_responsive_control(
			'filter_width',
			[
				'label' 						=> esc_html__( 'Dropdown Width', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SLIDER,
				'size_units' => [ 'px','%' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 1000,
						'step' => 1,
					],
					
				],
				'default' 						=> [
						'unit' => 'px',
						'size' => 200,
						],
				'separator' => 'before',
				'selectors' 					=> [
					'{{WRAPPER}} .srp-filters-widget' => 'width: {{SIZE}}{{UNIT}};',
				],
			]
		);
		$this->add_responsive_control(
			'filter_height',
			[
				'label' 						=> esc_html__( 'Dropdown Selector Height (px)', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 100,
						'step' => 1,
					],
					
				],
				'default' 						=> [
						'unit' => 'px',
						'size' => 30,
						],
				'selectors' 					=> [
					'{{WRAPPER}} .srp-filters-container .multiselect__tags' => 'height: {{SIZE}}{{UNIT}};',
				],
			]
		);
		$this->add_control(
			'filter_border',
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
					'{{WRAPPER}} .srp-filters-widget .multiselect__tags' => 'border-top-style: {{VALUE}};border-bottom-style: {{VALUE}};border-left-style: {{VALUE}};border-right-style: {{VALUE}};',
					'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper' => 'border-top-style: {{VALUE}};border-bottom-style: {{VALUE}};border-left-style: {{VALUE}};border-right-style: {{VALUE}};',
				],
				'separator' => 'before',
			]
		);
		$this->add_responsive_control(
			'filter_border_dimension',
			[
				'label' => esc_html__( 'Width', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp-filters-widget .multiselect__tags' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
					'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'condition' => [
					'filter_border!' => 'none',
				],
			]
		);
		$this->add_control(
			'filter_border_color',
			[
				'label' => esc_html__( 'Color', 'elementor-pro' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .srp-filters-widget .multiselect__tags' => 'border-color: {{VALUE}};',
					'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper'  => 'border-color: {{VALUE}};',
				],
				'condition' => [
					'filter_border!' => 'none',
				],
			]
		);
		$this->add_responsive_control(
			'filter_border_radius',
			[
				'label' => esc_html__( 'Radius', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp-filters-widget .multiselect__tags' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->end_controls_section();
		$this->start_controls_section(
			'filter_box_style',
			[
				'label'                 		=> esc_html__( 'Dropdown Options Style', 'sonaar-music' ),
				'tab'                   		=> Controls_Manager::TAB_STYLE,
				'condition' => [
					'filter_type' => 'dropdowns',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'filter_box_typography',
				'label' 						=> esc_html__( 'Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper',
			]
		);
		$this->add_responsive_control(
			'filter_value_height',
			[
				'label' 						=> esc_html__( 'Dropdown Max Height (px)', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SLIDER,
				'size_units' => [ 'px', ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 2000,
						'step' => 1,
					],
					
				],
				'selectors' 					=> [
					'{{WRAPPER}} .multiselect__content-wrapper' => 'max-height: {{SIZE}}{{UNIT}}!important;',
				],
			]
		);
		$this->add_responsive_control(
			'filter_box_space',
			[
				'label' 					=> esc_html__( 'Space Top', 'sonaar-music' ) . ' (px)',
				'type' 						=> Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' 					=> [
					'px' 					=> [
						'min'				=> 0,
						'max' 				=> 100,
					],
				],
				'selectors' 				=> [
							'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper' => 'top: {{SIZE}}px;',
				],
			]
		);
		$this->add_responsive_control(
			'filter_box_item_padding',
			[
				'label' => esc_html__( 'Item Padding', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .multiselect__option' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->start_controls_tabs( 'filter_box_colors' );
		$this->start_controls_tab(
			'filter_box_normal',
			[
				'label' 						=> esc_html__( 'Normal', 'elementor' ),
			]
		);
		$this->add_control(
			'filter_box_color',
			[
				'label'                 		=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper' => 'color:{{VALUE}};',
				],
			]
		);
		$this->add_control(
			'filter_box_bg_color',
			[
				'label'                 		=> esc_html__( 'Background Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->end_controls_tab();
		$this->start_controls_tab(
			'filter_box_hover',
			[
				'label' 						=> esc_html__( 'Hover', 'elementor' ),
			]
		);
		$this->add_control(
			'filter_box_color_ho',
			[
				'label'                 		=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper .multiselect__option:hover' => 'color:{{VALUE}};',
				],
			]
		);
		$this->add_control(
			'filter_box_bg_color_ho',
			[
				'label'                 		=> esc_html__( 'Background Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper .multiselect__option:hover' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->end_controls_tab();
		$this->end_controls_tabs();
		$this->add_control(
			'filter_box_separator_color',
			[
				'label'                 		=> esc_html__( 'Separator Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> 'before',
				'selectors'             		=> [
												'{{WRAPPER}} .srp-filters-widget li.multiselect__element' => 'border-bottom-color:{{VALUE}};',
				],
			]
		);
		$this->add_control(
			'filter_box_border',
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
					'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper' => 'border-top-style: {{VALUE}};border-bottom-style: {{VALUE}};border-left-style: {{VALUE}};border-right-style: {{VALUE}};',
				],
			]
		);
		$this->add_responsive_control(
			'filter_box_border_dimension',
			[
				'label' => esc_html__( 'Width', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->add_control(
			'filter_box_border_color',
			[
				'label' => esc_html__( 'Color', 'elementor-pro' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper'  => 'border-color: {{VALUE}};',
				],
			]
		);
		$this->add_responsive_control(
			'filter_box_border_radius',
			[
				'label' => esc_html__( 'Radius', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp-filters-widget .multiselect__content-wrapper' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
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
				'label'                 		=> esc_html__( 'Button Style', 'sonaar-music' ),
				'tab'                   		=> Controls_Manager::TAB_STYLE,
				'condition' => [
					'filter_type' => 'tags',
				],
			]
		);
		$this->add_control(
			'filter_bt_hide_label',
			[
				'label' 						=> esc_html__( 'Hide Label', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'selectors' => [
					'{{WRAPPER}} .srp_filter_button_label' => 'display:none;',
				],
				//'separator'						=> 'after',
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'filter_bt_label_typo',
				'label' 						=> esc_html__( 'Label Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp_filter_button_label',
				'condition' => [
					'filter_bt_hide_label' => '',
				],
			]
		);
		$this->add_control(
			'filter_bt_label_color',
			[
				'label'                 		=> esc_html__( 'Label Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> 'after',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button_label' => 'color:{{VALUE}};',
				],
				'condition' => [
					'filter_bt_hide_label' => '',
				],
			]
		);
		$this->add_control(
			'filter_bt_random_color',
			[
				'label' 						=> esc_html__( 'Use Rainbow Colors on Active', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> 'false',
				'return_value' 					=> 'true',
				'separator'						=> 'after',
			]
		);
		$this->add_responsive_control(
			'filter_space_between_container',
			[
				'label' 					=> esc_html__( 'Space Between Container', 'sonaar-music' ) . ' (px)',
				'type' 						=> Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' 					=> [
					'px' 					=> [
						'min'				=> 0,
						'max' 				=> 100,
					],
				],
				'selectors' 				=> [
							'{{WRAPPER}} .srp_filter_container:not(:last-child)' => 'margin-bottom: {{SIZE}}px;',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'filter_bt_typo',
				'label' 						=> esc_html__( 'Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp_filter_button',
			]
		);
		$this->add_responsive_control(
			'filter_bt_justify',
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
				'{{WRAPPER}} .srp_filter_buttons_list,{{WRAPPER}} .srp_filter_button_label ' => 'justify-content: {{VALUE}};',
			],
			]
		);
		$this->start_controls_tabs( 'filter_bt_colors' );
		$this->start_controls_tab(
			'filter_bt_normal',
			[
				'label' 						=> esc_html__( 'Normal', 'elementor' ),
			]
		);
		$this->add_control(
			'filter_bt_color',
			[
				'label'                 		=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button' => 'color:{{VALUE}};border-color:{{VALUE}}',
				],
			]
		);
		$this->add_control(
			'filter_bt_color_bg',
			[
				'label'                 		=> esc_html__( 'Background', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->add_control(
			'filter_bt_border_color',
			[
				'label' => esc_html__( 'Border Color', 'elementor-pro' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .srp_filter_button' => 'border-color: {{VALUE}};',
				],
			]
		);
		$this->end_controls_tab();
		$this->start_controls_tab(
			'filter_bt_hover',
			[
				'label' 						=> esc_html__( 'Hover', 'elementor' ),
			]
		);
		$this->add_control(
			'filter_bt_hover_color',
			[
				'label'                 		=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button:hover:not(.srp_filter_button--active)' => 'color:{{VALUE}};border-color:{{VALUE}}',
				],
			]
		);
		$this->add_control(
			'filter_bt_hover_color_bg',
			[
				'label'                 		=> esc_html__( 'Background', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button:hover:not(.srp_filter_button--active)' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->add_control(
			'filter_bt_hover_border_color',
			[
				'label' => esc_html__( 'Border Color', 'elementor-pro' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .srp_filter_button:hover:not(.srp_filter_button--active)' => 'border-color: {{VALUE}};',
				],
			]
		);
		$this->end_controls_tab();
		$this->start_controls_tab(
			'filter_bt_active',
			[
				'label' 						=> esc_html__( 'Active', 'elementor' ),
			]
		);
		$this->add_control(
			'filter_bt_active_color',
			[
				'label'                 		=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button.srp_filter_button--active' => 'color:{{VALUE}};border-color:{{VALUE}}',
				],
			]
		);
		$this->add_control(
			'filter_bt_active_color_bg',
			[
				'label'                 		=> esc_html__( 'Background', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button.srp_filter_button--active' => 'background-color:{{VALUE}};',
				],
				'condition' => [
					'filter_bt_random_color!' => 'true',
				],
			]
		);
		$this->add_control(
			'filter_bt_active_border_color',
			[
				'label' => esc_html__( 'Border Color', 'elementor-pro' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .srp_filter_button.srp_filter_button--active' => 'border-color: {{VALUE}};',
				],
				'condition' => [
					'filter_bt_random_color!' => 'true',
				],
			]
		);
		$this->end_controls_tab();
		$this->end_controls_tabs();
		$this->add_responsive_control(
			'filter_bt_width',
			[
				'label' 						=> esc_html__( 'Button Width', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SLIDER,
				'size_units' => [ 'px','%' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 1000,
						'step' => 1,
					],
					
				],
				'default' 						=> [
						'unit' => 'px',
						//'size' => 200,
						],
				'selectors' 					=> [
					'{{WRAPPER}} .srp_filter_buttons_list li' => 'width: {{SIZE}}{{UNIT}};',
				],
				'separator' 					=> 'after',
			]
		);
		$this->add_responsive_control(
			'filter_bt_align',
			[
				'label' 						=> esc_html__( 'Text Alignment', 'sonaar-music' ),
				'type' 							=> Controls_Manager::CHOOSE,
				'options' 						=> [
					'left'    					=> [
						'title' 				=> esc_html__( 'Left', 'elementor' ),
						'icon' 					=> 'eicon-h-align-left',
					],
					'center' 					=> [
						'title' 				=> esc_html__( 'Center', 'elementor' ),
						'icon' 					=> 'eicon-h-align-center',
					],
					'right' 					=> [
						'title' 				=> esc_html__( 'Right', 'elementor' ),
						'icon' 					=> 'eicon-h-align-right',
					],
				],
				'default' 						=> '',
				'selectors' 					=> [
												'{{WRAPPER}} .srp_filter_button' => 'text-align: {{VALUE}};',
				],
			]
		);
		$this->add_control(
			'more_options',
			[
				'label' => esc_html__( 'Show More Link', 'sonaar-music' ),
				'type' => \Elementor\Controls_Manager::HEADING,
				'separator' 					=> 'before',
				'condition' => [
					'items_per_page!' => '',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'filter_more_typo',
				'label' 						=> esc_html__( 'Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp-filter-more-link',
				'condition' => [
					'items_per_page!' => '',
				],
			]
		);
		$this->add_control(
			'filter_more_color',
			[
				'label'                 		=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp-filter-more-link' => 'color:{{VALUE}};',
				],
				'condition' => [
					'items_per_page!' => '',
				],
			]
		);
		$this->add_control(
			'filter_more_color_hover',
			[
				'label'                 		=> esc_html__( 'Color Hover', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp-filter-more-link:hover' => 'color:{{VALUE}};',
				],
				'condition' => [
					'items_per_page!' => '',
				],
			]
		);
		$this->end_controls_section();
		/**
		 * STYLE: DROPDOWN STYLE
		 * -------------------------------------------------
		 */
		$this->start_controls_section(
			'filter_range_style',
			[
				'label'                 		=> esc_html__( 'Range Selector Style', 'sonaar-music' ),
				'tab'                   		=> Controls_Manager::TAB_STYLE,
				'condition' => [
					'filter_type' => 'range',
				],
			]
		);
		$this->add_control(
			'filter_range_hide_label',
			[
				'label' 						=> esc_html__( 'Hide Label', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'selectors' => [
					'{{WRAPPER}} .srp_filter_button_label' => 'display:none;',
				],
			]
		);
		$this->add_control(
			'filter_range_hide_value',
			[
				'label' 						=> esc_html__( 'Hide Value', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'selectors' => [
					'{{WRAPPER}} .srp_range_value' => 'display:none;',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'filter_range_label_typo',
				'label' 						=> esc_html__( 'Label Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp_range_header',
				'condition' => [
					'filter_range_hide_label' => '',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'filter_range_value_typo',
				'label' 						=> esc_html__( 'Value Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp_range_value',
				'condition' => [
					'filter_range_hide_value' => '',
				],
			]
		);
		$this->add_control(
			'filter_range_label_color',
			[
				'label'                 		=> esc_html__( 'Label Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_range_header' => 'color:{{VALUE}};',
				],
				'conditions' => [
					'relation' => 'or',
					'terms' => [
						[
							'name' => 'filter_range_hide_label',
							'operator' => '==',
							'value' => '',
						],
						[
							'name' => 'filter_range_hide_value',
							'operator' => '==',
							'value' => '',
						],
					],
				],
			]
		);
		$this->add_control(
			'filter_range_rail_color',
			[
				'label'                 		=> esc_html__( 'Rail Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'separator'						=> 'before',
				'default'               		=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .vue-slider-rail' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->add_control(
			'filter_range_rail_active_color',
			[
				'label'                 		=> esc_html__( 'Slider Rail Active Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .vue-slider-process' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->add_responsive_control(
			'filter_range_rail_height',
			[
				'label' 						=> esc_html__( 'Rail Height', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SLIDER,
				'range' 						=> [
					'px' 						=> [
						'max' 					=> 50,
					],
				],
				'selectors' 					=> [
												'{{WRAPPER}} .vue-slider' => 'height:{{SIZE}}px!important;',
				],
			]
		);
		$this->add_control(
			'filter_range_hide_marks',
			[
				'label' 						=> esc_html__( 'Hide Marks', 'sonaar-music' ),
				'separator'						=> 'before',
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'selectors' => [
					'{{WRAPPER}} .vue-slider-marks' => 'display:none;',
				],
				//'separator'						=> 'after',
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'filter_range_mark_typo',
				'label' 						=> esc_html__( 'Marks Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .vue-slider-mark-label',
				'condition' => [
					'filter_range_hide_marks' => '',
				],
			]
		);
		$this->add_control(
			'filter_range_mark_label_color',
			[
				'label'                 		=> esc_html__( 'Marks Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .vue-slider-mark-label' => 'color:{{VALUE}};',
				],
				'condition' => [
					'filter_range_hide_marks' => '',
				],
			]
		);

		$this->add_control(
			'filter_range_handle_color',
			[
				'label'                 		=> esc_html__( 'Handles Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'separator'						=> 'before',
				'default'               		=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .vue-slider-dot-handle' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'filter_range_handle_shadow',
				'label' => esc_html__( 'Handles Shadow', 'sonaar-music' ),
				'selector' 						=> '{{WRAPPER}} .vue-slider-dot-handle',
			]
		);
		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'filter_range_handle_hover_shadow',
				'label' => esc_html__( 'Handles Hover Shadow', 'sonaar-music' ),
				'selector' 						=> '{{WRAPPER}} .vue-slider-dot-handle:hover, {{WRAPPER}} .vue-slider-dot-handle-focus',
			]
		);
		$this->add_responsive_control(
			'filter_range_handle_size',
			[
				'label' 						=> esc_html__( 'Handles Size', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SLIDER,
				'range' 						=> [
					'px' 						=> [
						'max' 					=> 50,
					],
				],
				'selectors' 					=> [
												'{{WRAPPER}} .vue-slider-dot' => 'width:{{SIZE}}px!important;height:{{SIZE}}px!important;',
				],
				'separator'						=> 'after',
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'filter_range_tooltip_typo',
				'label' 						=> esc_html__( 'Tooltip Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .vue-slider-dot-tooltip-inner',
				
			]
		);
		$this->add_control(
			'filter_range_tooltip_color',
			[
				'label'                 		=> esc_html__( 'Tooltip Font Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .vue-slider-dot-tooltip-inner' => 'color:{{VALUE}};',
				],
			]
		);
		$this->add_control(
			'filter_range_tooltip_background_color',
			[
				'label'                 		=> esc_html__( 'Tooltip Background', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .vue-slider-dot-tooltip-inner' => 'background-color:{{VALUE}};border-color:{{VALUE}};',
				],
			]
		);
		
		$this->add_control(
			'filter_bt_tempo',
			[
				'label' 						=> esc_html__( 'Hide Tempo Buttons', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SWITCHER,
				'default' 						=> '',
				'return_value' 					=> 'true',
				'selectors' => [
					'{{WRAPPER}} .srp_range_buttons' => 'display:none;',
				],
				'separator'						=> 'before',
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' 							=> 'filter_range_button_typo',
				'label' 						=> esc_html__( 'Tempo Buttons Typography', 'sonaar-music' ),
				'global' => [
					'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' 						=> '{{WRAPPER}} .srp_filter_button',
				'condition' => [
					'filter_bt_tempo' => '',
				],
			]
		);

		$this->start_controls_tabs( 'filter_range_bt', [
			'condition' => [
				'filter_bt_tempo' => [ '' ],
			],
		] );
		
		//$this->start_controls_tabs( 'filter_range_bt' );
		$this->start_controls_tab(
			'filter_range_bt_normal',
			[
				'label' 						=> esc_html__( 'Normal', 'elementor' ),
			]
		);
		$this->add_control(
			'filter_range_bt_color',
			[
				'label'                 		=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button' => 'color:{{VALUE}};border-color:{{VALUE}}',
				],
			]
		);
		$this->add_control(
			'filter_range_bt_color_bg',
			[
				'label'                 		=> esc_html__( 'Background', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' 							=> 'filter_range_bt_border',
				'selector' 						=> '{{WRAPPER}} .srp_filter_button',
			]
		);
		
		$this->end_controls_tab();
		$this->start_controls_tab(
			'filter_range_bt_hover',
			[
				'label' 						=> esc_html__( 'Hover', 'elementor' ),
			]
		);
		$this->add_control(
			'filter_range_bt_hover_color',
			[
				'label'                 		=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button:hover' => 'color:{{VALUE}};border-color:{{VALUE}}',
				],
			]
		);
		$this->add_control(
			'filter_range_bt_hover_color_bg',
			[
				'label'                 		=> esc_html__( 'Background', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button:hover' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->add_control(
			'filter_range_bt_hover_border_color',
			[
				'label' => esc_html__( 'Border Color', 'elementor' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .srp_filter_button:hover' => 'border-color: {{VALUE}};',
				],
			]
		);
		$this->end_controls_tab();
		$this->start_controls_tab(
			'filter_range_bt_active',
			[
				'label' 						=> esc_html__( 'Active', 'elementor' ),
			]
		);
		$this->add_control(
			'filter_range_bt_active_color',
			[
				'label'                 		=> esc_html__( 'Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button:focus' => 'opacity:1;color:{{VALUE}};border-color:{{VALUE}}',
				],
			]
		);
		$this->add_control(
			'filter_range_bt_active_color_bg',
			[
				'label'                 		=> esc_html__( 'Background', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'default'               		=> '',
				'separator'						=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_filter_button:focus' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->add_control(
			'filter_range_bt_active_border_color',
			[
				'label' => esc_html__( 'Border Color', 'elementor-pro' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .srp_filter_button:focus' => 'border-color: {{VALUE}};',
				],
			]
		);
		$this->end_controls_tab();
		$this->end_controls_tabs();
		$this->add_responsive_control(
			'filter_range_bt_radius',
			[
				'label' 						=> esc_html__( 'Button Radius', 'elementor' ),
				'separator'						=> 'before',
				'type' 							=> Controls_Manager::SLIDER,
				'range' 						=> [
					'px' 						=> [
						'max' 					=> 300,
					],
				],
				'selectors' 					=> [
												'{{WRAPPER}} .srp_filter_button' => 'border-radius: {{SIZE}}px;',
				],
				'condition' => [
					'filter_bt_tempo' => '',
				],
			]
		);
		$this->add_responsive_control(
			'filter_range_bt_width',
			[
				'label' 						=> esc_html__( 'Button Width', 'sonaar-music' ),
				'type' 							=> Controls_Manager::SLIDER,
				'size_units' => [ 'px','%' ],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 1000,
						'step' => 1,
					],
					
				],
				'default' 						=> [
						'unit' => 'px',
						//'size' => 200,
						],
				'selectors' 					=> [
					'{{WRAPPER}} .srp_filter_button' => 'width: {{SIZE}}{{UNIT}};',
				],
				'condition' => [
					'filter_bt_tempo' => '',
				],
			]
		);
		$this->add_responsive_control(
			'filter_range_bt_align',
			[
				'label' 						=> esc_html__( 'Text Alignment', 'sonaar-music' ),
				'type' 							=> Controls_Manager::CHOOSE,
				'options' 						=> [
					'left'    					=> [
						'title' 				=> esc_html__( 'Left', 'elementor' ),
						'icon' 					=> 'eicon-h-align-left',
					],
					'center' 					=> [
						'title' 				=> esc_html__( 'Center', 'elementor' ),
						'icon' 					=> 'eicon-h-align-center',
					],
					'right' 					=> [
						'title' 				=> esc_html__( 'Right', 'elementor' ),
						'icon' 					=> 'eicon-h-align-right',
					],
				],
				'default' 						=> '',
				'separator' 					=> 'before',
				'selectors' 					=> [
												'{{WRAPPER}} .srp_filter_button' => 'text-align: {{VALUE}};',
				],
				'condition' => [
					'filter_bt_tempo' => '',
				],
			]
		);




























		$this->add_control(
			'filter_range_container_bg_color',
			[
				'label'                 		=> esc_html__( 'Container Background Color', 'sonaar-music' ),
				'type'                  		=> Controls_Manager::COLOR,
				'separator'						=> 'before',
				'default'               		=> '',
				'selectors'             		=> [
												'{{WRAPPER}} .srp_range_container' => 'background-color:{{VALUE}};',
				],
			]
		);
		$this->add_responsive_control(
			'filter_range_container_bg_radius',
			[
				'label' 						=> esc_html__( 'Container Radius', 'elementor' ),
				'type' 							=> Controls_Manager::SLIDER,
				'range' 						=> [
					'px' 						=> [
						'max' 					=> 300,
					],
				],
				'selectors' 					=> [
												'{{WRAPPER}} .srp_range_container' => 'border-radius: {{SIZE}}px;',
				],
			]
		);
		$this->add_responsive_control(
			'filter_range_container_bg_padding',
			[
				'label' => esc_html__( 'Container Padding', 'elementor-pro' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [
					'{{WRAPPER}} .srp_range_container' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);
		$this->end_controls_section();
	}

	protected function render() {
		
		$settings = $this->get_settings_for_display();
		$thesettings = array();
		$shortcode = '[sonaar_filters';
		$shortcode .= ' filtertype="' . $settings['filter_type'] . '"';
		$shortcode .= ' player_id="' . $settings['target_id'] . '"';
		$shortcode .= (isset($settings['items_per_page']) && $settings['items_per_page'] !== '') ? ' items_per_page="' . $settings['items_per_page'] . '"' : '';
		$shortcode .= (isset($settings['show_more_label']) && $settings['show_more_label'] !== '') ? ' show_more_label="' . $settings['show_more_label'] . '"' : '';
		$shortcode .= (isset($settings['show_less_label']) && $settings['show_less_label'] !== '') ? ' show_less_label="' . $settings['show_less_label'] . '"' : '';
		$shortcode .= (isset($settings['filter_open_always']) && $settings['filter_open_always'] == 'true') ? ' open_always="true"' : '';
		$shortcode .= (isset($settings['filter_open_on_init']) && $settings['filter_open_on_init'] == 'true') ? ' open_on_init="true"' : '';
		$shortcode .= (isset($settings['filter_close_on_select']) && $settings['filter_close_on_select'] == 'true') ? ' close_on_select="true"' : '';
		$shortcode .= (isset($settings['filter_searchable']) && $settings['filter_searchable'] == 'true') ? ' searchable="true"' : '';
		$randomColor = ($settings['filter_bt_random_color'] == 'true') ? 'true' : 'false';
		$shortcode .= ' randomcolor="' . $randomColor . '"';
		$filter_repeater_ar = array();
		if ( $settings['filter_repeater'] ){
			$thesettings =  $settings['filter_repeater'];
		}
		if( $settings['range_repeater']){
			$thesettings =  $settings['range_repeater'];
		}
		
		foreach ($thesettings as $key => $value) {
			//var_dump($value['filter_width']);
			$value['filter_name'] = ($value['filter_name']) ? $value['filter_name'] : '';
			//$value['filter_width']['size'] = ($value['filter_width']['size']) ? $value['filter_width']['size'] : '100';
			//$value['column_width']['unit'] = ($value['filter_width']['unit']) ? $value['filter_width']['unit'] : 'px';
			$fieldKey = '';
			if($value['filter_key'] != '' ){
				$value[$fieldKey] = $value['filter_key'];
			}else if($value['filter_source'] == 'customkey' && $value['filter_key'] == '' ){
				$value[$fieldKey] = 'null';
			}else{
				$fieldKey = 'filter_' .  $value['filter_source'];
			}
			$value['filter_min'] = (isset($value['filter_min'])) ? $value['filter_min'] : '';
			$value['filter_max'] = (isset($value['filter_max'])) ? $value['filter_max'] : '';
			$value['filter_unit'] = (isset($value['filter_unit'])) ? $value['filter_unit'] : '';
			array_push( $filter_repeater_ar, $value['filter_name'] . '::' . $value[$fieldKey] . '::' . $value['filter_selecttype'] . '::' . $value['filter_min'] . '::' . $value['filter_max']. '::' . $value['filter_unit']);
		}
		
		$filter_repeater_ar = (isset($filter_repeater_ar) && is_array($filter_repeater_ar)) ? implode(";", $filter_repeater_ar):'';
		
		$shortcode .= ($filter_repeater_ar != '') ? ' filter="' . $filter_repeater_ar . '"':'';
		$shortcode .= ']';
		
		//Attention: double brackets are required if using var_dump to display a shortcode otherwise it will render it!
		//print_r("Shortcode = [" . $shortcode . "]");
		//[sonaar_filters id="id1" filter="Mood JE::je-category;BPM:: field_633b32f18c398;Post Tags::post_tags;Prod Tag::product_tag;Product Cat::product_cat;Tax Cat::playlist-cat;Podcast Show::podcast-show;GENRE1::acf_genrez;Mood::field_6337226914be2;True or False::field_63275a663952c"][/sonaar_filters]
		echo do_shortcode( $shortcode );

	}
	private function check_column_plugin_activated( $filter_type = '' ){
		$source = array(
			'object' => __( 'Post/Term/User/Object Data', 'sonaar-music' ),
		);
		
		if (function_exists( 'acf_get_fields' )){
			$source['acf'] = 'ACF';
		}
		if($filter_type !== 'range'){
			if (function_exists( 'jet_engine' )){
				$source['jetengine'] = 'Jet Engine';
			}
		}
		$source['customkey'] = 'Custom Meta Key';
		return $source;
	}
	
	/**
	 * Retuns current object fields array
	 * @return [type] [description]
	 */
	public function get_object_fields( $filter_type = '' ) {
		if($filter_type == 'range'){
			$groups = array(
				array(
					'label'  => __( 'Player', 'sonaar-music' ),
					'options' => array(
						'track_length'  => esc_html__( 'Track Length', 'sonaar-music' ),
					)
				),
			);
		}else{
			$groups = array(
				array(
					'label'  => __( 'Player', 'sonaar-music' ),
					'options' => array(
						''	        	=> __( 'Select...', 'sonaar-music' ),
						'playlist-category'  => sprintf( esc_html__( '%1$s Category', 'sonaar-music' ), ucfirst(Sonaar_Music_Admin::sr_GetString('playlist')) ),//__( 'Audio Image', 'sonaar-music' ),
						'playlist-tag'  => sprintf( esc_html__( '%1$s Tag', 'sonaar-music' ), ucfirst(Sonaar_Music_Admin::sr_GetString('playlist')) ),//__( 'Audio Image', 'sonaar-music' ),
					)
				),
			);
			if ( Sonaar_Music::get_option('player_type', 'srmp3_settings_general') == 'podcast' ){
				$groups[0]['options']+= array(
					'podcast-show'        	=> __( 'Podcast Show', 'sonaar-music' )
				);
			}
			// Get the post types
			$sr_postypes = Sonaar_Music_Admin::get_cpt($all = true);
		
			// Get the taxonomies for the post types
			$taxonomies = get_object_taxonomies($sr_postypes, 'objects');
		
			// Loop through each post type
			foreach ($sr_postypes as $post_type) {
				$post_type_obj = get_post_type_object($post_type);
				if($post_type_obj === null){
					continue;
				}

				$taxonomies = get_object_taxonomies($post_type, 'objects');
		
				$taxonomy_options = array();
				foreach ($taxonomies as $taxonomy) {
					$taxonomy_options[$taxonomy->name] = sprintf( esc_html__( '%1$s', 'sonaar-music' ), ucfirst($taxonomy->labels->singular_name) );
				}
		
				$groups[] = array(
					'label' => sprintf( esc_html__( '%1$s Taxonomies', 'sonaar-music' ), $post_type_obj->labels->singular_name ),
					'options' => $taxonomy_options
				);
			}
			if (defined( 'WC_VERSION' )){
				$groups[] = array(
					'label'  => __( 'WooCommerce', 'sonaar-music' ),
					'options' => array(
						'product_cat'       	=> __( 'Product Categories', 'sonaar-music' ),
						'product_tag'       	=> __( 'Product Tags', 'sonaar-music' ),
					)
				);

				$wcAttributes = wc_get_attribute_taxonomy_labels();
				$wcAttributes = (is_array($wcAttributes)) ? array_combine(
					array_keys($wcAttributes), array_map(function($k){ return 'Attribute: '.$k; }, $wcAttributes)
				) : '';
				$wcAttributes = (is_array($wcAttributes)) ? array_combine(
					array_map(function($k){ return 'pa_'.$k; }, array_keys($wcAttributes)), $wcAttributes
				) : '';
				$groups[1]['options'] += $wcAttributes;
			}
		}
		return $groups;
	}
	/**
	 * Get meta fields for post type
	 *
	 * @return array
	 */
	public function get_meta_fields_for_post_type() {
		//var_dump(jet_engine()->meta_boxes);
		if ( jet_engine()->meta_boxes ) {
			return jet_engine()->meta_boxes->get_fields_for_select( 'text' );
		} else {
			return array();
		}

	}
	public function render_plain_content() {
	}
}
Plugin::instance()->widgets_manager->register( new SR_Filters() );