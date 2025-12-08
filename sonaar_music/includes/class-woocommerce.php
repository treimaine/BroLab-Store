<?php
/**
* WC class
*
* SRMP3 WooCommerce class
*
* @link       sonaar.io
* @since      1.0.0
*
* @package    Sonaar_Music_Pro
* @subpackage Sonaar_Music_Pro/includes
*/

defined( 'ABSPATH' ) || exit;
use Spipu\Html2Pdf\Html2Pdf;
class SRMP3_WooCommerce {

    public static function load() {
		add_action( 'init', array( __CLASS__, 'register_hooks' ) );
	}

    /**
	 * Get  default priority for the product player
	 *
	 * @since  1.0.0
	 * @return array
	 */
	public static function srmp3_get_default_product_player_priority() {
		return array(
			'before'         => 4,
			'after'          => 6,
			'before_rating'  => 9,
			'after_price'    => 11,
			'before_excerpt' => 19,
			'after_excerpt'  => 21,
            'after_add_to_cart'  => 30,
			'before_meta'    => 39,
			'after_meta'     => 41,
		);
	}
    public static function register_hooks() {
		add_action('wp_ajax_load_wc_variation_by_ajax', array( __CLASS__, 'load_wc_variation_by_ajax_callback'), 10, 2);
		add_action('wp_ajax_nopriv_load_wc_variation_by_ajax', array( __CLASS__, 'load_wc_variation_by_ajax_callback'), 10, 2);

		add_action('wp_ajax_load_make_offer_lightbox', array( __CLASS__, 'load_make_offer_lightbox_callback'), 10, 2);
		add_action('wp_ajax_nopriv_load_make_offer_lightbox', array( __CLASS__, 'load_make_offer_lightbox_callback'), 10, 2);

		
		add_filter( 'srmp3_replace_image_with_shortcode', array(__CLASS__, 'replace_image_with_shortcode'), 10, 2);

		if (Sonaar_Music::get_option('wc_enable_licenses_cpt', 'srmp3_settings_woocommerce') == 'true'){
			add_action('wp_ajax_load_license_preview_ajax', array( __CLASS__, 'load_license_preview_ajax_callback'), 10, 2);
			add_action('wp_ajax_nopriv_load_license_preview_ajax', array( __CLASS__, 'load_license_preview_ajax_callback'), 10, 2);

			add_action( 'woocommerce_checkout_update_order_meta', array( __CLASS__, 'srmp3_add_meta_to_order'), 10 , 2 );
			add_action( 'woocommerce_view_order', array( __CLASS__, 'srmp3_add_license_to_order_page'), 9, 1 );
			add_action( 'woocommerce_thankyou', array( __CLASS__, 'srmp3_add_license_to_order_page'), 9, 1 );
			add_action( 'woocommerce_after_cart_item_name', array( __CLASS__, 'srmp3_add_license_button'), 10, 2 );
			add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'srmp3_create_pdf_license'), 10, 1 );
			add_action( 'woocommerce_review_order_before_payment', array( __CLASS__, 'srmp3_review_license_before_submit'), 10);
			add_action( 'woocommerce_email_after_order_table', array( __CLASS__, 'email_order_show_license_link'), 10, 1 );
			
		}
		$srmp3_product_player_priority = self::srmp3_get_default_product_player_priority();
        $srmp3_product_player        = self::srmp3_product_player_pos();

        if ($srmp3_product_player !== 'disable'){        
            if ( 'after_summary' === $srmp3_product_player ) {
				add_action( 'woocommerce_after_single_product_summary', array( __CLASS__, 'sr_display_wc_shop_player' ), 10 );
			} else {
				add_action( 'woocommerce_single_product_summary', array( __CLASS__, 'sr_display_wc_shop_player' ), $srmp3_product_player_priority[ $srmp3_product_player ] );
			}
        };

		if (self::srmp3_remove_wc_featured_image()=='true'){
			//add_action( 'woocommerce_before_shop_loop_item_title', array( __CLASS__, 'sr_check_woo_image') , 10);
		}
		add_filter( 'woocommerce_post_class', array( __CLASS__, 'woocommerce_post_class' ), 10, 2 );
		add_filter( 'woocommerce_cart_item_name', array( __CLASS__, 'srmp3_add_image_checkout' ), 9999, 3 ); 
		
		if( Sonaar_Music::get_option('wc_variation_lb', 'srmp3_settings_woocommerce') != 'false' ){
			add_filter( 'woocommerce_loop_add_to_cart_link', array( __CLASS__, 'srp_wc_variation_modal' ),  10, 2);
		}
		add_action( 'wp_loaded', array( __CLASS__, 'wc_shop_page_hooks' ), 10 );

		// MAKE AN OFFER ACTIONS
		add_action( 'woocommerce_product_options_general_product_data', array(__CLASS__, 'add_make_offer_field'));
        add_action( 'woocommerce_variation_options_pricing', array(__CLASS__, 'add_make_offer_field_to_variations'), 10, 3);
        add_action( 'woocommerce_process_product_meta', array(__CLASS__, 'save_make_offer_field'));
        add_action( 'woocommerce_save_product_variation', array(__CLASS__, 'save_make_offer_field_for_variations'), 10, 2);
		add_filter( 'elementor/widget/render_content', array(__CLASS__, 'srp_make_offer_single_product_elementor'), 10, 2 );

		// Check if Astra theme is active
		if ( 'Astra' === wp_get_theme()->get( 'Name' ) ) {
			add_action( 'astra_woo_single_add_to_cart_before', array(__CLASS__, 'srp_maybe_output_make_offer_button_on_single_product'), 10 );
		} else {
		}
			add_action( 'woocommerce_single_product_summary', array(__CLASS__, 'srp_maybe_output_make_offer_button_on_single_product'), 20 );

		add_filter( 'woocommerce_get_price_html',  array(__CLASS__, 'srp_maybe_remove_the_price'), 9999, 2 );
		add_filter( 'woocommerce_loop_add_to_cart_link', array(__CLASS__, 'srp_maybe_output_make_offer_button'), 10, 2 );

		add_action( 'wp_ajax_send_offer_to_admin', array( __CLASS__, 'send_offer_to_admin_callback'), 10, 2);
		add_action( 'wp_ajax_nopriv_send_offer_to_admin', array( __CLASS__, 'send_offer_to_admin_callback'), 10, 2);

	}
	public static function add_make_offer_field() {
		echo '<div class="options_group show_if_simple show_if_external">'; // Add the WooCommerce classes here
		$default_setting = (Sonaar_Music::get_option('sr_woo_make_offer_force_all', 'srmp3_settings_woocommerce') === "true") ? 'Yes' : 'No';
		woocommerce_wp_select(
			array(
				'id' => '_make_offer_enabled',
				'label' => __('Enable Make an Offer button', 'sonaar-music'),
				'description' => __('Select whether to enable the "Make an Offer" button.', 'sonaar-music'),
				'desc_tip' => 'true',
				//'value' => get_post_meta($variation->ID, '_make_offer_enabled', true),
				'options' => array(
					'default' => __('Default Settings (' . $default_setting . ')', 'sonaar-music'), // Default settings option
					'yes' => __('Yes', 'sonaar-music'),  // Yes option
					'no' => __('No', 'sonaar-music')    // No option
				)
			)
		);
		woocommerce_wp_checkbox(
			array(
				'id' => '_make_offer_hide_price',
				'label' => esc_html__('Remove Add to Cart button', 'sonaar-music'),
				'desc_tip' => 'true',
				'description' => esc_html__('Only display Make an Offer button. We will remove the Add to Cart button and the Price. ', 'sonaar-music'),
			)
		);
		woocommerce_wp_text_input(
			array(
				'id' => '_make_offer_minimum_price',
				'label' => esc_html__('Minimum Offer Price', 'sonaar-music'),
				'placeholder' => esc_html__('Enter minimum offer price', 'sonaar-music'),
				'desc_tip' => 'true',
				'description' => esc_html__('Optional. Set a minimum offer price for this product. If not set, we will apply the default minimum offer price set in your general settings', 'sonaar-music'),
				'type' => 'number',
				'custom_attributes' => array(
					'step' => '0.01',
					'min' => '0',
				)
			)
		);
	
		echo '</div>'; // Close the div
	}
	
    public static function add_make_offer_field_to_variations($loop, $variation_data, $variation) {
		$default_setting = (Sonaar_Music::get_option('sr_woo_make_offer_force_all', 'srmp3_settings_woocommerce') === "true") ? 'Yes' : 'No';
		 woocommerce_wp_select(
			array(
				'id' => '_make_offer_enabled_' . $variation->ID,
				'label' => __('Enable Make an Offer button', 'sonaar-music'),
				'description' => __('Select whether to enable the "Make an Offer" button.', 'sonaar-music'),
				'desc_tip' => 'true',
				'value' => get_post_meta($variation->ID, '_make_offer_enabled', true),
				'options' => array(
					'default' => __('Default Settings (' . $default_setting . ')', 'sonaar-music'), // Default settings option
					'yes' => __('Yes', 'sonaar-music'),  // Yes option
					'no' => __('No', 'sonaar-music')    // No option
				)
			)
		);
		woocommerce_wp_checkbox(
            array(
                'id' => '_make_offer_hide_price_' . $variation->ID,
                'label' => esc_html__('Remove Add to Cart button', 'sonaar-music'),
				'desc_tip' => 'true',
				'description' => esc_html__('Only display Make an Offer button. We will remove the Add to Cart button and the Price. ', 'sonaar-music'),
				'value' => get_post_meta($variation->ID, '_make_offer_hide_price', true)
            )
        );
		// Minimum Price Input Field for the variation
		woocommerce_wp_text_input(
			array(
				'id' => '_make_offer_minimum_price_' . $variation->ID, // Ensure this field has a unique ID
				'label' => __('Minimum Offer Price', 'sonaar-music'),
				'placeholder' => __('Enter minimum offer price', 'sonaar-music'),
				'desc_tip' => 'true',
				'description' => esc_html__('Optional. Set a minimum offer price for this product. If not set, we will apply the default minimum offer price set in your general settings', 'sonaar-music'),
				'type' => 'number',
				'value' => get_post_meta($variation->ID, '_make_offer_minimum_price', true), // Retrieve the saved minimum price
				'custom_attributes' => array(
					'step' => '0.01', // Allows decimal prices
					'min' => '0', // Minimum price is 0
				)
			)
		);
    }

    public static function save_make_offer_field($post_id) {
        $make_offer = isset($_POST['_make_offer_enabled']) ? sanitize_text_field($_POST['_make_offer_enabled']) : 'default';
        update_post_meta($post_id, '_make_offer_enabled', $make_offer);

		$hide_price = isset($_POST['_make_offer_hide_price']) ? 'yes' : 'no';
        update_post_meta($post_id, '_make_offer_hide_price', $hide_price);
		 // Save the minimum price field
		 if (isset($_POST['_make_offer_minimum_price'])) {
			$min_price = sanitize_text_field($_POST['_make_offer_minimum_price']);
			update_post_meta($post_id, '_make_offer_minimum_price', $min_price);
		}
    }

    public static function save_make_offer_field_for_variations($variation_id, $i) {
		$make_offer = isset($_POST['_make_offer_enabled_' . $variation_id]) ? sanitize_text_field($_POST['_make_offer_enabled_' . $variation_id]) : 'default';
		update_post_meta($variation_id, '_make_offer_enabled', $make_offer);

		$hide_price = isset($_POST['_make_offer_hide_price_' . $variation_id]) ? 'yes' : 'no';
        update_post_meta($variation_id, '_make_offer_hide_price', $hide_price);

		// Save the minimum price field for variations
		if (isset($_POST['_make_offer_minimum_price_' . $variation_id])) {
			$min_price = sanitize_text_field($_POST['_make_offer_minimum_price_' . $variation_id]);
			update_post_meta($variation_id, '_make_offer_minimum_price', $min_price);
		}
    }

	public static function srp_make_offer_single_product_elementor( $widget_content = null, $widget = null ) {
		// Hook for the ELEMENTOR Single Product Template
	
		$product = self::get_product();

		if (!$product) {
			return $widget_content;
		}

		if ('woocommerce-product-price' !== $widget->get_name() && 'woocommerce-product-add-to-cart' !== $widget->get_name()){
			return $widget_content;
		}
	
		if ($product->is_type('variable')) {
			// Handle variable product
			$variations = $product->get_available_variations();

			foreach ($variations as $variation) {
				$variation_id = $variation['variation_id'];
				$make_offer_hide_price = get_post_meta($variation_id, '_make_offer_hide_price', true);
				$make_offer_enabled = self::is_make_offer_enabled($variation_id);
	
				if ('woocommerce-product-add-to-cart' === $widget->get_name()) {
					if ($make_offer_enabled === 'yes') {
						$variation_data[] = [
							'variation_id' => $variation['variation_id'],
							'make_offer_hide_price' => $make_offer_hide_price,
						];
						// Gather all variation IDs and make_offer_hide_price data in an array
						self::output_make_offer_button($product, wc_get_product($variation_id));
					}
				}
				
				
			}

			if ('woocommerce-product-add-to-cart' === $widget->get_name()) {
				 if (!empty($variation_data)) {
					$widget_content .= '
						<script>
							var srp_make_offer_variations = ' . json_encode($variation_data) . ';
						</script>
					';
					// Reset $variation_data to avoid duplicates in subsequent calls
					$variation_data = [];
				}
			}
			
		} else {
			// Handle single product
			$make_offer_enabled = self::is_make_offer_enabled($product->get_id());
			$make_offer_hide_price = self::get_hide_price($product);
			if ('woocommerce-product-price' === $widget->get_name()) {
				// Remove the Add to Cart button if necessary
				if ($make_offer_enabled === 'yes' && $make_offer_hide_price === 'yes') {
					$widget_content = ''; // Remove price from the widget's content
				}
			}
	
			if ('woocommerce-product-add-to-cart' === $widget->get_name()) {
				// Output the button for the single product
				if($make_offer_enabled === 'yes'){
					self::output_make_offer_button($product);
					// Remove the Add to Cart button if necessary
					if ($make_offer_hide_price === 'yes') {

						$widget_content = ''; // Remove Add to Cart button from the widget's content
					}
				}
			}
		}
	
		return $widget_content;
	}
	
	public static function srp_maybe_remove_the_price($price, $product) {
		// Handle single product
		$make_offer_enabled = self::is_make_offer_enabled($product->get_id());
		$make_offer_hide_price = self::get_hide_price( $product );
		
		// If the price needs to be hidden, remove the actions before rendering
		if ( $make_offer_enabled === 'yes' && $make_offer_hide_price === 'yes' ) {
			//remove_action( 'woocommerce_after_shop_loop_item', 'woocommerce_template_loop_add_to_cart', 10 );
			//remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_add_to_cart', 30 );
			add_filter( 'woocommerce_is_purchasable', '__return_false' ); //will remove add to cart
			add_filter( 'woocommerce_loop_add_to_cart_link', '__return_false' );
			$price = ''; // Remove the price

		}else {
			// Ensure the filter is removed for subsequent products
			remove_filter( 'woocommerce_is_purchasable', '__return_false' );
			remove_filter( 'woocommerce_loop_add_to_cart_link', '__return_false' );
		}
		return $price;

	}
	public static function srp_maybe_output_make_offer_button($button, $product) {

		if ($product->is_type('simple')) {
			// Handle single product
			$make_offer_enabled = self::is_make_offer_enabled($product->get_id());
			$make_offer_hide_price = self::get_hide_price($product);
			if($make_offer_enabled === 'yes'){
				$custom_markup = self::output_make_offer_button($product);
				 // Combine custom markup with the default button or modify the button
				 $custom_button = $custom_markup . $button;

				 return $custom_button;
			}
		}

		return $button;

	}
	public static function srp_maybe_output_make_offer_button_on_single_product() {

		// Check if we're on a single product page
		if ( ! is_singular('product') ) {
			return; // Bail if we're not on a product page
		}
		
		// Ensure the global $product object is available
		global $product;
		// If global $product is not set, attempt to retrieve it
		if ( ! $product ) {
			$product = wc_get_product( get_the_ID() );
		}

		// Now check if the product object is valid
		if ( ! $product instanceof WC_Product ) {
			return; // Bail if no valid product object is found
		}

		if ($product->is_type('variable')) {
			// Handle variable product
			$variations = $product->get_available_variations();
			$variation_data = [];

			foreach ($variations as $variation) {
				$variation_id = $variation['variation_id'];
				$make_offer_enabled = self::is_make_offer_enabled($variation_id);
				$make_offer_hide_price = get_post_meta($variation_id, '_make_offer_hide_price', true);

				// Output the "Make an Offer" button for this variation
				if ( $make_offer_enabled === 'yes' ) {
					$variation_data[] = [
						'variation_id' => $variation_id,
						'make_offer_hide_price' => $make_offer_hide_price,
					];
					self::output_make_offer_button($product, wc_get_product($variation_id));
					/*add_action( 'woocommerce_single_product_summary', function() use ($product, $variation_id) {
						self::output_make_offer_button($product, wc_get_product($variation_id));
					}, 29 );*/
				}
			}

			if (!empty($variation_data)) {
				// Output the script for storing variation data for "Make an Offer"
				add_action( 'wp_footer', function() use ($variation_data) {
					echo '
						<script>
							var srp_make_offer_variations = ' . json_encode($variation_data) . ';
						</script>
					';
				});
			}

		} else {

			// Handle single product
			$make_offer_enabled = self::is_make_offer_enabled($product->get_id());
			$make_offer_hide_price = self::get_hide_price( $product );
			
			// Output the "Make an Offer" button right before the Add to Cart button
			if ( $make_offer_enabled === 'yes' ) {
				self::output_make_offer_button($product);
				//add_action( 'woocommerce_single_product_summary', array(__CLASS__, 'output_make_offer_button'), 10 ); // Place before Add to Cart
			}
			// If the price needs to be hidden, remove the actions before rendering
			if ( $make_offer_enabled === 'yes' && $make_offer_hide_price === 'yes' ) {
				//remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_price', 10 );
				//remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_add_to_cart', 30 );
			}

		
		}
	}

	// Utility function to output the "Make an Offer" button
	public static function output_make_offer_button($product = null, $variable_product = null) {
		// Now check if the product object is valid
		if ( !$product ) {
			global $product;
		}
		if ( !$product instanceof WC_Product ) {
			return; // Bail if no valid product object is found
		}
		$make_offer_enabled = self::is_make_offer_enabled($product->get_id());
		$make_offer_hide_price = get_post_meta( $product->get_id(), '_make_offer_hide_price', true );
		$image = get_the_post_thumbnail_url($product->get_id());
		$style = "";
		$variation_id = null;
		$mapo_label = (Sonaar_Music::get_option('makeanoffer_button_label', 'srmp3_settings_woocommerce')) ? Sonaar_Music::get_option('makeanoffer_button_label', 'srmp3_settings_woocommerce') : esc_html__('Make an Offer', 'sonaar-music');

		if ( $variable_product ) {
			$make_offer_enabled = self::is_make_offer_enabled($variable_product->get_id());
			$make_offer_hide_price = get_post_meta( $variable_product->get_id(), '_make_offer_hide_price', true );
			$style = "display:none;"; // will be handled via JS and the variation dropdown
			$variation_id = $variable_product->get_id();
		}
	
		if ($make_offer_enabled === 'yes') {
			echo '<div class="srp-make-offer-btn-wrapper" style="' . esc_attr($style) . '">
					<button id="make-offer-btn" class="srp-make-offer-bt button alt" 
						data-make-offer-enabled="' . esc_attr($make_offer_enabled) . '" 
						data-make-offer-hide-price="' . esc_attr($make_offer_hide_price) . '" 
						data-variation="' . esc_attr($variation_id) . '" 
						onclick="srp_wc_variation_popup(' . esc_js($product->get_id()) . ', this, \'' . esc_js($image) . '\')"
					>' . esc_html($mapo_label) . '</button>
				  </div>';
		}
	}

	// Utility function to check if the Make an Offer button is enabled
	public static function is_make_offer_enabled($product_id) {
		// Retrieve the make offer setting for the current variation
		$make_offer_enabled = get_post_meta($product_id, '_make_offer_enabled', true);
		// Check if no meta is set yet (for unsaved variations) or if the value is 'default'
		if (empty($make_offer_enabled) || $make_offer_enabled === 'default') {
			// Fallback to the global setting from Sonaar_Music options
			$make_offer_enabled = (Sonaar_Music::get_option('sr_woo_make_offer_force_all', 'srmp3_settings_woocommerce') === "true") ? 'yes' : 'no';
		}
	
		// Return the resolved make offer setting ('yes' or 'no')
		return $make_offer_enabled;
	}

	// Utility function to check for variations and get the hide price
	private static function get_hide_price($product) {
		$make_offer_hide_price = get_post_meta($product->get_id(), '_make_offer_hide_price', true);

		// Check for variations (if variable product)
		if ($product->is_type('variable')) {
			$variations = $product->get_available_variations();
			foreach ($variations as $variation) {
				$make_offer_hide_price_variation = get_post_meta($variation['variation_id'], '_make_offer_hide_price', true);
				if ($make_offer_hide_price_variation === 'yes') {
					$make_offer_hide_price = $make_offer_hide_price_variation;
					break;
				}
			}
		}

		return $make_offer_hide_price;
	}

	// Utility function to get the product object
	private static function get_product() {
		global $product;
		if (!is_a($product, 'WC_Product')) {
			$product = wc_get_product(get_the_ID());
		}
		return $product;
	}
	
	public static function send_offer_to_admin_callback() {
		check_ajax_referer('sonaar_music_ajax_nonce', 'nonce');
		
		$product_id = isset($_POST['product_id']) ? absint($_POST['product_id']) : 0;
		$variation_id = isset($_POST['variation_id']) ? absint($_POST['variation_id']) : 0;
		$product = wc_get_product($product_id);
		$product_title = $product ? $product->get_title() : 'Unknown Product';
		$product_url = get_permalink($product_id);
		$currency_symbol = get_woocommerce_currency_symbol();
		$currency_position = get_option('woocommerce_currency_pos', 'left');
	
		// Admin email
		$admin_email = get_option('admin_email');
		$admin_user = get_user_by('email', $admin_email); 
		$admin_first_name = get_user_meta($admin_user->ID, 'first_name', true);
		$admin_name = $admin_first_name ? $admin_first_name : 'Admin'; 
		
		// Customer's offer details
		$offer_price = isset($_POST['price']) ? sanitize_text_field($_POST['price']) : '';
		$offer_email = isset($_POST['email']) ? sanitize_email($_POST['email']) : '';
		$offer_message = isset($_POST['message']) ? sanitize_text_field($_POST['message']) : '';
	
		// Get the regular and sale price of the product or variation
		if ($variation_id) {
			$variation = wc_get_product($variation_id);
			$regular_price = $variation ? $variation->get_regular_price() : '';
			$sale_price = $variation ? $variation->get_sale_price() : '';
		} else {
			$variation = null;
			$regular_price = $product->get_regular_price();
			$sale_price = $product->get_sale_price();
		}

		// Use sale price if the product is on sale, otherwise use regular price
		$effective_price = !empty($sale_price) ? $sale_price : $regular_price;

		// Calculate the price difference (discount asked)
		$price_difference = floatval($effective_price) - floatval($offer_price);

		// Format the prices
		$formatted_offer_price = self::format_price_with_currency($currency_position, $currency_symbol, $offer_price);
		$formatted_effective_price = self::format_price_with_currency($currency_position, $currency_symbol, $effective_price);
		$formatted_regular_price = self::format_price_with_currency($currency_position, $currency_symbol, $regular_price);
		$formatted_price_difference = self::format_price_with_currency($currency_position, $currency_symbol, $price_difference);
		$formatted_notice = Sonaar_Music::get_option('makeanoffer_sent', 'srmp3_settings_woocommerce');
	
		// Get the checkout URL
		$checkout_url = wc_get_checkout_url();
		$add_to_checkout_url = add_query_arg(array(
			'add-to-cart' => $product_id,
			'variation_id' => $variation_id,
		), $checkout_url);
	
		// Get email template from CMB2 settings
		$email_template = Sonaar_Music::get_option('makeanoffer_email_markup', 'srmp3_settings_woocommerce');
		if (empty($email_template)) {
			// Default template if none is defined
			$email_template = 'Hello {{admin_firstname}},
	
	You have received a new price offer for the product {{product_title}} from a potential customer.
	
	---
	{{product_title}}
	{{product_attribute_name}}
	Product URL: {{product_url}}
	
	---
	Customer\'s Offer:
	Offer Price: {{offer_price}}
	Current Price: {{product_price}}
	Discount Asked: {{price_difference}}
	
	If you accept the offer, create a coupon code and send your customer that code, as well as this URL : {{checkout_url}}
	
	---
	Customer Information:
	Email: {{customer_email}}
	Price: {{offer_price}}
	Message: {{offer_message}}
	
	Please review the customer\'s offer and respond to them directly to negotiate, accept, or make a counter-offer.
	
	Kind Regards,
	{{admin_firstname}}
	{{website_name}}';
		}
	
		// Replace placeholders with dynamic values and convert new lines to <br> tags
		$message = str_replace(
			array(
				'{{admin_firstname}}', 
				'{{product_title}}', 
				'{{product_attribute_name}}', 
				'{{product_url}}', 
				'{{offer_price}}', 
				'{{product_price}}', 
				'{{price_difference}}', 
				'{{checkout_url}}', 
				'{{customer_email}}', 
				'{{offer_message}}', 
				'{{website_name}}'
			),
			array(
				$admin_first_name, 
				$product_title, 
				$variation ? wc_get_formatted_variation($variation->get_variation_attributes(), true) : '', 
				'<a href="' . esc_url($product_url) . '">' . esc_url($product_url) . '</a>', // Make Product URL clickable
				$formatted_offer_price, 
				$formatted_effective_price, // Use the effective price (sale or regular) in the email template
				$formatted_price_difference, 
				'<a href="' . esc_url($add_to_checkout_url) . '">' . esc_url($add_to_checkout_url) . '</a>', // Make Checkout URL clickable
				$offer_email, 
				nl2br($offer_message), // Convert offer_message newlines to <br> tags
				'<a href="' . esc_url(home_url()) . '">' . get_bloginfo('name') . '</a>' // Make Website Name clickable
			),
			$email_template
		);

		// Initialize a variable to track if extra fields are found
		$extra_fields = '';

		// Loop through additional fields in $_POST and append them to the message
		foreach ($_POST as $field_name => $field_value) {
			if (in_array($field_name, ['nonce', 'action', 'product_id', 'variation_id', 'price', 'email', 'message'])) {
				continue;
			}
			$sanitized_value = stripslashes(sanitize_text_field($field_value));
			$extra_fields .= ucwords(str_replace('_', ' ', $field_name)) . ': ' . $sanitized_value . '<br>';
		}

		// If extra fields were found, add the header and the extra fields to the message
		if (!empty($extra_fields)) {
			$message .= '<br><br>------------------<br>Custom Fields<br>------------------<br>' . $extra_fields;
		}

		// Ensure template new lines are converted to <br> tags
		$message = nl2br($message);

		// Get the subject from CMB2 settings
		$email_subject_template = Sonaar_Music::get_option('makeanoffer_email_subject', 'srmp3_settings_woocommerce');

		// Replace variables in the subject
		$subject = str_replace(
			array('{{product_title}}'),
			array($product_title),
			$email_subject_template
		);

		// Check for minimum price, whether it's a variation or a single product
		if ($variation_id) {
			$min_price = get_post_meta($variation_id, '_make_offer_minimum_price', true);
		} else {
			$min_price = get_post_meta($product_id, '_make_offer_minimum_price', true);
		}
	
		// Fallback to global minimum price if none is set
		if (empty($min_price)) {
			$min_price = Sonaar_Music::get_option('makeanoffer_min_price', 'srmp3_settings_woocommerce');
		}
	
		$formatted_min_price = self::format_price_with_currency($currency_position, $currency_symbol, $min_price);
	
		// Validate the offer price
		if (!empty($min_price) && floatval($offer_price) < floatval($min_price)) {
			$failed_string = (Sonaar_Music::get_option('makeanoffer_failed_price', 'srmp3_settings_woocommerce')) 
				? Sonaar_Music::get_option('makeanoffer_failed_price', 'srmp3_settings_woocommerce') 
				: esc_html__('The offer price must be at least:', 'sonaar-music');
			wp_send_json_error(html_entity_decode($failed_string . ' ' . $formatted_min_price));
		}
	
		// Send the email with HTML headers
		$headers = array('Reply-To: ' . sanitize_email($offer_email), 'Content-Type: text/html; charset=UTF-8');
		wp_mail($admin_email, $subject, $message, $headers);
		wp_send_json_success(['formatted_notice' => '<div class="srp-popup-form srp-popup-form--confirm">' . wpautop($formatted_notice) . '</div>']);
	}

	public static function format_price_with_currency($currency_position, $currency_symbol, $price) {
		// Format price based on WooCommerce currency position settings
		switch ($currency_position) {
			case 'left':
				return $currency_symbol . $price;
			case 'right':
				return $price . $currency_symbol;
			case 'left_space':
				return $currency_symbol . '&nbsp;' . $price;
			case 'right_space':
				return $price . '&nbsp;' . $currency_symbol;
			default:
				return $currency_symbol . ' ' . $price; // Default to left if not specified
		}
	}

	public static function srmp3_add_image_checkout ( $name, $cart_item, $cart_item_key ) {
		if ( ! is_checkout() ) 
			{return $name;}
		
		$product = $cart_item['data'];
		
		if ($product->get_image_id() != 0){
			$thumbnail = $product->get_image( array( '50', '50' ), array( 'class' => 'alignleft' ) ); 
		}else{
			$thumbnail = '';
		}

		/*Above you can change the thumbnail size by changing array values e.g. array(‘100’, ‘100’) and also change alignment to alignright*/
		return $thumbnail . $name;
	}
	/**
	 * Callback function hooked to the 'woocommerce_post_class' filter
	 * Add the 'waveplayer-product' class to a product with preview files
	 *
	 * @since  1.0.0
	 * @param array      $classes The array containing the track info.
	 * @param WC_Product $product The current $product object.
	 * @return array     The filtered array containing the product item classes
	 */

	public static function woocommerce_post_class( $classes, $product ) {
		$srmp3_product_player = Sonaar_Music::srmp3_check_if_audio($product, true);
		
		if($srmp3_product_player ){
			$classes[] = 'srmp3-product';

			if(self::srmp3_remove_wc_featured_image()=='true'){
				$classes[] = 'srmp3-product__hideimage';
			}
		}
		
		return $classes;
	}
	/**
	 * Check if featured image shall be removed on our player
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public static function sr_check_woo_image($product) {
		
		$srmp3_product_player = Sonaar_Music::srmp3_check_if_audio($product, true);
		if( !$srmp3_product_player ){
			//var_dump("these product are NOT using the mp3 player");
			add_action( 'woocommerce_before_shop_loop_item_title', 'woocommerce_template_loop_product_thumbnail', 10 );
			add_action( 'woocommerce_before_shop_loop_item_title', 'woocommerce_show_product_loop_sale_flash', 10 );
		}else{
			// Remove product images from the shop loop
			remove_action( 'woocommerce_before_shop_loop_item_title', 'woocommerce_template_loop_product_thumbnail', 10 );
			remove_action( 'woocommerce_before_shop_loop_item_title', 'woocommerce_show_product_loop_sale_flash', 10 );
		}
		
	}

    /**
	 * Get position of the player in wc product template
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public static function srmp3_product_player_pos() {
		$srmp3player_pos =  Sonaar_Music::get_option('sr_woo_product_position', 'srmp3_settings_woocommerce' );
		if($srmp3player_pos){
			return Sonaar_Music::get_option('sr_woo_product_position', 'srmp3_settings_woocommerce'); 
		}else{
			return 'disable';
		}
        
	}

    /**
	 * Get position of the player in wc shop loop
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public static function srmp3_shop_player_pos() {
        return Sonaar_Music::get_option('sr_woo_shop_position', 'srmp3_settings_woocommerce'); 
	}
	
	/**
	 * Check if featured image shall be removed on our player
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public static function srmp3_remove_wc_featured_image() {
        return Sonaar_Music::get_option('remove_wc_featured_image', 'srmp3_settings_woocommerce'); 
	}
    /**
	 * Register action for shop page loop
	 *
	 * @since 1.0.0
	 */
	public static function wc_shop_page_hooks() {
		global $pagenow;
		if (is_admin() && !wp_doing_ajax() && !($pagenow == 'post.php' && ( isset($_GET['action']) && $_GET['action'] == 'elementor'))){ // we dont want to swap image columns for audio player in the admin area
			return;
		}

		// Allow other plugins to define conditions for skipping the function
		$disable_wc_player = apply_filters('srmp3_disable_wc_player', false);
		if ($disable_wc_player) {
			return;
		}

		$srmp3_shop_player = self::srmp3_shop_player_pos(); //disable, before, after
		
		if ($srmp3_shop_player !== 'disable'){
			//if (self::srmp3_remove_wc_featured_image()=='true' || Sonaar_Music::get_option('sr_woo_shop_position') == 'over_image'){
			if (Sonaar_Music::get_option('sr_woo_shop_position', 'srmp3_settings_woocommerce') == 'over_image'){
				add_filter( 'woocommerce_product_get_image', array( __CLASS__, 'filter_srmp3_player_html' ), 10, 2 );						
			}else{
				if ($srmp3_shop_player == 'after_item'){ 
					add_action( "woocommerce_after_shop_loop_item", array( __CLASS__, 'sr_display_wc_shop_player' ), 10 );
				}else{	
					add_action( "woocommerce_{$srmp3_shop_player}_shop_loop_item_title", array( __CLASS__, 'sr_display_wc_shop_player' ), 10 );
				}
			}
		}
	}

	/**
	 * Return the audio player shortcode
	 *
	 * @since  1.0.0
	 * @param  string	$html   	When used as a filter, the WC markup is replaced.
	 * @param  WC_Product|int $_product The ID or object of the current product.
	 * @return string
	 */
	public static function filter_image_to_player($image_element, $image_src, $product_id){

	}
	public static function filter_srmp3_player_html( $image, $_product = null ) {
		if ( self::is_single_product() || is_cart() || self::is_mini_cart() ) {
			return $image;
		}
		global $product;
		if ( is_numeric( $_product ) ) {
			if ( 'attachment' === get_post_type( $_product ) ) {
				$_product = $product;
			} elseif ( 'product' === get_post_type( $_product ) ) {
				$_product = wc_get_product( $_product );
			}
		}

		$woo_srmp3_player = self::woo_srmp3_player ($_product);
		if ($woo_srmp3_player){
			$image = $woo_srmp3_player;
		}
		return $image;
	}

	/**
	 * Check if product related for our filter
	 *
	 * @since  1.0.0
	 * @return boolean
	 */
	public static function is_single_product() {
		if ( is_product() && 'related' !== wc_get_loop_prop( 'name' ) ) {
			return true;
		}
		return false;
	}
	/**
	 * Prevent to filter if its inside mini cart
	 *
	 * @since  1.0.0
	 * @return boolean
	 */
	public static function is_mini_cart() {
		return ( did_action( 'woocommerce_before_mini_cart' ) > did_action( 'woocommerce_after_mini_cart' ) );
	}
	/**
	 * Return the SRMP3 shortcode if it being used in WC product otherwise return false
	 *
	 * @since  1.0.0
	 * @return string
	 */
	public static function woo_srmp3_player( $_product = null ) {
	
		$srmp3_product_player = Sonaar_Music::srmp3_check_if_audio($_product, true);
		
		if( !$srmp3_product_player )
		return;
	
		
		if ( self::is_single_product() ){
			$srmp3_product_skin = Sonaar_Music::get_option('sr_woo_skin_product', 'srmp3_settings_woocommerce');
			if ($srmp3_product_skin == 'custom_shortcode'){
				$player_shortcode = Sonaar_Music::get_option('sr_woo_product_player_shortcode', 'srmp3_settings_woocommerce');
			}else{
				$player_shortcode = '[sonaar_audioplayer';
				$player_shortcode .= ' hide_timeline="false"';
				//$player_shortcode .= ' hide_progressbar="true"';
				$player_shortcode .= ' hide_artwork="true"';
				//$player_shortcode .= ' hide_player_title="true"';
				$player_shortcode .= ' hide_album_subtitle="true"';
				$player_shortcode .= ' hide_control_under="true"';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_product_attr_progressbar', 'srmp3_settings_woocommerce') == 'true') ? ' hide_progressbar="false"': ' hide_progressbar="true"';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_product_attr_sticky_player', 'srmp3_settings_woocommerce') == 'true') ? ' sticky_player="true"': ' sticky_player="false"';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_product_attr_tracklist', 'srmp3_settings_woocommerce') == 'true') ? ' show_playlist="true"': '';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_product_attr_albumtitle', 'srmp3_settings_woocommerce') == 'true') ? ' hide_player_title="false" hide_album_title="false"': ' hide_player_title="true" hide_album_title="true"';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_product_attr_albumsubtitle', 'srmp3_settings_woocommerce') == 'true') ? ' hide_album_subtitle="false"': '';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_product_attr_control', 'srmp3_settings_woocommerce') == 'true') ? ' hide_control_under="false"': '';
				//$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_product_position') == 'over_image') ? ' hide_artwork="false" display_control_artwork="true" hide_control_under="true"': '';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_product_attr_progress_inline', 'srmp3_settings_woocommerce') == 'true') ? ' progressbar_inline="true" hide_timeline="false"': '';
				$player_shortcode .= ' show_album_market="false"';
				$player_shortcode .= ' hide_track_title="true"';
				$player_shortcode .= ' hide_times="true"';
				//$player_shortcode .= ' hide_timeline="true"';
				$player_shortcode .= ' show_track_market="true"';
				$player_shortcode .=' ]';
			}			
		}else {
			
			$srmp3_shop_skin = Sonaar_Music::get_option('sr_woo_skin_shop', 'srmp3_settings_woocommerce');
			if ($srmp3_shop_skin == 'custom_shortcode'){
				$player_shortcode = Sonaar_Music::get_option('sr_woo_shop_player_shortcode', 'srmp3_settings_woocommerce');
			}else{
				$player_shortcode = '[sonaar_audioplayer';
				
				$player_shortcode .= ' hide_artwork="true"';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_shop_attr_progressbar', 'srmp3_settings_woocommerce') == 'true') ? ' hide_timeline="false"': ' hide_timeline="true"';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_shop_attr_sticky_player', 'srmp3_settings_woocommerce') == 'true') ? ' sticky_player="true"': '';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_shop_attr_tracklist', 'srmp3_settings_woocommerce') == 'true') ? ' show_playlist="true"': '';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_shop_position', 'srmp3_settings_woocommerce') == 'over_image') ? ' hide_artwork="false" display_control_artwork="true" hide_control_under="true"': '';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_skin_shop_attr_progress_inline', 'srmp3_settings_woocommerce') == 'true') ? ' progressbar_inline="true" hide_timeline="false"': '';
				$player_shortcode .= ( Sonaar_Music::get_option('sr_woo_button_hover', 'srmp3_settings_woocommerce') == 'true') ? ' show_control_on_hover="true" ': '';

				$player_shortcode .= ' hide_album_title="true"';
				$player_shortcode .= ' show_album_market="false"';
				$player_shortcode .= ' hide_track_title="true"';
				$player_shortcode .= ' hide_times="true"';
				$player_shortcode .= ' product_archive="true"';
				
				//$player_shortcode .= ' hide_timeline="true"';

				$player_shortcode .=' ]';
			}			
		}
		$shortcode = do_shortcode (" $player_shortcode ");
		if (strlen($shortcode) < 10) return false;

		return $shortcode;
	}
	public static function generateContract($post_id = null, $order = null, $product_name = null, $variation_id = null){
        /* Get the Contract Fields
        /*
        */
		// if variation_id is set
		if($variation_id){
			$product_id = wp_get_post_parent_id( $variation_id );
		}
		
        $usageterms_num_dist_copies = '<strong>' . get_post_custom_values( 'usageterms_num_dist_copies', $post_id )[0] . '</strong>';
        $usageterms_num_audio_streams = '<strong>' . get_post_custom_values( 'usageterms_num_audio_streams', $post_id )[0] . '</strong>';
        $usageterms_num_radio_stations = '<strong>' . get_post_custom_values( 'usageterms_num_radio_stations', $post_id )[0] . '</strong>';
        $usageterms_num_free_downloads = '<strong>' . get_post_custom_values( 'usageterms_num_free_downloads', $post_id )[0] . '</strong>';
        $usageterms_num_music_videos = '<strong>' . get_post_custom_values( 'usageterms_num_music_videos', $post_id )[0] . '</strong>';
        $usageterms_num_monetized_video_streams = '<strong>' . get_post_custom_values( 'usageterms_num_monetized_video_streams', $post_id )[0] . '</strong>';
        $usageterms_num_nonmonetized_video_streams = '<strong>' . get_post_custom_values( 'usageterms_num_nonmonetized_video_streams', $post_id )[0] . '</strong>';
        $usageterms_allow_profit_performances = (get_post_custom_values( 'usageterms_allow_profit_performances', $post_id )[0] === 'yes') ? '<strong>allows</strong>' : '<strong>does not allow</strong>';
        $usageterms_licensename = '<strong>' . get_the_title( $post_id ) . '</strong>';
        $usageterms_get_current_date = '<strong>' . date(get_option('date_format')) . '</strong>';
        $usageterms_states = (isset(get_post_custom_values( 'usageterms_state', $post_id )[0]) && get_post_custom_values( 'usageterms_state', $post_id )[0] !== '') ?  '<strong>' . get_post_custom_values( 'usageterms_state', $post_id )[0] . ', ' . get_post_custom_values( 'usageterms_country', $post_id )[0]  . '</strong>' : '<strong>country of the seller</strong>';
        $usageterms_producer_alias = '<strong>' . get_post_custom_values( 'usageterms_producer_alias', $post_id )[0] . '</strong>';
		$usageterms_customer_fullname = (isset($order)) ? '<strong>' . $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() . '</strong>' : 'The Customer Name';
        $usageterms_customer_address = (isset($order)) ? '<strong>' . $order->get_billing_address_1() . ' ' . $order->get_billing_address_2()  . '</strong>' : 'The Customer Address';
		$usageterms_customer_email = (isset($order)) ? '<strong>' . $order->get_billing_email() . '</strong>' : 'The Customer Email Address';
		$product_title = (isset($product_name)) ? '<strong>' . $product_name . '</strong>' : 'The Product';
        //$product_price = '<strong>' . 'WIP PRICE $' . '</strong>';

        /* Generate the contract
        /*
        */
        $usageterms_contract = get_post_custom_values( 'usageterms_contract', $post_id )[0];

        $usageterms_contract = str_replace('{LICENSE_NAME}', $usageterms_licensename, $usageterms_contract);
        $usageterms_contract = str_replace('{CUSTOMER_FULLNAME}', $usageterms_customer_fullname, $usageterms_contract);
		$usageterms_contract = str_replace('{CUSTOMER_ADDRESS}', $usageterms_customer_address, $usageterms_contract);
		$usageterms_contract = str_replace('{CUSTOMER_EMAIL}', $usageterms_customer_email, $usageterms_contract);
		$usageterms_contract = str_replace('{CONTRACT_DATE}', $usageterms_get_current_date, $usageterms_contract);
        $usageterms_contract = str_replace('{PRODUCER_ALIAS}', $usageterms_producer_alias, $usageterms_contract);
        $usageterms_contract = str_replace('{PRODUCT_TITLE}', $product_title, $usageterms_contract);
        //$usageterms_contract = str_replace('{PRODUCT_PRICE}', $product_price, $usageterms_contract);
        $usageterms_contract = str_replace('{PERFORMANCES_FOR_PROFIT}', $usageterms_allow_profit_performances, $usageterms_contract);
        $usageterms_contract = str_replace('{NUMBER_OF_RADIO_STATIONS}', $usageterms_num_radio_stations, $usageterms_contract);
        $usageterms_contract = str_replace('{MONETIZED_MUSIC_VIDEOS}', $usageterms_num_music_videos, $usageterms_contract);
        $usageterms_contract = str_replace('{DISTRIBUTE_COPIES}', $usageterms_num_dist_copies, $usageterms_contract);
        $usageterms_contract = str_replace('{AUDIO_STREAMS}', $usageterms_num_audio_streams, $usageterms_contract);
        $usageterms_contract = str_replace('{MONETIZED_VIDEO_STREAMS_ALLOWED}', $usageterms_num_monetized_video_streams, $usageterms_contract);
        //$usageterms_contract = str_replace('{NONMONETIZED_VIDEO_STREAMS_ALLOWED}', $usageterms_num_nonmonetized_video_streams, $usageterms_contract);
        $usageterms_contract = str_replace('{FREE_DOWNLOADS}', $usageterms_num_free_downloads, $usageterms_contract);
        $usageterms_contract = str_replace('{STATE_PROVINCE_COUNTRY}', $usageterms_states, $usageterms_contract);
		
		if(function_exists('acf') && $product_id){
			// if {acf_any_field_value} is found in the contract, replace it with the acf field value from the product post. It allows to use any acf field in the contract.
			$pattern = '/\{acf_([^}]+)\}/';  // Regular expression pattern

			$usageterms_contract = preg_replace_callback($pattern, function($matches) use ($product_id) {
				$field_value = $matches[1];  // Captured value between {acf_ and }
				return do_shortcode('[acf field="' . $field_value . '" post_id="' . $product_id . '"]');
			}, $usageterms_contract);
		}
		
		foreach (get_post_meta($post_id, 'usageterms_custom_options_group') as $value){
			foreach($value as $string){
				$usageterms_contract = str_replace( $string['usageterms_custom_options_item_var'], $string['usageterms_custom_options_item_name'], $usageterms_contract);
			}
		}
		return wp_kses( $usageterms_contract, array(
            'a' => array(
                'href' => array(),
                'title' => array()
            ),
            'br' => array(),
            'p' => array(),
			'h1' => array(),
			'h2' => array(),
			'h3' => array(),
			'h4' => array(),
			'h5' => array(),
            'em' => array(),
            'strong' => array(),
        ) );
    }
    /**
	 * Output SRMP3 player on the shop loop
	 *
	 * @since  1.0.0
	 */
	public static function sr_display_wc_shop_player() {
		$woo_srmp3_player = self::woo_srmp3_player ();
		if ($woo_srmp3_player){
			echo $woo_srmp3_player;
		}
	}

	// Return all args if $argKey is not set or a specific arg from a product variantion ID | "Custom product attribute" only return its name
	//$argKey eq: 'name','term_taxonomy_id'
	public static function srp_get_productAttibuteTerm_arg_from_productVariantionId($productVariantionID, $argKey = null) {
		$variantionPost = wc_get_product($productVariantionID);
		if ( ! $variantionPost ) {
			return;
		}
		$variantAttributes = $variantionPost ->get_attributes();
		$variantAttributesTermIDs=[];
		foreach ( $variantAttributes as $taxonomy => $value ) {
			$term_obj = get_term_by( 'slug', $value, $taxonomy );
			if($term_obj === false){ //if it is a "Custom product attribute", return only its name.
				array_push($variantAttributesTermIDs, $value);
			}else if( $argKey != null && isset($term_obj->$argKey)){  //if $argKey is set, return this specific value
				array_push($variantAttributesTermIDs, $term_obj->$argKey);
			}else{  //Otherwise, return all args.
				array_push($variantAttributesTermIDs, $term_obj);
			}	
		}
		return($variantAttributesTermIDs);
	}

	public static function srp_get_license_post_id_from_attribute_term_id($attrTermID) { //Return all Usage-terms post IDs who the Product Attribute [$attrTermID] is selected
		$usageTermsPosts = get_posts(array(
			'post_type' => 'usage-terms',
			'posts_per_page' => -1,
		));
		$usageTerms_selectedAtribute = [];
		foreach ( $usageTermsPosts as $post ) {
			$selectedAtribute = get_post_meta($post->ID, 'usageterms_product_variation');
			if(in_array($attrTermID, $selectedAtribute)){
				array_push($usageTerms_selectedAtribute,$post->ID);
			}
		}
		return $usageTerms_selectedAtribute;
	}

	public static function srp_get_variantFileTypes_from_variationID($variantId) { 
		$productVariationTermIDs = SRMP3_WooCommerce::srp_get_productAttibuteTerm_arg_from_productVariantionId( $variantId, 'term_taxonomy_id' );
		$licensePostId = [];
		$variantFileTypes = [];
		foreach ( $productVariationTermIDs  as $value) { //Each product attribute term select to the variation
			$licensePostId = array_merge($licensePostId, SRMP3_WooCommerce::srp_get_license_post_id_from_attribute_term_id($value) );
		}
		foreach ( $licensePostId  as $value) { //Each product attribute term select to the variation
			$variantFileTypes = array_merge($variantFileTypes, get_post_meta($value, 'usageterms_filetypes')[0] );
		}
		$variantFileTypes = array_map(function($n){return SRMP3_WooCommerce::srp_outputTranslatableTexts($n);}, $variantFileTypes);
		$variantFileTypes = implode(__(' + ', 'sonaar-music-pro'), $variantFileTypes);
		return  $variantFileTypes;
	}

	public static function srp_wc_variation_output_all_usageTerms($variantId) {
		$response = '';
		$productVariationTermIDs = SRMP3_WooCommerce::srp_get_productAttibuteTerm_arg_from_productVariantionId( $variantId, 'term_taxonomy_id' );
		foreach ( $productVariationTermIDs  as $value) { //Each product attribute term select to the variation
			$usageTermIDs = SRMP3_WooCommerce::srp_get_license_post_id_from_attribute_term_id($value);
			foreach ($usageTermIDs  as $theUsageTerm) { //Each usage-term post selected by the product attribute term 
				$response .= SRMP3_WooCommerce::srp_wc_variation_output_usageTerms($theUsageTerm);
			}
		}
		return $response;
	}
	
	public static function srp_outputTranslatableTexts($string) {
		switch ($string) {
			case 'mp3':
				$string = __('mp3', 'sonaar-music-pro');
				break;
			case 'wav':
				$string = __('wav', 'sonaar-music-pro');
				break;
			case 'stems':
				$string = __('stems', 'sonaar-music-pro');
				break;
			case 'yes':
				$string = __('yes', 'sonaar-music-pro');
				break;
			case 'no':
				$string = __('no', 'sonaar-music-pro');
				break;
		}
		return($string);
	}

	public static function srp_wc_variation_output_usageTerms($termID, $show_preview_button = null) {
		if ( 'publish' == get_post_status ( $termID ) && 'usage-terms' === get_post_type( $termID ) ){
		}else{
			return;
		}

		
	
		$termFieldID = [
			array('id' => 'usageterms_filetypes', 'label' => __('{value} included', 'sonaar-music-pro'), 'icon' => 'sricon-filedownload'  ),
			array('id' => 'usageterms_num_dist_copies', 'label' => __('Distribute up to {value} copies', 'sonaar-music-pro'), 'icon' => 'sricon-layers'  ),
			array('id' => 'usageterms_num_audio_streams', 'label' => __('{value} audio streams', 'sonaar-music-pro'), 'icon' => 'sricon-audiostream'  ),
			array('id' => 'usageterms_num_music_videos', 'label' => __('{value} music videos', 'sonaar-music-pro'), 'icon' => 'sricon-svg-video'  ),
			array('id' => 'usageterms_num_radio_stations', 'label' => __('Radio broadcasting rights ({value} stations)', 'sonaar-music-pro'), 'icon' => 'sricon-radio2'  ),
			array('id' => 'usageterms_num_free_downloads', 'label' => __('{value} free downloads', 'sonaar-music-pro'), 'icon' => 'sricon-download'  ),
			array('id' => 'usageterms_num_monetized_video_streams', 'label' => __('{value} video streams', 'sonaar-music-pro'), 'icon' => 'sricon-podcastindex'  ),
			array('id' => 'usageterms_allow_profit_performances', 'label' => esc_html__('For paid performances? {value}', 'sonaar-music-pro'), 'icon' => 'sricon-dj'  )
		];
		$output = '<div class="srp_variant_terms" data-term_id="' . $termID . '">';
		$output .= '<div class="srp_term_title">'. get_the_title( $termID ) .'</div>';
		$output .= '<div class="srp_term_meta_list">';
		
		// Load hardcoded license options
		foreach ($termFieldID as $fieldID){
			if (count(get_post_meta($termID, $fieldID['id'])) > 0 ){
				if ($fieldID['id'] == 'usageterms_filetypes'){
					$fileTypes = array();
					foreach (get_post_meta($termID, 'usageterms_filetypes') as $value){
						$value = array_map(function($n){return SRMP3_WooCommerce::srp_outputTranslatableTexts($n);}, $value);
						$fileTypes = array_merge($fileTypes, $value);	
					}
					$fileTypes = array_unique($fileTypes);
					$fileTypes = implode(__(' + ', 'sonaar-music-pro'), $fileTypes);
					$field = str_replace('{value}', '<span class="srp_term_meta_value">' . esc_html($fileTypes) .'</span>' , $fieldID['label']);
				}else{
					$value = array_map(function($n){return SRMP3_WooCommerce::srp_outputTranslatableTexts($n);}, get_post_meta($termID, $fieldID['id']));
					$value = array_unique($value);
					$field = str_replace('{value}', '<span class="srp_term_meta_value">' . esc_html(implode(",", $value)) .'</span>' , $fieldID['label']);
				}
				$output .= '<div class="srp_term_meta ' . $fieldID['icon'] . '" data-variant-term-meta="' . $fieldID['id'] . '">';
				$output .= '<span class="srp_term_meta_label">' . $field . '</span>';
				$output .= '</div>'; // DIV srp_term_meta
			}
		}

		// Load custom license options
		foreach (get_post_meta($termID, 'usageterms_custom_options_group') as $value){
			foreach($value as $string){
				$icon = ($string['usageterms_custom_options_item_icon'] != '') ? $string['usageterms_custom_options_item_icon'] : "fa-solid fa-check";
				$output .= '<div class="srp_term_meta "><i class="' . $icon . '"></i>	';
				$output .= '<span class="srp_term_meta_label">' . $string['usageterms_custom_options_item_name'] . '</span>';
				$output .= '</div>'; // DIV srp_term_meta
			}
		}

		$output .= '</div>'; // DIV srp_term_meta_list
		if($show_preview_button === 'true'){
			$output .='
			<button
			type="button"
			class="view-license-button" 
			aria-label="Preview License"
			data-variation-id=""
			data-license-id="' . esc_attr( $termID ) . '"
			data-product-name=""
			>' . esc_html('Preview License', 'sonaar-music-pro') . '</button>';
		}
		$output .= '</div>'; // DIV srp_variant_terms

		return $output;
	}

	public static function srp_wc_variation_modal($button, $product) { 
		if ($product->is_type( 'variable' ) && count($product->get_available_variations()) > 0 && Sonaar_Music::srmp3_check_if_audio($product, true)){ 
			
			$button = str_replace('class="', 'onclick="srp_variation_button(this)" class="', $button);

			$needle_start = 'href="';
			$needle_end = '"';
			$replacement = '#!';
			$pos = strpos($button, $needle_start);
			$start = $pos === false ? 0 : $pos + strlen($needle_start);
			$pos = strpos($button, $needle_end, $start);
			$end = $pos === false ? strlen($button) : $pos;
			$button = substr_replace($button, $replacement, $start, $end - $start); //remove the href
		}
		return $button;
	}
	public static function srmp3_add_license_button( $cart_item ) {
		$variation_id = $cart_item['variation_id'];  // The variation ID
		$product = wc_get_product( $cart_item['variation_id'] );

		if ( ! $product ) {
			return;
		}
			
		$attrTermID = SRMP3_WooCommerce::srp_get_productAttibuteTerm_arg_from_productVariantionId( $variation_id, 'term_taxonomy_id' );
		$licenseID = array();
		foreach($attrTermID as $value){
			$licenseID = array_merge($licenseID, SRMP3_WooCommerce::srp_get_license_post_id_from_attribute_term_id($value) );
		}
		foreach($licenseID as $value){
			?>
			<button 
			type="button"
			class="view-license-button" 
			aria-label="Preview License"
			data-variation-id="<?php echo esc_attr( $variation_id ); ?>"
			data-license-id="<?php echo esc_attr( $value ); ?>"
			data-product-name="<?php echo esc_attr($cart_item['data']->get_name()); ?>"
			>
				<?php esc_html_e('Preview License', 'sonaar-music-pro'); ?>
			</button>
			<?php
		}
	}

	public static function srmp3_has_usage_license( $cart_item ) {
		$variation_id = $cart_item['variation_id'];  // The variation ID
		$prod = wc_get_product( $cart_item['variation_id'] );

		if ( ! $prod ) {
			return;
		}

		$attrTermID = SRMP3_WooCommerce::srp_get_productAttibuteTerm_arg_from_productVariantionId( $variation_id, 'term_taxonomy_id' );
		$licenseID = array();
		foreach($attrTermID as $value){
			$licenseID = array_merge($licenseID, SRMP3_WooCommerce::srp_get_license_post_id_from_attribute_term_id($value) );
		}
		foreach($licenseID as $value){
			if ( is_numeric($value) ){
				return true;
			}
		}
		return false;
	}
	public static function load_license_preview_ajax_callback() {
		check_ajax_referer('sonaar_music_ajax_nonce', 'nonce');
		$response = '<div class="srp-license-preview-modal srp-modal-medium-size">';
		$response .= SRMP3_WooCommerce::srp_wc_variation_output_usageTerms( $_POST['licenseId'] );
		$response .= SRMP3_WooCommerce::generateContract(sanitize_text_field($_POST['licenseId']), null, sanitize_text_field($_POST['productName']), sanitize_text_field($_POST['variationId']));
		$response .= '</div>';
		echo $response;
		wp_die();
	}
	public static function replace_image_with_shortcode($image_element, $product_id) {
		$srmp3_product_player = Sonaar_Music::srmp3_check_if_audio($product_id, true);
		
		if ( ! $srmp3_product_player ) return $image_element;

		if ( $image_element ){
			// Start building the player shortcode
			$player_shortcode = '[sonaar_audioplayer';
			$player_shortcode .= ' albums="' . $product_id . '"';
			$player_shortcode .= ' display_control_artwork="true"';
			$player_shortcode .= ' hide_progressbar="true"';
			$player_shortcode .= ' hide_control_under="true"';
			$player_shortcode .= ' show_skip_bt="false"';
			$player_shortcode .= ' show_shuffle_bt="false"';
			$player_shortcode .= ' show_repeat_bt="false"';
			$player_shortcode .= ' show_speed_bt="false"';
			$player_shortcode .= ' show_volume_bt="false"';
			$player_shortcode .= ( Sonaar_Music::get_option('use_sticky_cpt', 'srmp3_settings_sticky_player') === 'true') ? ' sticky_player="true"': ' sticky_player="false"';
			$player_shortcode .= ' player_layout="skin_float_tracklist"';
			$player_shortcode .= ' notrackskip="true"';
			$player_shortcode .= ' player_metas="hide"';
			$player_shortcode .= ' inline="true"';
			$player_shortcode .= ' id="popup_player"';
			
			// Add custom CSS styles
			$player_shortcode .= ' css=":not(.sonaar-no-artwork) .srp_player_grid{grid-template-columns:145px 1fr;}.album-art{width:145px;max-width:145px;}.srp_player_boxed .sonaar-Artwort-box{min-width:145px;}.iron-audioplayer .sonaar-Artwort-box .control .play{width:50px;height:50px;}.iron-audioplayer .sonaar-Artwort-box .control .play .sricon-play, .iron-audioplayer .sr_track_cover .srp_play .sricon-play, .iron-audioplayer .srp_swiper-control .srp_play .sricon-play{font-size:15px;}.iron-audioplayer .album-player{padding:0px;}"';
			
			// Close the shortcode
			$player_shortcode .= ']';
			
			// Add the closing shortcode tag
			$player_shortcode .= '[/sonaar_audioplayer]';
		}else{
			$player_shortcode = '[sonaar_audioplayer';
			$player_shortcode .= ' player_layout="skin_button"';
			$player_shortcode .= ' use_play_label_with_icon="true"';
			$player_shortcode .= ' albums="' . $product_id . '"';
			$player_shortcode .= ( Sonaar_Music::get_option('use_sticky_cpt', 'srmp3_settings_sticky_player') === 'true') ? ' sticky_player="true"': ' sticky_player="false"';
			$player_shortcode .= ' notrackskip="true"';
			$player_shortcode .= ' inline="true"';
			$player_shortcode .= ' id="popup_player"';
			
			// Add custom CSS styles
			$player_shortcode .= ' css=":not(.sonaar-no-artwork) .srp_player_grid{grid-template-columns:145px 1fr;}.album-art{width:145px;max-width:145px;}.srp_player_boxed .sonaar-Artwort-box{min-width:145px;}.iron-audioplayer .sonaar-Artwort-box .control .play{width:40px;height:40px;}.iron-audioplayer .sonaar-Artwort-box .control .play .sricon-play, .iron-audioplayer .sr_track_cover .srp_play .sricon-play, .iron-audioplayer .srp_swiper-control .srp_play .sricon-play{font-size:15px;}.iron-audioplayer .album-player{padding:0px;}"';
			
			// Close the shortcode
			$player_shortcode .= ']';
			
			// Add the closing shortcode tag
			$player_shortcode .= '[/sonaar_audioplayer]';
		}
		// Replace the image with the shortcode
		return do_shortcode($player_shortcode);
	}
	
	public static function load_wc_variation_by_ajax_callback() {
		check_ajax_referer('sonaar_music_ajax_nonce', 'nonce');
		$variantList = [];
		if (!isset($_POST['product-id']) ) {
			wp_send_json_error('Invalid product ID');
		}
		$product = wc_get_product($_POST['product-id']);
		$product_title = $product->get_title();

		$image_src = isset($_POST['image_src']) ? esc_url($_POST['image_src']) : '';
		$image_element = $image_src ? '<div class="srp-modal-image"><img class="srp-share-img" src="' . $image_src . '" alt="' . $product_title . '"></div>' : '';
		$image_element = apply_filters('srmp3_replace_image_with_shortcode', $image_element, $_POST['product-id']);
		$has_image = !empty($image_src);

		$wc_ajaxClass = (Sonaar_Music::get_option('wc_enable_ajax_addtocart', 'srmp3_settings_woocommerce') == 'true') ? ' ajax_add_to_cart' : '';

		if ($product->is_type( 'variable' )){
			$variations = $product->get_available_variations();
			$variations_id = wp_list_pluck( $variations, 'variation_id' ); 
				
			if( count($variations_id) > 0){
				$variantDefaultIndex = 0;			
				$attributes = array_keys($product->get_variation_attributes());
				$attributes = array_map(function($value) { return ucfirst(str_replace('pa_', '', $value)); }, $attributes);
				$attributes = implode(', ', $attributes);
				$defaultVariation =($product->get_default_attributes() == [])? [] : array_filter( $product->get_default_attributes() ) ;
				$mapo_label = (Sonaar_Music::get_option('makeanoffer_button_label', 'srmp3_settings_woocommerce')) ? Sonaar_Music::get_option('makeanoffer_button_label', 'srmp3_settings_woocommerce') : esc_html__('Make an Offer', 'sonaar-music');

				foreach ($variations_id  as $i=>$variant_id) {
					$variationList = SRMP3_WooCommerce::srp_get_productAttibuteTerm_arg_from_productVariantionId( $variant_id, 'name' );
					$make_offer_enabled = self::is_make_offer_enabled($variant_id);

					$variantList[$i] = array(
						'variantId'  => $variant_id,
						'variantName'  => implode(" / ", $variationList),
						'variantDefault'  => (implode(' ', $defaultVariation) == implode(' ', $variationList) || ( count($defaultVariation) == 0 && $i == 0 ) )? true : false, //If is the default variation
						'variantDescription' => wc_get_product($variant_id)->get_description(),
						'variantPrice' => wc_price(wc_get_product($variant_id)->get_price()),
						'variantRegPrice' => wc_price(wc_get_product($variant_id)->get_regular_price()),
						'variantSalePrice' => wc_get_product($variant_id)->get_sale_price(),
						'variantFileTypes' => SRMP3_WooCommerce::srp_get_variantFileTypes_from_variationID($variant_id),
						'variantTerm' => get_post_meta( $variant_id, 'custom_field', true ),
						'extraClass' => '',
						'makeOffer' => $make_offer_enabled,
						'hidePrice' => get_post_meta( $variant_id, '_make_offer_hide_price', true )
					);
					if(implode(' ', $defaultVariation) == implode(' ', $variationList) ){
						$variantDefaultIndex = $i;
					}
				}
				$variantList[$variantDefaultIndex]['extraClass'] = 'srp_selected';
				$response = '<div class="srp-modal-product-variation srp-modal-medium-size" data-product_id="' . $_POST['product-id'] . '">';
				$response .= 	'<div class="srp-modal-product-variation-trackinfo-container">
									' . $image_element . '
									<div class="srp-modal-title">' . $product_title . '</div>
								</div>';
				$response .= ($product->get_short_description() != '')?'<div class="srp-modal-product-desc">' . $product->get_short_description() . '</div>':'';
				$response .= '<div class="srp-modal-subtitle">' . $attributes . '</div>';
				$response .= '<div class="srp-modal-variation-list">';
				foreach ($variantList  as $i=>$variant) {
					$selectedClass = ($variant['variantDefault'])? 'srp_selected':'';
					$response .= '<div class="srp-modal-variant-selector ' . $selectedClass . '" onclick="srp_selectVariation(this)" data-variant_id="' . $variant['variantId'] . '" data-make_offer_enabled="' . $variant['makeOffer'] . '" data-make_offer_hide_addtocart="' . $variant['hidePrice'] .'">';
					$response .= '<div class="srp-modal-variant-name">' . $variant['variantName'] . '</div>';
					if ($variant['makeOffer'] === 'yes' && $variant['hidePrice'] === 'yes') {
						// If the variation is set to "Make an Offer," display the label instead of the price
						$response .= '<div class="srp-modal-variant-price">' . esc_html($mapo_label) .'</div>';
					} else {
						// Otherwise, display the regular price
						$response .= '<div class="srp-modal-variant-price">';
						$response .= ($variant['variantSalePrice'] != '') ? '<span class="srp_reg_price">' . $variant['variantRegPrice'] . '</span> ' : '';
						$response .= $variant['variantPrice'];
						$response .= '</div>'; // DIV srp-modal-variant-price
					}
					$response .= ( $variant['variantFileTypes'] != '' && Sonaar_Music::get_option('wc_enable_licenses_cpt', 'srmp3_settings_woocommerce') == 'true' )? '<div class="srp-modal-variant-file">' . $variant['variantFileTypes'] . '</div>' : '';
					$response .= ( $variant['variantDescription'] != '' )? '<div class="srp-modal-variant-desc">' . $variant['variantDescription'] . '</div>' : '';
					$response .= '</div>'; //DIV srp-modal-variant-selector
				}
				$response .= '</div>'; //DIV srp-modal-product-variation
				if (Sonaar_Music::get_option('wc_enable_licenses_cpt', 'srmp3_settings_woocommerce') == 'true'){
					foreach ($variantList  as $variant) { 
						$response .= '<div class="srp-modal-variation-details ' . $variant['extraClass']. '" data-variant_id="' . $variant['variantId']. '">';
						$response .= SRMP3_WooCommerce::srp_wc_variation_output_all_usageTerms( $variant['variantId'] );
						$response .= '</div>'; //DIV srp-modal-variation-details
					}
				}
				$response .= '<div class="srp-modal-variant-main">';
				
				$custom_link = '';
				if (Sonaar_Music::get_option('wc_enable_custom_link_in_modal', 'srmp3_settings_woocommerce') == 'true'){
					if (Sonaar_Music::get_option('wc_enable_custom_link_is_product', 'srmp3_settings_woocommerce') == 'true'){
						$productID = sanitize_text_field($_POST['product-id']);
						$link = get_permalink($productID);
					}else if(Sonaar_Music::get_option('wc_enable_custom_link_is_custom', 'srmp3_settings_woocommerce') !== ''){
						$link = Sonaar_Music::get_option('wc_enable_custom_link_is_custom', 'srmp3_settings_woocommerce');

					}
					if (Sonaar_Music::get_option('wc_enable_custom_link_icon', 'srmp3_settings_woocommerce')){
						$icon_html = '<i class="' . Sonaar_Music::get_option('wc_enable_custom_link_icon', 'srmp3_settings_woocommerce') . '"></i>';
					}else{
						$icon_html = '';
					}
					$target = Sonaar_Music::get_option('wc_enable_custom_link_target', 'srmp3_settings_woocommerce');
					$label = Sonaar_Music::get_option('wc_enable_custom_link_label', 'srmp3_settings_woocommerce');
					$custom_link = '<div class="srp-modal-custom-link"><a href="' . esc_html($link) .'" target="' . esc_html($target) . '">' . $icon_html . esc_html__( $label ) . '</a></div>';
				}

				// Determine the correct button to show based on the default variation
				$defaultVariant = $variantList[$variantDefaultIndex];

				// Prepare the base components
				$price_visibility = ($defaultVariant['hidePrice'] === 'yes') ? 'display:none;' : '';
				$make_offer_visibility = ($defaultVariant['makeOffer'] === 'yes') ? '' : 'display:none;';
				$add_to_cart_visibility = ($defaultVariant['makeOffer'] === 'yes' && $defaultVariant['hidePrice'] === 'yes') ? 'display:none;' : '';

				// Total price div
				$response .= '<div id="srp-total-price" class="srp-modal-variant-price" style="' . $price_visibility . '">' . esc_html__('Total:', 'sonaar-music-pro') . ' ' . $defaultVariant['variantPrice'] . '</div>';

				// Custom link (if present)
				$response .= $custom_link;

				// Make an Offer button
				$response .= '<a id="make-offer-btn" class="srp_button srp-make-offer-bt alt" style="' . $make_offer_visibility . '" onclick="srp_wc_variation_popup(' . $_POST['product-id'] . ', this, \'' . esc_js($image_src) . '\')"><i class="sricon-cash"></i>' . esc_html($mapo_label) . '</a>';

				// Add to Cart button
				$response .= '<a id="srp-add-to-cart-btn" class="add_to_cart_button srp_button' . $wc_ajaxClass . '" style="' . $add_to_cart_visibility . '" onclick="srp_add_to_cart_loadspinner($(this))" href="?add-to-cart=' . $_POST['product-id'] . '&variation_id=' . $defaultVariant['variantId'] . '" data-quantity="1" data-product_id="' . $defaultVariant['variantId'] . '"><i class="fas fa-cart-plus"></i>' . esc_html__('Add to cart', 'woocommerce') . '</a>';

				$response .= '</div>'; //DIV srp-modal-variant-main
				$response .= '</div>'; //DIV srp-modal-variation-list
			}
		}
		
		wp_send_json_success(['html' => $response, 'has_image' => $has_image], JSON_HEX_TAG);
		wp_die();
	}

	public static function load_make_offer_lightbox_callback() {
		check_ajax_referer('sonaar_music_ajax_nonce', 'nonce');
	
		$form_markup = (Sonaar_Music::get_option('makeanoffer_form', 'srmp3_settings_woocommerce')) ? Sonaar_Music::get_option('makeanoffer_form', 'srmp3_settings_woocommerce') : '';
	
		if (empty($form_markup)) {
			// Fallback form if admin hasn't set a custom form
			$form_markup = '<p>
								<label for="-email">Your Email:</label>
								<input type="email" id="email" name="email" required>
							</p>
							<p>
								<label for="price">Your Offer Price:</label>
								<input type="text" id="price" name="price" required>
							</p>
							<p>
								<label for="message">Your Message:</label>
								<textarea id="message" name="message" rows="4"></textarea>
							</p>
							<p>
								<input type="hidden" id="product-id" name="product_id">
								<button type="submit" class="button alt">Submit Offer</button>
							</p>';
		}
	
		// Replace placeholders with actual values
		$form_title = Sonaar_Music::get_option('makeanoffer_form_title', 'srmp3_settings_woocommerce');
		$form_desc = Sonaar_Music::get_option('makeanoffer_form_desc', 'srmp3_settings_woocommerce');
		$product_id = isset($_POST['product-id']) ? intval($_POST['product-id']) : 0;
		$variation_id = isset($_POST['variation-id']) ? intval($_POST['variation-id']) : 0;
		$product = wc_get_product($product_id);
	
		if (!$product) {
			wp_send_json_error('Invalid product.');
			wp_die();
		}
	
		$product_title = $product->get_title();
		$product_description = $product->get_short_description();
		$image_src = isset($_POST['image_src']) ? esc_url($_POST['image_src']) : '';
		$has_image = !empty($image_src);
	
		$form_markup = str_replace(
			['{product_id}', '{product_title}', '{product_short_description}', '{image_src}'],
			[esc_attr($product_id), esc_html($product_title), wp_kses_post($product_description), esc_url($image_src)],
			$form_markup
		);
		$form_desc = str_replace(
			['{product_id}', '{product_title}', '{product_short_description}', '{image_src}'],
			[esc_attr($product_id), esc_html($product_title), wp_kses_post($product_description), esc_url($image_src)],
			$form_desc
		);
	
		// Initialize response
		$response = '<div class="srp-popup-form srp-popup-form--makeoffer">';
	
		if (!empty($form_title)) {
			$response .= '<h1 class="srp-popup-title">' . esc_html($form_title) . '</h1>';
		}
		if (!empty($form_desc)) {
			$response .= '<div class="srp-popup-desc">' . esc_html($form_desc) . '</div>';
		}
	
		$response .= '<div class="srp-make-offer-heading">';
	
		// Add the product image if available
	
		$image_element = $image_src ?  '<div class="srp-make-offer-image"><img src="' . esc_url($image_src) . '"></div>' : '';
		$image_element = apply_filters('srmp3_replace_image_with_shortcode', $image_element, $product_id);
		$response .= $image_element;
		
	
		// Add product info
		$response .= '<div class="srp-make-offer-product-info">';
		if (!empty($product_title)) {
			$response .= '<div class="srp-make-offer-product-title">' . esc_html($product_title) . '</div>';
		}
		if (!empty($product_description)) {
			$response .= '<div class="srp-make-offer-description">' . wp_kses_post($product_description) . '</div>';
		}
		$response .= '</div>'; // Close product info div
		$response .= '</div>'; // Close heading div
	
		// Check if product is variable
		if ($product->is_type('variable')) {
			$available_variations = $product->get_available_variations();
			$variation_options = '';
		
			// Loop through variations and add to dropdown if `_make_offer_enabled` is set
			foreach ($available_variations as $variation) {
				$current_variation_id = $variation['variation_id'];
				$make_offer_enabled = self::is_make_offer_enabled($current_variation_id);

				if ($make_offer_enabled === 'yes') {
					$variation_obj = wc_get_product($current_variation_id);
		
					// Get the variation attributes dynamically
					$variation_attributes = $variation_obj->get_attributes();
					$variation_name = '';
		
					// Loop through attributes and append them to the variation name (e.g., License)
					foreach ($variation_attributes as $attribute_name => $attribute_value) {
						$variation_name .=  esc_html($attribute_value);
						$variation_name = ucwords($variation_name);

					}
		
					// Check if this variation is the one that should be preselected
					$selected = ($current_variation_id == $variation_id) ? 'selected' : '';
		
					// Add the option with the `selected` attribute if it's the preselected variation
					$variation_options .= '<option value="' . esc_attr($current_variation_id) . '" ' . $selected . '>' . esc_html(trim($variation_name)) . '</option>';
				}
			}
		
			if (!empty($variation_options)) {
				// Add the variation dropdown to the form
				$response .= '<p>
								<label for="offer-variation">' . esc_html__('LICENSE', 'sonaar-music') . '</label>
								<select id="offer-variation" name="offer_variation">
									' . $variation_options . '
								</select>
							  </p>';
			}
		}
	
		$response .= '<div id="srp-make-offer-error" style="color: red; display: none;"></div>';
	
		// Add the form markup
		$response .= '<form id="make-offer-form">' . $form_markup . '</form>';
	
		// Close the response markup
		$response .= '</div>';
		
		wp_send_json_success(['html' => $response, 'has_image' => $has_image], JSON_HEX_TAG);
		wp_die();
	}
		
	public static function srmp3_add_meta_to_order( $order_id, $data ) {
		$order_obj = wc_get_order( $order_id );
		$folder    = "/license-pdfs/";

		foreach ( $order_obj->get_items() as $item_id => $item ) {
			$variation_id = $item->get_variation_id();
			$product = wc_get_product( $variation_id );
			if ( ! $product ) {
				return;
			}
			$attrTermID = SRMP3_WooCommerce::srp_get_productAttibuteTerm_arg_from_productVariantionId( $variation_id, 'term_taxonomy_id' );
			$licenseID = array();
			foreach($attrTermID as $value){
				$licenseID = array_merge($licenseID, SRMP3_WooCommerce::srp_get_license_post_id_from_attribute_term_id($value) );
			
			}
			foreach($licenseID as $value){
				$uploads_dir = wp_get_upload_dir()['baseurl'] . $folder;
				$pdf_link     = "{$uploads_dir}license-agreement-order-{$order_id}-item-{$item_id}.pdf";
				$order_obj->update_meta_data( '_item_'. $item_id . '_srmp3_license_url', $pdf_link );
				$order_obj->update_meta_data( '_has_srmp3_license', 'yes' );
			}
		}
		$order_obj->save();
	}

	/**
	 * undocumented function summary
	 *
	 * Undocumented function long description
	 *
	 * @param Type $var Description
	 * @return type
	 * @throws conditon
	 **/
	public static function email_order_show_license_link( $order_id ) {
		
		/*$option = get_option( 'beats_license_email_setting' );
		if ( isset( $option['show_license_link_order_completed_email']) && $option['show_license_link_order_completed_email'] === 'on' ) {
			$show_link = true;
		} else {
			$show_link = false;
		}*/
		$order_obj = wc_get_order( $order_id );
		$has_license = $order_obj->get_meta( '_has_srmp3_license' );
		if ( 'yes' === $has_license && 'completed' === $order_obj->get_status() ) :
			?>
			<h2><?php esc_html_e( 'License Details', 'sonaar-music-pro' ); ?></h2>
			<?php SRMP3_WooCommerce::srmp3_create_order_licenses_table( $order_obj );
		endif;
	}

	public static function srmp3_add_license_to_order_page( $order_id ) {
		$order_obj = wc_get_order( $order_id );
		$has_license = $order_obj->get_meta( '_has_srmp3_license' );
		if ( 'yes' === $has_license && 'completed' === $order_obj->get_status() ) :
			?>
			<h2><?php esc_html_e( 'License Details', 'sonaar-music-pro' ); ?></h2>
			<?php SRMP3_WooCommerce::srmp3_create_order_licenses_table( $order_obj );
		endif;
	}

	public static function srmp3_create_order_licenses_table( $order_obj ) {
		?>
		<table class="srmp3-order-licenses-table woocommerce-table woocommerce-table--order-details shop_table order_details">
			<thead>
				<tr>
					<th><?php esc_html_e( 'Product', 'woocommerce' ); ?></th>
					<th><?php esc_html_e( 'License PDF Link', 'sonaar-music-pro' ); ?></th>
				</tr>
			</thead>
		<?php
		foreach ( $order_obj->get_items() as $item_id => $item ) :
			$license_link = $order_obj->get_meta( '_item_'. $item_id . '_srmp3_license_url' );
			$product = $item->get_product();
			if ( $license_link ) :
				?>
				<tr>
					<td><?php echo $product->get_name(); ?></td>
					<td>
						<a href="<?php echo esc_url( $license_link ); ?>" download>
							<?php esc_html_e( 'Download License Agreement', 'sonaar-music-pro' ); ?>
						</a>
					</td>
				</tr>
				<?php
			endif;
		endforeach;
		?>
		</table>
		<?php
	}
	public static function srmp3_review_license_before_submit() {
		$no_licenses = true;
		$cart = WC()->cart->get_cart();
		foreach ( $cart as $cart_item_key => $cart_item ) {
			$product = $cart_item['data'];
			$license =  SRMP3_WooCommerce::srmp3_has_usage_license( $cart_item, $cart_item_key );
			
			$cart[$cart_item_key]['has_license']  = false;

			if ( $license ) {
				$cart[$cart_item_key]['has_license'] = true;
				$no_licenses = false;
			}
		}

		if ( $no_licenses ) {
			return;
		}
		?>
		<div class="woocommerce-checkout-review-order e-checkout__order_review">
			<h3>
				<?php esc_html_e('Review Licenses', 'sonaar-music-pro'); ?>
			</h3>
			
			<table class="">
				<thead>
					<tr>
						<th><?php esc_html_e('Product', 'sonaar-music-pro'); ?></th>
						<th><?php esc_html_e('License', 'sonaar-music-pro'); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php
					foreach ( $cart as $cart_item_key => $cart_item ) {
						$product = $cart_item['data'];
						$license =  SRMP3_WooCommerce::srmp3_has_usage_license( $cart_item, $cart_item_key );
						if ( $cart[$cart_item_key]['has_license'] ) {
							?>
							<tr class="cart_item">
								<td class="product_name" style="font-size:14px;"><?php echo $product->get_name(); ?></td>
								<td>
									<?php SRMP3_WooCommerce::srmp3_add_license_button( $cart_item ); ?>
								</td>
							</tr>
							<?php
						}
					}
					?>
				</tbody>
			</table>
		</div>
		<?php
	}
	public static function srmp3_create_pdf_license( $order_id ) {
		$order_obj = wc_get_order( $order_id );
		$folder    = "/license-pdfs/";

		foreach ( $order_obj->get_items() as $item_id => $item ) {
			$product      = $item->get_product();
			$variation_id = $item->get_variation_id();

			$prod = wc_get_product( $variation_id );
			if ( ! $prod ) {
				return;
			}
			
			$attrTermID = SRMP3_WooCommerce::srp_get_productAttibuteTerm_arg_from_productVariantionId( $variation_id, 'term_taxonomy_id' );
			$licenseID = array();
			foreach($attrTermID as $value){
				$licenseID = array_merge($licenseID, SRMP3_WooCommerce::srp_get_license_post_id_from_attribute_term_id($value) );
			
			}
			foreach($licenseID as $value){
				$template = SRMP3_WooCommerce::generateContract($value, $order_obj, $product->name, $variation_id);
				$html2pdf = new Html2Pdf();
				$html2pdf->writeHTML( stripslashes( $template ) );

				$uploads_dir = wp_get_upload_dir()['basedir'] . $folder;
				file_put_contents( $uploads_dir . 'index.php', '<?php // Silence is golden.' );
				if ( ! is_dir( $uploads_dir ) ) {
					mkdir( $uploads_dir, 0755 );

				}
				$path = "{$uploads_dir}license-agreement-order-{$order_id}-item-{$item_id}.pdf";
				$html2pdf->output( $path, 'F');
			}
		}
	}
	public static function sonaar_shortcode_license($atts = [], $content = null) {
		//exemple de shortcode: [sonaar_license post_id="771" column="true" show_preview_button="true"]
		extract(shortcode_atts(array(
			'post_id' => '',
			'column' =>'',
			'show_preview_button' =>'',
		), $atts));
		if($post_id !== ''){
			$post_id = explode(",", $post_id);
		}else{
			// GET ALL LICENSES FROM CURRENT PRODUCT PAGE
			$post_id = [];
			if(get_post_type() == 'product'){
				$product = wc_get_product(get_the_ID());
				if ($product->is_type( 'variable' )){
					$variations = $product->get_available_variations();
					$variations_id = wp_list_pluck( $variations, 'variation_id' ); 
					if( count($variations_id) > 0){
						foreach ($variations_id  as $variant_id) {
							$productVariationTermIDs = SRMP3_WooCommerce::srp_get_productAttibuteTerm_arg_from_productVariantionId( $variant_id, 'term_taxonomy_id' );
							foreach ( $productVariationTermIDs  as $value) { //Each product attribute term select to the variation
								$post_id = array_merge($post_id, SRMP3_WooCommerce::srp_get_license_post_id_from_attribute_term_id($value));
							}
						}
					}
				}
			}
		}

		$column_class = ($column ==='true') ? ' srp_variant_terms--column' : '';
		//$show_preview_button = 'true';

		$output = '<div class="srp_variant_terms_container' . $column_class . '">';
		foreach($post_id as $value){
			if($post_id != '' && (int)$post_id ){

				$output .= SRMP3_WooCommerce::srp_wc_variation_output_usageTerms( $value, $show_preview_button);
			}
		}
		$output .= '</div>'; // END srp_variant_terms_container

		return $output;
	 }
}
SRMP3_WooCommerce::load();