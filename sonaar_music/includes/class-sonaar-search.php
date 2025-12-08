<?php
/**
* Multiselect Filter Widget
*
* @since 4.0
*/

class Sonaar_Search_Widget extends WP_Widget{
    /**
    * Widget Defaults
    */
    
    public static $widget_defaults;
    
    /**
    * Register widget with WordPress.
    */
    
    function __construct (){

        // Enqueue so this widget can run standalone without audio player
        wp_enqueue_style( 'sonaar-music' );
		wp_enqueue_style( 'sonaar-music-pro' );
        wp_enqueue_script( 'sonaar-music-pro-mp3player' );
		wp_enqueue_script( 'sonaar_player' );
        wp_enqueue_script( 'sonaar-list' );


        $widget_ops = array(
        'classname'   => 'sonaar_search_widget',
        'description' => esc_html_x('Add Search for your Tracklist', 'Widget', 'sonaar-music')
        );
      
        self::$widget_defaults = array(
            'title'        => '',
            );
            
        
        parent::__construct('sonaar-music', esc_html_x('Sonaar: Search', 'Widget', 'sonaar-music'), $widget_ops);
        
    }
    /**
    * Front-end display of widget.
    */
    public function widget ( $args, $instance ){
        $data_player_id = (isset($instance['player_id']) && $instance['player_id'] != '')? ' data-player-id="' . $instance['player_id'] . '"' : '';
        $data_url = (isset($instance['url']) && $instance['url'] != '')? ' data-url="' . $instance['url'] . '"' : '';
        $labelSearch = (Sonaar_Music::get_option('tracklist_search_label', 'srmp3_settings_widget_player')) ? Sonaar_Music::get_option('tracklist_search_label', 'srmp3_settings_widget_player') : esc_html__('Search', 'sonaar-music'); 
        $labelSearchPlaceHolder = (Sonaar_Music::get_option('tracklist_search_placeholder', 'srmp3_settings_widget_player')) ? Sonaar_Music::get_option('tracklist_search_placeholder', 'srmp3_settings_widget_player') : esc_html__('Enter any keyword', 'sonaar-music'); 
        $labelSearchPlaceHolder = (isset($instance['placeholder'])) ? $instance['placeholder'] : $labelSearchPlaceHolder;
        $searchbar_show_keyword_displayClass = 'display:flex;visibility:hidden;opacity:0;';
        $searchbar_show_keyword = '<div class="srp_search_container" style="' . $searchbar_show_keyword_displayClass . '"' . $data_player_id . ' data-metakey="search" data-label="' . esc_html($labelSearch) .'"' . $data_url . '><i class="fas fa-search"></i><input class="srp_search" enterkeyhint="done" placeholder="' .  esc_html($labelSearchPlaceHolder) . '" \><i class="srp_reset_search sricon-close-circle" style="display:none;"></i></div>';
        $searchbar_container = '<div class="srp_search_main">' . $searchbar_show_keyword . '</div>';
        $instance = wp_parse_args( (array) $instance, self::$widget_defaults );
        $widget_id = (isset($instance['id']))? $instance['id']: '';
        echo $searchbar_container;
    }
}