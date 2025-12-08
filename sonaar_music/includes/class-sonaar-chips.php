<?php
/**
* Multiselect Filter Widget
*
* @since 4.0
*/

class Sonaar_Chips_Widget extends WP_Widget{
    /**
    * Widget Defaults
    */
    
    public static $widget_defaults;
    
    /**
    * Register widget with WordPress.
    */
    
    function __construct (){
        wp_enqueue_style( 'sonaar-music-pro-css' );
        //wp_register_style( 'sonaar-music-pro', plugin_dir_url( __FILE__ ) . 'css/sonaar-music-pro-public.css', array(), $this->version, 'all' );
		/* Enqueue Sonnar Music css file on single Album Page */
		/*if ( is_single() && get_post_type() == SR_PLAYLIST_CPT ) {
			wp_enqueue_style( 'sonaar-music-pro' );
		}*/

        $widget_ops = array(
        'classname'   => 'sonaar_chips_widget',
        'description' => esc_html_x('Add Chips from the URL Query', 'Widget', 'sonaar-music')
        );
        //wp_enqueue_script('vue-multiselect' );
        //wp_register_script( 'vue-multiselect', plugin_dir_url( __DIR__ ) . 'public/js/vue-multiselect.min.js' , array(), '2.1.6', true );
        self::$widget_defaults = array(
            'title'        => '',
            );
            
        
        parent::__construct('sonaar-music', esc_html_x('Sonaar: Chips', 'Widget', 'sonaar-music'), $widget_ops);
        
    }
    public function widget ( $args, $instance ){
        $instance = wp_parse_args( (array) $instance, self::$widget_defaults );
        $data_player_id = (isset($instance['player_id']) && $instance['player_id'] != '')? ' data-player-id="' . $instance['player_id'] . '"' : '';
        $hide_clearall = (isset($instance['hide_clearall']) && $instance['hide_clearall'] === 'true')? ' data-hideclear=1' : '';
        $data_clearall_label_txt = (isset($instance['clearall_label']))? $instance['clearall_label']: 'Clear All';
        $data_clearall_label = ' data-clearall="' . $data_clearall_label_txt . '"';
        $widget_id = (isset($instance['id']))? $instance['id']: '';
        $output = '<div class="srp_chips"' . $data_player_id . $data_clearall_label . $hide_clearall . '">';
        $output .=(( did_action( 'elementor/loaded' )) && \Elementor\Plugin::$instance->editor->is_edit_mode()) ? '<div class="srp_chip">Chip Example 1<i class="sricon-close-circle"></i></div><div class="srp_chip">Chip Example 2<i class="sricon-close-circle"></i></div><div class="srp_chip srp_chip_clear_all">' . $data_clearall_label_txt . '<i class="sricon-close-circle"></i></div>' : '';
        $output .='</div>';
        echo $output;
    }
}