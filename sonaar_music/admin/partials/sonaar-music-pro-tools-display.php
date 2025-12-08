<!--
==================================================
 IMPORT FROM CSV FILE
==================================================
-->
<div id="srmp3_tool_importfile" class="wrap cmb2-options-page option-iron_music_player">
	<h2 class="screen-reader-text"></h2>
	<div class="cmb2-wrap form-table">
		<div id="cmb2-metabox-sonaar_music_network_option_metabox" class="cmb2-metabox cmb-field-list">
			<div class="cmb-row cmb-type-title" data-fieldtype="title">
				
				<div class="cmb-td">
					<h3 class="cmb2-metabox-title" data-hash="6qnoam2d0qs0"><?php esc_html_e( 'Import From CSV File', 'sonaar-music-pro');?></h3>
				</div>
				
			</div>
			<div class="cmb-row cmb-type-multicheck cmb2-id-srmp3-posttypes">
				<div>
					<p><?php
					
					esc_html_e( 'Create Single or multiple posts and import audio based on a CSV File.', 'sonaar-music-pro');
					echo sprintf( esc_html__(' Example of CSV File format %1s.', 'sonaar-music-pro'), '<a href="' . plugin_dir_url(SRMP3_DIR_PATH. 'sonaar-music.php') . 'templates/example_of_csv_file_to_import.csv' . '" target="_blank">' . esc_html__('here', 'sonaar-music-pro') . '</a>');
					
					?></p>
				</div>
				<div  class="srmp3-music-lists">
					<div id="srmp3_import_file_form" class="">
						<form method="post" action="<?php echo admin_url('edit.php?post_type=' . SR_PLAYLIST_CPT .'&page=sonaar_music_pro_tools');?>" enctype="multipart/form-data" class="srmp3-music-lists-form">
							<label for="csv_file">Upload a CSV file:</label>
							<input type="file" name="csv_file" id="csv_file">
						</form>
					</div>
					<br>
					<div id="srmp3-post-type-selection" class="srmp3-post-type-selection">
						<div class="srmp3_importfile_option_main_wrapper">
							<div class="srmp3_importfile_option_wrapper srmp3_option--importmultiple">
								<select id="mp3-importmultiple-selection_for_import_file" name="mp3-importmultiple-selection_for_import_file" >
									
									<option value="true">Create multiple posts for each audio</option>		
									<option value="false">Create 1 post for all your audio</option>							
								</select>

							</div>
							<div class="srmp3_importfile_option_wrapper srmp3_option--posttype">
								<select id="mp3-posttype-selection_for_import_file" name="mp3-posttype-selection_for_import_file" >
									
									<option value=""><?php esc_html_e( 'Select Post Type', 'sonaar-music-pro' );?></option>
									
									<?php foreach( Sonaar_Music_Admin::get_the_cpt() as $key=>$value):?>							
										<option value="<?php echo esc_attr($key);?>"><?php echo esc_html($value);?></option>							
									<?php endforeach;?>
								</select>
								<p>* If your post type is not listed, make sure it's enabled it in MP3 Player > Settings</p>
							</div>
							<?php if ( is_plugin_active( 'woocommerce/woocommerce.php') ) :?>
								<div class="srmp3_importfile_option_wrapper srmp3_option--producttype" style="display:none">
									<select id="srmp3_woocommerce_product_type_from_import_file" name="">
										<option name="srmp3_woocommerce_product_type_simple" value="simple" selected><?php esc_html_e( 'Simple Product', 'sonaar-music-pro' ); ?></option>
										<option name="srmp3_woocommerce_product_type_variable" value="variable"><?php esc_html_e( 'Variable Product', 'sonaar-music-pro' ); ?></option>
									</select>
								</div>
								<div class="srmp3_importfile_option_wrapper srmp3_option--productattribute" style="display:none">
									<select id="srmp3_woocommerce_product_attribute_from_import_file" name="srmp3_woocommerce_product_attribute_from_import_file">
										<option value="" selected disabled><?php esc_html_e( 'Select Product Attribute (eg: License)', 'sonaar-music-pro' );?></option>
										<?php
										$attributes = wc_get_attribute_taxonomies();
										foreach ( $attributes as $attribute ) :
											$taxonomy = wc_attribute_taxonomy_name( $attribute->attribute_name );
										?>
										<option value="<?php echo esc_attr( $taxonomy ); ?>"><?php echo esc_html( $attribute->attribute_label ); ?></option>
										<?php endforeach; ?>
									</select>
									<p>* This will automatically create variations for your products. Make sure attribute and license terms are set in WP-Admin > Product > Attributes.</p>
								</div>
								<div class="srmp3_importfile_option_wrapper srmp3_option--defaultprice" style="display:none">
									<span class="srmp3_woocommerce_product_price_from_import_file">
										<?php
										echo ' ' . esc_html(get_woocommerce_currency_symbol());
										?>
										<input type="text" id="srmp3_woocommerce_price_tracks_from_import_file" name="srmp3_woocommerce_price_tracks_from_import_file" value="9.99">
									</span>
									<p>* Set a default price for your product.<br>If you are creating a variable product, edit your default price in Product > Attributes > Terms. If no price is set, we will use this field as the default price.</p>

								</div>
							<?php endif;?>
						</div>
						
					</div>					
					<p>
						<a data-multiple="false" class="button button-primary srmp3_csv_button srmp3_create_single_mp3_playlists_from_import_file" disabled ><?php esc_html_e( 'Import & Create Post(s)', 'sonaar-music-pro' ); ?></a>
						<div id="message"></div>
						<p>
					<p><progress class="srmp3_progress"></progress></p>
				</div>
			</div>
		</div>
		
		
	</div>
