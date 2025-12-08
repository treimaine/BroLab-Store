<?php
/**
* Multiselect Filter Widget
*
* @since 4.0
*/

class Sonaar_Filters_Widget extends WP_Widget{
    /**
    * Widget Defaults
    */
    
    public static $widget_defaults;
    
    /**
    * Register widget with WordPress.
    */
    
    function __construct (){
        $widget_ops = array(
        'classname'   => 'sonaar_filters_widget',
        'description' => esc_html_x('Add Filters to your Tracklist', 'Widget', 'sonaar-music')
        );
       
        self::$widget_defaults = array(
            'title'        => '',
            );
            
        
        parent::__construct('sonaar-music', esc_html_x('Sonaar: Filters', 'Widget', 'sonaar-music'), $widget_ops); 
         // Hook our custom function to wp_enqueue_scripts
         add_action('wp_enqueue_scripts', array($this, 'enqueue_widget_assets'));
    }
       /**
    * Enqueue the scripts and styles for the widget.
    */
    public function enqueue_widget_assets($instance) {
        wp_enqueue_style('sonaar-music');
        wp_enqueue_style('sonaar-music-pro');
        wp_enqueue_script('sonaar-music-pro-mp3player');
        wp_enqueue_script('sonaar_player');
        wp_enqueue_script('sonaar-list');
        wp_enqueue_script('vue-multiselect');
        wp_register_script('vue-multiselect', plugin_dir_url(__DIR__) . 'public/js/vue-multiselect.min.js', array(), '2.1.6', true);
        wp_enqueue_script('vue-slider-component', plugin_dir_url(__DIR__) . 'public/js/vue-slider-component.min.js', array('vuejs'), '3.1.0', true);       
    }
    private function getTerms($term){
        $options = array();
        $parent_terms = array();
        $child_terms = array();
    
        $terms = get_terms(array(
            'taxonomy' => $term,
            'hide_empty' => true,
        ));
    
        // Separate terms into parents and children
        foreach ($terms as $key => $term_item) {
            if (is_object($term_item)) {
                if ($term_item->parent == 0) {
                    $parent_terms[] = $term_item;
                } else {
                    $child_terms[] = $term_item;
                }
            }else{
                // Handle the case where $term_item is not an object, or log it for debugging
                error_log('Not an object: ' . print_r($term_item, true));
            }
        }
    
        // First, add all parent terms to options
        foreach ($parent_terms as $parent) {
            if (isset($parent->name)) {
                $options[] = $parent;
    
                // Now, add children of this parent term
                foreach ($child_terms as $child) {
                    if ($child->parent == $parent->term_id && isset($child->name)) {
                        $options[] = $child;
                    }
                }
            }
        }
    
        return $options;
    }
    /**
    * Front-end display of widget.
    */
    public function widget ( $args, $instance ){
        $this->enqueue_widget_assets($instance);
        $instance = wp_parse_args( (array) $instance, self::$widget_defaults );
        $filter = (isset($instance['filter']))? $instance['filter']: '';
        $filterType = (isset($instance['filtertype'])) ? $instance['filtertype'] : 'dropdowns'; // value dropdowns or tags
       // $filterType = 'range';
        $widget_id = (isset($instance['id']))? $instance['id']: 'a' . uniqid();
        //$selectType = (isset($instance['selecttype']) && $instance['selecttype'] == "singleselect")? 'singleselect': 'multiselect'; //singleselect
        $atts['options'] = array();
        $options = array();
        if($filter != false && function_exists( 'run_sonaar_music_pro' ) &&  get_site_option('SRMP3_ecommerce') == '1' ){
            $filter = explode(';', $filter);
            foreach ($filter as $value) {
                $value = explode('::', $value);
                if ( isset($value[1]) ){
                    $min = isset($value[3]) ? $value[3] : null;
                    $max = isset($value[4]) ? $value[4] : null;
                    $unit = isset($value[5]) ? $value[5] : null;

                    $value[1] = str_replace(' ', '',  $value[1]); // strip spaces to prevent typos
                    if(function_exists('acf') && 'field_' == substr($value[1], 0, 6)){
                        // if ACF is used, we need to retrieve the field keys and NOT the metakey
                        $acf_object = get_field_object($value[1]);
                       
                        if( isset( $acf_object['taxonomy'] ) && $acf_object['taxonomy'] ){
                            $options = $this->getTerms($acf_object['taxonomy']);
                        }else{
                            $options = (isset($acf_object['choices'])) ? array_values($acf_object['choices']) : null;
                            $metakey = (isset($acf_object['name'])) ? $acf_object['name'] : null;
                        }
                    }elseif('pa_' == substr($value[1], 0, 3)){
                        // This is a WooCommerce Attribute Filter. It begins by pa_
                        $options =  $this->getTerms($value[1]);
                    }elseif ( function_exists('jet_engine') && jet_engine()->meta_boxes ) {
                        $metaboxes = jet_engine()->meta_boxes->get_registered_fields();
                        foreach ($metaboxes as $metabox) {
                            foreach($metabox as $themetabox){
                                    if($themetabox["name"] == $value[1]){
                                        if(isset($themetabox['options']) && is_array($themetabox['options'])){
                                            foreach ($themetabox['options'] as $thevalue) {
                                                $options[] = $thevalue['value'];
                                            }
                                        }
                                    }
                                }
                            }
                    }
                    $metakey = (isset($metakey)) ? $metakey : $value[1];
                    switch ($value[1]) {
                        case 'post_tags':
                            $options = $this->getTerms('post_tag');
                            break;
                        default:
                            if (taxonomy_exists($value[1])) {
                                $options = $this->getTerms($value[1]);
                            }
                            break;
                    } 
                    if( !isset($value[2]) ){
                        $value[2] = 'singleselect';
                    }

                    if($metakey){
                        $atts['options'][] = array(
                            'label'         => $value[0],
                            'metakey'       => $metakey,
                            'selecttype'    => $value[2],
                            'items_per_page'=> (isset($instance['items_per_page'])) ? $instance['items_per_page'] : 'all',
                            'show_more_label'=> (isset($instance['show_more_label'])) ? $instance['show_more_label'] : null,
                            'show_less_label'=> (isset($instance['show_less_label'])) ? $instance['show_less_label'] : null,
                            'open_always'   => (isset($instance['open_always'])) ? true : null,
                            'open_on_init'   => (isset($instance['open_on_init'])) ? true : null,
                            'close_on_select'   => (isset($instance['close_on_select'])) ? true : false,
                            'searchable'   => (isset($instance['searchable'])) ? true : false,
                            'min'           => $min,
                            'max'           => $max,
                            'unit'          => $unit,
                            'randomcolor'   => (isset($instance['randomcolor'])) ? $instance['randomcolor'] : 'false',
                            'options'       => (isset($options)) ? $options : '',
                            'playerid'      => (isset($instance['player_id'])) ? $instance['player_id'] : null,
                        );
                    }    
                    unset($metakey, $options);   
                }        
            }
        }
        // Normalize $atts['options'] to ensure it contains only strings
        //error_log(print_r($atts['options'], true));

       
            foreach ($atts['options'] as $key => $filters) {
                $term_ids = [];
                $names = []; 
                if(is_array($filters['options'])){
                    foreach($filters['options'] as $item) {
                        if (is_object($item) && isset($item->name)) {
                            $names[] = strip_tags($item->name);
                            if (isset($item->term_id)) {
                                $term_ids[] = $item->term_id;
                            }
                        } elseif (is_string($item)) {
                            $names[] = strip_tags($item);  // Directly add the string to the names array
                        }
                    }
                    $atts['options'][$key]['options'] = $names;
                    $atts['options'][$key]['term_ids'] = $term_ids; 
                }
            }
        

        $vue_atts = esc_attr(json_encode([
            'id' => $widget_id,
            'options' => $atts['options']
        ]));
        if ($filterType == 'tags') {
            echo "<div id='" . $widget_id . "' class='srp_tags_container_raw' data-sr-tags-atts='{$vue_atts}'></div>";
        } else if($filterType == 'range'){            
            echo "<div id='" . $widget_id . "' class='srp_range_container_raw' data-sr-range-atts='{$vue_atts}'></div>";
        } else {
            echo "<div id='" . $widget_id . "' class='srp_filter_container_raw' data-sr-dropdown-atts='{$vue_atts}'></div>";
        }

    }
}