</div>























<!--
==================================================
 BATCH CREATION TOOL
==================================================
-->
<div id="srmp3_tool_importmedia" class="wrap cmb2-options-page option-iron_music_player">
	<h2 class="screen-reader-text"></h2>
	<div class="cmb2-wrap form-table">
		<div id="cmb2-metabox-sonaar_music_network_option_metabox" class="cmb2-metabox cmb-field-list">
			<div class="cmb-row cmb-type-title" data-fieldtype="title">

				<div class="cmb-td">
					<h3 class="cmb2-metabox-title" data-hash="6qnoam2d0qs0"><?php esc_html_e( 'Batch Creation Tool', 'sonaar-music-pro');?></h3>
				</div>
				
			</div>
			<div class="cmb-row cmb-type-multicheck cmb2-id-srmp3-posttypes">
				<div>
					
					<p><?php esc_html_e( 'Use this tool to quickly add playlist into new post in 1-click! You can either create multiple posts with 1 track each, or create 1 post with multiple tracks. ', 'sonaar-music-pro'); ?></p>
					<p><?php esc_html_e( 'Files below are the ones found in your media library. You can review and publish the draft(s) in bulk once they have been created', 'sonaar-music-pro'); ?></p>
					<p><?php esc_html_e( '* If tracks have been already used into your posts, they will appear in gray below', 'sonaar-music-pro'); ?></p>
				</div>
				<?php
				
				$per_page = isset( $_GET['per_page'] ) ? $_GET['per_page'] : 20;
				$paged    = isset( $_GET['paged'] ) ? $_GET['paged'] : 1;
				$search   = isset( $_GET['search'] ) ? $_GET['search'] : '';
				$orderby = isset( $_GET['orderby'] ) ? $_GET['orderby'] : 'date';
				$order    = isset( $_GET['order'] ) ? $_GET['order'] : 'desc';
				
				if ( $per_page == 'all') {
					$per_page = -1;
				}
				
				$plugin_admin 		= new Sonaar_Music_Pro_Admin( 'sonaar-music-pro', SRMP3PRO_VERSION );
				$result             = $plugin_admin->sonaar_music_pro_inputs($per_page, $paged, $order, $orderby, $search);
				$track_inputs       = $result['track_inputs'];
				$paginate_links     = $result['paginate_links'];
				$found_tracks       = $result['found_tracks'];
				$per_page_lists 	= [20,40,60,80,100, 'All'];
				$per_page = isset( $_GET['per_page'] ) ? $_GET['per_page'] : 20;

				//var_dump($track_inputs);
				
				?>
				<div  class="srmp3-music-lists">
				<button id="sort-alphabetically" class="button"><?php esc_html_e( 'Sort by Name', 'sonaar-music-pro' ); ?></button>
				<button id="sort-date" class="button"><?php esc_html_e( 'Sort by Date', 'sonaar-music-pro' ); ?></button>

					<div class="tablenav top">
						<p class="search-box">
							<label class="screen-reader-text" for="post-search-input"><?php esc_html_e( 'Search Post:', 'sonaar-music-pro' );?></label>
							<input type="search" id="track-search-input" name="s" value="" placeholder="Search tracks and hit ENTER...">							
						</p>
						<div>
							<form action="<?php echo admin_url('edit.php?post_type=' . SR_PLAYLIST_CPT .'&page=sonaar_music_pro_tools');?>" method="get" class="srmp3-music-pagination-form">
								<input type="hidden" name="post_type" value="<?php echo SR_PLAYLIST_CPT ?>" />
								<input type="hidden" name="page" value="sonaar_music_pro_tools" />
								 <!-- Add the input fields for 'order' and 'orderby' -->
								<input type="hidden" name="order" value="<?php echo $order; ?>" />
								<input type="hidden" name="orderby" value="<?php echo $orderby; ?>" />
								<label><?php esc_html_e( 'Number of items per page', 'sonaar-music-pro' );?></label>
								<select class="srmp3-music-lists-per-page" name="per_page">
									<option value=""><?php esc_html_e( 'Select per page', 'sonaar-music-pro'); ?></option>
									<?php foreach( $per_page_lists as $value):?>
										<option value="<?php echo strtolower($value);?>" <?php echo selected( strtolower($value), $per_page)?>><?php echo $value;?></option>
									<?php endforeach;?>
								</select>
							</form>
							<div id="track-pagination" class="tablenav">
							
								<?php
								echo $paginate_links;
								?>
							</div>
						</div>
					</div>
					<h2 class="screen-reader-text"><?php esc_html_e('MP3 items list', 'sonaar-music-pro');?></h2>
					<div id="srmp3_music_tracks" class="mp3-music-list">
					<?php
						echo $track_inputs;
					?>
					</div>
					
					<p>
						<a href="#" class="srmp3_toggle_selection" data-type="tracks" data-mode="select"><?php esc_html_e( 'Select all', 'sonaar-music-pro' ); ?></a> | <a href="#" class="srmp3_toggle_selection" data-type="tracks" data-mode="deselect"><?php esc_html_e( 'Deselect all', 'sonaar-music-pro' ); ?></a>
					</p>					
					<br>
					<div id="srmp3-post-type-selection" class="srmp3-post-type-selection">
						<div class="srmp3_importfile_option_main_wrapper">
							<div class="srmp3_importfile_option_wrapper srmp3_option--posttype">
								<select id="mp3-posttype-selection" name="mp3-posttype-selection" >
									
									<option value=""><?php esc_html_e( 'Select Post Type', 'sonaar-music-pro' );?></option>
									
									<?php foreach( Sonaar_Music_Admin::get_the_cpt() as $key=>$value):?>							
										<option value="<?php echo esc_attr($key);?>"><?php echo esc_html($value);?></option>							
									<?php endforeach;?>
								</select>
								<p>* If your post type is not listed, make sure it's enabled it in MP3 Player > Settings</p>
							</div>



							<!-- <?php if ( is_plugin_active( 'woocommerce/woocommerce.php') ) :?>
								<select id="srmp3_woocommerce_product_type" name="srmp3_woocommerce_product_type" style="display:none">
									<option name="srmp3_woocommerce_product_type_simple" value="simple" selected><?php esc_html_e( 'Simple Product', 'sonaar-music-pro' ); ?></option>
									<option name="srmp3_woocommerce_product_type_variable" value="variable"><?php esc_html_e( 'Variable Product', 'sonaar-music-pro' ); ?></option>
								</select>
								<span class="srmp3_woocommerce_product_price" style="display:none">
									<?php esc_html_e( 'Price', 'sonaar-music-pro' ); ?><?php echo esc_html( get_woocommerce_currency_symbol() ); ?><input type="text" id="srmp3_woocommerce_price_tracks" name="srmp3_woocommerce_price_tracks" value="9.99" >
								</span>
							<?php endif;?> -->




							<?php if ( is_plugin_active( 'woocommerce/woocommerce.php') ) :?>
								<div class="srmp3_importfile_option_wrapper srmp3_option--producttype" style="display:none">
									<select id="srmp3_woocommerce_product_type_from_import_media" name="">
										<option name="srmp3_woocommerce_product_type_simple" value="simple" selected><?php esc_html_e( 'Simple Product', 'sonaar-music-pro' ); ?></option>
										<option name="srmp3_woocommerce_product_type_variable" value="variable"><?php esc_html_e( 'Variable Product', 'sonaar-music-pro' ); ?></option>
									</select>
								</div>
								<div class="srmp3_importfile_option_wrapper srmp3_option--productattribute" style="display:none">
									<select id="srmp3_woocommerce_product_attribute_from_import_media" name="srmp3_woocommerce_product_attribute_from_import_media">
										<option value="" selected disabled><?php esc_html_e( 'Select Product Attribute (eg: License)', 'sonaar-music-pro' );?></option>
										<?php
										$attributes = wc_get_attribute_taxonomies();
										foreach ( $attributes as $attribute ) :
											$taxonomy = wc_attribute_taxonomy_name( $attribute->attribute_name );
										?>
										<option value="<?php echo esc_attr( $taxonomy ); ?>"><?php echo esc_html( $attribute->attribute_label ); ?></option>
										<?php endforeach; ?>
									</select>
									<p>* This will automatically create variations for your products. Make sure attribute and license terms are set in WP-Admin > Product > Attributes.</p>
								</div>
								<div class="srmp3_importfile_option_wrapper srmp3_option--wcdownloadfile" style="display:none">
									<select id="srmp3_woocommerce_wcdownloadfile_from_import_media" name="">
										<option name="srmp3_woocommerce_wcdownloadfile_yes" value="yes" selected><?php esc_html_e( 'Set the audio file(s) as the purchased file(s)', 'sonaar-music-pro' ); ?></option>
										<option name="srmp3_woocommerce_wcdownloadfile_no" value="no"><?php esc_html_e( 'I will add the purchased file manually', 'sonaar-music-pro' ); ?></option>
									</select>
									<p>* Set the selected audio files also as the WooCommerce downloadable file.</p>
								</div>
								<div class="srmp3_importfile_option_wrapper srmp3_option--defaultprice" style="display:none">
									<span class="srmp3_woocommerce_product_price_from_import_media">
										<?php
										echo ' ' . esc_html(get_woocommerce_currency_symbol());
										?>
										<input type="text" id="srmp3_woocommerce_price_tracks_from_import_media" name="srmp3_woocommerce_price_tracks_from_import_media" value="9.99">
									</span>
									<p>* Set a default price for your product.<br>If you are creating a variable product, edit your default price in Product > Attributes > Terms. If no price is set, we will use this field as the default price.</p>

								</div>
							<?php endif;?>
						</div>


					</div>					
					<p>
						<a class="button button-primary srmp3_create_mp3_playlists" disabled><?php esc_html_e( 'Create Post(s) for Each Selected Track(s)', 'sonaar-music-pro' ); ?></a>
						<?php esc_html_e( 'Or', 'sonaar-music-pro');?>
						<a class="button button-primary srmp3_create_single_mp3_playlists" disabled ><?php esc_html_e( 'Create One Post With All Selected Tracks', 'sonaar-music-pro' ); ?></a>
					<p>
					<p><progress class="srmp3_progress srmp3_products_progress_tracks" value="0" max="1"></progress></p>
				</div>
			</div>
		</div>
		
		
	</div>
</div>

<style>
	.option-iron_music_player h3{
		font-size:16px!important;
	}
	.mp3-music-list {
		padding: 6px;
		border: 1px solid #8c8f94;
		border-radius: 4px;
		margin-top: 10px;
	}
	.mp3-music-list>div {
		line-height: 1.75rem;
		text-indent: -1.75rem;
		padding-left: 1.75rem;
	}
	.mp3-music-list>div input[type="checkbox"] {
		padding: 10px !important;
		border: 1px solid #9b9d9d;
		background-color: #fff;
		box-shadow: none !important;
	}
	.mp3-music-list>div input[type="checkbox"]:checked {
		background-color: #3692d6;
		border-color: #3692d6;
	}
	.mp3-music-list>div input[type="checkbox"]:checked:before {
		content: url(data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20512%20512%27%3E%3Cpath%20fill%3D%27%23fff%27%20d%3D%27M173.898%20439.404l-166.4-166.4c-9.997-9.997-9.997-26.206%200-36.204l36.203-36.204c9.997-9.998%2026.207-9.998%2036.204%200L192%20312.69%20432.095%2072.596c9.997-9.997%2026.207-9.997%2036.204%200l36.203%2036.204c9.997%209.997%209.997%2026.206%200%2036.204l-294.4%20294.401c-9.998%209.997-26.207%209.997-36.204-.001z%27%3E%3C%2Fpath%3E%3C%2Fsvg%3E);
		width: 16px;
		height: 16px;
		margin: -8px 0 0 -8px;
	}
	progress.srmp3_progress {
		width: 100%;
		display: none;
	}
	.srmp3-music-lists {
		margin-top: 10px;
	}
	.srmp3-music-lists .srmp3-post-type-selection > select {
		margin: 0 10px 0 0;
	}
	.srmp3-music-lists #srmp3_woocommerce_price_tracks {
		margin-left: 4px;
	}
	span.disabled {
		opacity: 0.333;
	}
	.srmp3-music-lists .tablenav.top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
	}
	.srmp3-music-lists input#track-search-input {
		width: 350px;
		font-size: 16px;
		height: 40px;
	}
	.srmp3-music-lists .button {
		padding: 8px 12px;
		font-size: 16px;
	}
	#track-pagination,
	.srmp3-music-lists-form, .srmp3-music-pagination-form{
		display: inline-block;
	}
	.srmp3_importfile_option_main_wrapper {
		display: flex;
		column-gap: 12px;
	}
	.srmp3_importfile_option_wrapper {
    	max-width: 350px;
	}
	.srmp3_importfile_option_wrapper.srmp3_option--posttype {
    	max-width: 230px; 
	}
	#message {
    	font-size: 16px;	
	}
	.srmp3-music-lists-form {
		display: flex;
		flex-direction: column;
		align-items: start;
		justify-content: center;
		background-color: #f2f2f2;
		padding: 20px;
		border-radius: 6px;
	}

	#srmp3_tool_importfile label, #srmp3_tool_importmedia label  {
		font-size: 16px;
		margin-bottom: 10px;
	}

	#srmp3_tool_importfile input[type=file] {
		padding: 10px;
		background-color: #fff;
		border: none;
		box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
		border-radius: 5px;
		font-size: 16px;
		cursor: pointer;
	}

	#srmp3_tool_importfile input[type=file]:hover {
		background-color: #f2f2f2;
	}

	#srmp3_tool_importfile input[type=file]:focus {
		outline: none;
	}
	.srmp3_importfile_option_main_wrapper {
    	background-color: #f2f2f2;
    	padding: 20px;
    	display: flex;
    	column-gap: 12px;
		border-radius: 6px;
	}
	#srmp3_tool_importfile .srmp3_importfile_option_main_wrapper select,
	#srmp3_tool_importfile .srmp3_importfile_option_main_wrapper input {
    	height: 40px;
	}
	#srmp3_tool_importfile .srmp3_importfile_option_main_wrapper input {
    	margin-top: 3px;
	}
</style>
