(function ($) {
	'use strict';

	var srmp3_updateMp3Playlists = function (paged = 1, search = '') {
		var urlParams = new URLSearchParams(window.location.search);
		var queryOrder = urlParams.get('order');
		var queryOrderby = urlParams.get('orderby');
		// Assign values from URL query if present
		var order = (queryOrder != null) ? queryOrder : 'desc';
		var orderby = (queryOrderby != null) ? queryOrderby : 'date';
		 
		var per_page = $('.srmp3-music-lists-per-page option:selected').val();
		console.log(per_page);
		if (per_page == 'all'){
			per_page = -1;
		}
		var postData = {
			action: 'srmp3_update_mp3_playlists',
			paged,
			order,
			orderby,
			search,
			per_page,
			nonce: sonaar_admin_ajax.ajax.ajax_nonce,
		};
		$.ajax({
			url: sonaar_admin_ajax.ajax.ajax_url,
			type: 'post',
			data: postData,
			success: function (result) {
				if (result.success) {
					$('.srmp3-music-lists #track-pagination').html(result.data.paginate_info)
					$('.srmp3-music-lists #srmp3_music_tracks').html(result.data.music_playlists)
				}
			},
		})


	}
	jQuery(document).ready(function () {
		eraseSonaarCookie();
		init_exportAskForEmail();
	  
		/*
		*
		FOR IMPORT FILE
		*
		*/

		if ($("#mp3-posttype-selection_for_import_file").val() == 'product') {
			$('#srmp3_tool_importfile .srmp3_option--producttype').show();
		} else {
			$('#srmp3_tool_importfile .srmp3_option--producttype').hide();
			$('#srmp3_tool_importfile .srmp3_option--productattribute').hide();
			$('#srmp3_tool_importfile .srmp3_option--defaultprice').hide();
		}

		$(document).on('change', '#mp3-posttype-selection_for_import_file', function (e) {
			// post type dropdown
			$('#srmp3_tool_importfile .srmp3_option--producttype').hide();
			$('#srmp3_tool_importfile .srmp3_option--productattribute').hide();
			$('#srmp3_tool_importfile .srmp3_option--defaultprice').hide();
			if ($(this).val() == 'product') {
				$('#srmp3_tool_importfile .srmp3_option--producttype').show();
				$('#srmp3_tool_importfile .srmp3_option--defaultprice').show();

				if ($('#srmp3_woocommerce_product_type_from_import_file').val() == 'variable') {
					$('#srmp3_tool_importfile .srmp3_option--productattribute').show();
				}
			}
		});

		$(document).on('change', '#srmp3_woocommerce_product_type_from_import_file', function (e) {
			// variable vs simple dropdown
			$('#srmp3_tool_importfile .srmp3_option--productattribute').hide();
			if ($(this).val() == 'variable') {
				$('#srmp3_tool_importfile .srmp3_option--productattribute').show();
			}
		});

		$('#csv_file, #mp3-posttype-selection_for_import_file').on('change', function() {
			var csvFile = document.getElementById('csv_file').files.length > 0;
			var postType = $('#mp3-posttype-selection_for_import_file').val();
			if (csvFile && postType) {
				$('.srmp3_csv_button').removeAttr('disabled');
			} else {
				$('.srmp3_csv_button').attr('disabled', 'disabled');
			}
		});

		/*
		*
		FOR IMPORT MEDIA
		*
		*/
		$('#sort-date').on('click', function(e) {
			e.preventDefault();
		  
			// Modify the URL with orderby and order parameters
			var url = window.location.href;
			var urlParams = new URLSearchParams(window.location.search);
			var currentOrder = urlParams.get('order');
			var newOrder = (currentOrder === 'asc') ? 'desc' : 'asc';
		  
			url = updateQueryStringParameter(url, 'orderby', 'date');
			url = updateQueryStringParameter(url, 'order', newOrder);
		  
			// Navigate to the updated URL
			window.location.href = url;
		  });
		$('#sort-alphabetically').on('click', function(e) {
			e.preventDefault();
		  
			// Modify the URL with orderby and order parameters
			var url = window.location.href;
			var urlParams = new URLSearchParams(window.location.search);
			var currentOrder = urlParams.get('order');
			var newOrder = (currentOrder === 'asc') ? 'desc' : 'asc';
		  
			url = updateQueryStringParameter(url, 'orderby', 'title');
			url = updateQueryStringParameter(url, 'order', newOrder);
		  
			// Navigate to the updated URL
			window.location.href = url;
		  });
		  
		  // Function to update or add a query string parameter in a URL
		  function updateQueryStringParameter(url, key, value) {
			var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
			var separator = url.indexOf('?') !== -1 ? "&" : "?";
			
			if (url.match(re)) {
			  return url.replace(re, '$1' + key + "=" + value + '$2');
			} else {
			  return url + separator + key + "=" + value;
			}
		  }
		if ($("#mp3-posttype-selection").val() == 'product') {
			$('#srmp3_tool_importmedia .srmp3_option--producttype').show();
		} else {
			$('#srmp3_tool_importmedia .srmp3_option--producttype').hide();
			$('#srmp3_tool_importmedia .srmp3_option--productattribute').hide();
			$('#srmp3_tool_importmedia .srmp3_option--wcdownloadfile').hide();
			$('#srmp3_tool_importmedia .srmp3_option--defaultprice').hide();
		}

		$(document).on('change', '#mp3-posttype-selection', function (e) {
			// post type dropdown
			$('#srmp3_tool_importmedia .srmp3_option--producttype').hide();
			$('#srmp3_tool_importmedia .srmp3_option--productattribute').hide();
			$('#srmp3_tool_importmedia .srmp3_option--wcdownloadfile').hide();
			$('#srmp3_tool_importmedia .srmp3_option--defaultprice').hide();
			if ($(this).val() == 'product') {
				$('#srmp3_tool_importmedia .srmp3_option--producttype').show();
				$('#srmp3_tool_importmedia .srmp3_option--wcdownloadfile').show();
				$('#srmp3_tool_importmedia .srmp3_option--defaultprice').show();

				if ($('#srmp3_woocommerce_product_type_from_import_media').val() == 'variable') {
					$('#srmp3_tool_importmedia .srmp3_option--productattribute').show();
				}
			}
		});

		$(document).on('change', '#srmp3_woocommerce_product_type_from_import_media', function (e) {
			// variable vs simple dropdown
			$('#srmp3_tool_importmedia .srmp3_option--productattribute').hide();
			if ($(this).val() == 'variable') {
				$('#srmp3_tool_importmedia .srmp3_option--productattribute').show();
			}
		});

		$(document).on('click', '#srmp3_music_tracks input[type="checkbox"]', function () {
			var select = false;
			$('#srmp3_music_tracks input[type="checkbox"]').each(function (index) {
				if ($(this).prop('checked') === true) {
					select = true;
				}

			});
			if (select === true) {
				$('.srmp3_create_mp3_playlists, .srmp3_create_single_mp3_playlists').removeAttr('disabled');
			} else {
				$('.srmp3_create_mp3_playlists, .srmp3_create_single_mp3_playlists').attr('disabled', 'disabled');
			}
		});
		$(document).on('click', '.srmp3_toggle_selection', function (e) {
			e.preventDefault();
			var select = $(this).data('mode') == 'select';
			$('#srmp3_music_tracks input:enabled').each(function (i, e) {
				$(e).prop('checked', select);
			});
			if (select === true) {
				$('.srmp3_create_mp3_playlists, .srmp3_create_single_mp3_playlists').removeAttr('disabled');
			} else {
				$('.srmp3_create_mp3_playlists, .srmp3_create_single_mp3_playlists').attr('disabled', 'disabled');
			}
		})

		$(document).on('keyup keypress', '.srmp3-music-lists .search-box #track-search-input', function (e) {

			if (e.keyCode === 13) {
				e.preventDefault();
				srmp3_updateMp3Playlists(1, e.target.value)
			}

		})
		$(document).on('click', '#track-pagination .tablenav-pages .pagination-links a', function (e) {
			e.preventDefault();
			var paged = 1
			var page = e.currentTarget.href.match(/paged=(\d+)/)
			if (page && page[1]) {
				paged = page[1]
			}

			srmp3_updateMp3Playlists(paged)
		})

		$(document).on('keyup keypress', '#track-pagination #current-page-selector', function (e) {
			if (e.keyCode === 13) {
				e.preventDefault();
				srmp3_updateMp3Playlists(e.target.value)
			}
		})

		$(document).on('click', '.srmp3_create_mp3_playlists', function (e) {
			/*  Create SEVERAL posts */
			e.preventDefault();

			if ($('#mp3-posttype-selection').val() == '') {
				$('html, body').animate({
					scrollTop: $("#srmp3-post-type-selection").offset().top - 50
				}, 1000);
				return false;
			}
			var type = 'tracks';
			var index = 0,
				itemsCount = $('#srmp3_music_tracks input:checked').length,
				progress = $('.srmp3_products_progress_tracks');
			var post_type = $('#mp3-posttype-selection').val();
			progress.val(index).prop('max', itemsCount).show();
			$('#srmp3_music_tracks input:checked').each(function (i, e) {
				var postData = {
					action: 'srmp3_create_mp3_playlists',
					post_type: $('#mp3-posttype-selection').val(),
					product_type: $('#srmp3_woocommerce_product_type_from_import_media').val(),
					product_download: $('#srmp3_woocommerce_wcdownloadfile_from_import_media').val(),
					id: $(e).val(),
					price: $('#srmp3_woocommerce_price_tracks_from_import_media').val(),
					tracks: $(e).data('tracks'),
					title: $(e).data('title'),
					taxonomy: $('#srmp3_woocommerce_product_attribute_from_import_media').val(),
					nonce: sonaar_admin_ajax.ajax.ajax_nonce,
				}

				$.ajax({
					url: sonaar_admin_ajax.ajax.ajax_url,
					type: 'post',
					data: postData,
					success: function (data) {
					},
				})
					.then(result => {
						index++;
						progress.val(index);
						$(e).prop('checked', false).prop('disabled', true).next().toggleClass('disabled', true);
						if (index == itemsCount) {
							progress.parent().append($('<div>', { class: 'notice updated is-dismissible' }).html($('<p>').html(itemsCount + ' ' + post_type + ' drafts successfully created')));
						}
					})
			})
		});

		
		$(document).on('click', '.srmp3_create_single_mp3_playlists', function (e) {
			/*  Create ONE post only with multiple track*/
			e.preventDefault();

			if ($('#mp3-posttype-selection').val() == '') {
				$('html, body').animate({
					scrollTop: $("#srmp3-post-type-selection").offset().top - 50
				}, 1000);
				return false;
			}
			var mp3_lists_id = [];
			var type = 'tracks';
			var index = 0,
				itemsCount = 1,
				progress = $('.srmp3_products_progress_tracks');
			var post_type = $('#mp3-posttype-selection').val();
			progress.val(index).prop('max', itemsCount).show();

			$('#srmp3_music_tracks input:checked').each(function (i, e) {
				mp3_lists_id.push($(e).val());
			});

			var postData = {
				action: 'srmp3_create_single_mp3_playlists',
				post_type: $('#mp3-posttype-selection').val(),
				product_type: $('#srmp3_woocommerce_product_type_from_import_media').val(),
				product_download: $('#srmp3_woocommerce_wcdownloadfile_from_import_media').val(),
				mp3_id: JSON.stringify(mp3_lists_id),
				price: $('#srmp3_woocommerce_price_tracks_from_import_media').val(),
				taxonomy: $('#srmp3_woocommerce_product_attribute_from_import_media').val(),
				nonce: sonaar_admin_ajax.ajax.ajax_nonce,
			}

			$.ajax({
				url: sonaar_admin_ajax.ajax.ajax_url,
				type: 'post',
				data: postData,
				success: function (data) {
				},
			})
				.then(result => {
					index++;
					progress.val(index);
					$(e).prop('checked', false).prop('disabled', true).next().toggleClass('disabled', true);
					if (index == itemsCount) {
						progress.parent().append($('<div>', { class: 'notice updated is-dismissible' }).html($('<p>').html(itemsCount + ' ' + post_type + ' draft successfully created')));
					}
				})

		});

		/*  Create Single MP3 Play Lists with multiple track*/
		$(document).on('click', '.srmp3_create_single_mp3_playlists_from_import_file', function (e) {
			e.preventDefault();
			const csvFileURL = document.getElementById('csv_file').files[0];
			var post_type = $('#mp3-posttype-selection_for_import_file').val(); 
			var multiple = $('#mp3-importmultiple-selection_for_import_file').val(); 
			 // Get the data-multiple attribute value
			if (!csvFileURL || post_type == '') {
				return;
			}
			var form_data = new FormData();
			form_data.append('action', 'srmp3_create_single_mp3_playlists_from_import_file');
			form_data.append('nonce',	sonaar_admin_ajax.ajax.ajax_nonce);
			form_data.append('file', csvFileURL);
			form_data.append('post_type', post_type);
			form_data.append('product_type', $('#srmp3_woocommerce_product_type_from_import_file').val());
			form_data.append('price', $('#srmp3_woocommerce_price_tracks_from_import_file').val());
			form_data.append('taxonomy', $('#srmp3_woocommerce_product_attribute_from_import_file').val());
			form_data.append('multiple', multiple);
			
			$.ajax({
				contentType: false,
				processData: false,
				url: sonaar_admin_ajax.ajax.ajax_url,
				type: 'post',
				data: form_data,
				beforeSend: function() {
					$('#message').html('Uploading CSV file...');
				},
				success: function(data) {
					console.log(data.playlists);
					//var message = JSON.stringify(data.message, null, 2);
					//$('#message').html(message);
					$('.srmp3_importfile_notice').remove();
					//$('#message').parent().append($('<div>', { class: 'srmp3_importfile_notice notice updated is-dismissible' }).html($('<p>').html(data.itemsCount + ' playlist drafts created')));
					var post_type_url = window.location.origin + "/wp-admin/edit.php?post_type=" + post_type;
					$('#message').parent().append($('<div>', { class: 'srmp3_importfile_notice notice updated is-dismissible' }).html($('<p>').html(data.itemsCount + ' playlist drafts created. <a href="' + post_type_url + '" target="_blank">View them here</a>')));
					$('#message').html(data.message);
					if(data.success){
						$('#message').css('color', 'green');

					}else{
						$('#message').css('color', 'red');
					}
				},
				error: function(data,jqXHR, textStatus, errorThrown) {
					$('#message').html(data['message']);
					$('#message').css('color', 'red');
				}
			})
				

		});


		set_sticky_spectro_field_visibility(); // set field visibility on page load
		$(document).on('change', '#sticky_spectro_style', function (e) {
			set_sticky_spectro_field_visibility();
		});
		
		$(document).on('change', '.srmp3-music-lists-per-page', function (e) {
			if ($(this).val() !== '') {
				var form = $('form.srmp3-music-pagination-form');
				var action = form.attr('action');
		
				// Get the selected value
				var perPage = $(this).val();
		
				// Extract the current query parameters from the URL
				var url = new URL(action);
				var params = new URLSearchParams(url.search);
			
		
				// Set the 'per_page' parameter to the selected value
				params.set('per_page', perPage);
		
				// Create the updated form action URL with the modified query parameters
				var newAction = url.pathname + '?' + params.toString();
				console.log('Updated form action:', newAction); // Add this line
				// Update the form action
				form.attr('action', newAction);
		
				// Submit the form
				form.submit();
			}
		});

		function init_exportAskForEmail(){
			if(!$('#srmp3_export_emails').length) return;
		
			$('#srmp3_export_emails').on('click', function(e) {
				e.preventDefault();
		
				// Get the values from the date inputs
				var startDate = $('#start_date').val();
				var endDate = $('#end_date').val();
		
				$.ajax({
				url: sonaar_admin_ajax.ajax.ajax_url,
				type: 'post',
				dataType: 'json',
				data: {
					action: 'srmp3_export_emails',
					nonce: sonaar_admin_ajax.ajax.ajax_nonce,
					start_date: startDate,  // Include start date
					end_date: endDate       // Include end date
				},
				success: function(response) {
					if (response.success) {
					var link = document.createElement('a');
					link.href = response.data.csv_url;
					link.download = response.data.filename;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					} else {
					alert('Failed to export emails: ' + response.data.message);
					}
				},
				error: function(xhr, textStatus, errorThrown) {
					console.error("Error exporting emails", textStatus, errorThrown);
				}
				});
			});
		}
		
		
		

	});
	function set_sticky_spectro_field_visibility() {
		// set field visibility in CMB2 plugin settings
		if (typeof document.getElementById("sticky_spectro_style") == 'undefined' || document.getElementById("sticky_spectro_style") == null) {
			return;
		}

		var x = document.getElementById("sticky_spectro_style").value;
		if (x == "none") {
			$('.srmp3_spectro_field').addClass('srmp3_hide');
		} else {
			$('.srmp3_spectro_field').removeClass('srmp3_hide');
		}
	}

})(jQuery);
function eraseSonaarCookie() {
	jQuery(document).on('click', 'body.album_page_iron_music_player #submit-cmb, body.sr_playlist_page_iron_music_player #submit-cmb', function () {
		document.cookie = 'sonaar_mp3_player_settings' + '=; Max-Age=-99999999; path=/';
		document.cookie = 'sonaar_mp3_player_time' + '=; Max-Age=-99999999; path=/';
	})
}

function cmb2LinkOption(selectItem) {
	let id = jQuery(selectItem).find('select').attr('id')
	selectorValue = document.getElementById(id).value;
	if (selectorValue == 'popup') {
		jQuery(selectItem).parents('.cmb-repeat-row').find('.store-link, .store-target').hide();
		jQuery(selectItem).parents('.cmb-repeat-row').find('.store-content').show();
	} else {
		jQuery(selectItem).parents('.cmb-repeat-row').find('.store-content').hide();
		jQuery(selectItem).parents('.cmb-repeat-row').find('.store-link, .store-target').show();
	}
}


document.addEventListener('DOMContentLoaded', function () {

	document.querySelectorAll('.post-type-sr_advanced_triggers .cmb-column.srmp3-settings--subitem').forEach(
		el => el.classList.remove('srmp3-settings--subitem')
	);

	if (document.querySelectorAll('.post-type-sr_advanced_triggers #post').length === 0) return;

    const reachedValueEl = document.getElementById('sr_advancedtriggers_reached_value');

	if (!reachedValueEl) return;

    const unitSelect = document.getElementById('sr_advancedtriggers_reached_unit');

    // Create the hint container
    const hintElement = document.createElement('div');
    hintElement.style.marginTop = '5px';
    hintElement.style.color = '#333';
    hintElement.style.display = 'inline-flex';
    hintElement.style.gap = '5px';
    hintElement.style.alignItems = 'center';

    // Create the editable spans for hours, minutes, and seconds
    const hoursSpan = createEditableSpan('00');
    const minutesSpan = createEditableSpan('00');
    const secondsSpan = createEditableSpan('00');

    // Append spans and static elements to the hint container
    hintElement.appendChild(hoursSpan);
    hintElement.appendChild(createStaticSpan('h'));
    hintElement.appendChild(minutesSpan);
    hintElement.appendChild(createStaticSpan('m'));
    hintElement.appendChild(secondsSpan);
    hintElement.appendChild(createStaticSpan('s'));

    reachedValueEl.parentNode.appendChild(hintElement);

    function createEditableSpan(initialValue) {
        const span = document.createElement('span');
        span.contentEditable = true;
        span.textContent = initialValue;

        // Input-like styling
        span.style.border = '1px solid #ccc';
        span.style.borderRadius = '4px';
        span.style.padding = '5px 8px';
        span.style.minWidth = '2ch';
        span.style.textAlign = 'center';
        span.style.display = 'inline-block';
        span.style.outline = 'none';
        span.style.backgroundColor = '#fff';
        span.style.fontFamily = 'Arial, sans-serif';
        span.style.fontSize = '14px';
        span.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.1)';

        span.addEventListener('focus', () => {
            span.style.borderColor = '#66afe9';
            span.style.boxShadow = '0 0 8px rgba(102, 175, 233, 0.6)';
        });

        span.addEventListener('blur', () => {
            span.style.borderColor = '#ccc';
            span.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.1)';
        });

        span.addEventListener('keypress', preventNonNumericInput);
        span.addEventListener('input', handleSpanInput);

        return span;
    }

    function createStaticSpan(text) {
        const span = document.createElement('span');
        span.textContent = text;
        span.style.userSelect = 'none';
        span.style.pointerEvents = 'none';
        span.style.marginLeft = '2px';
        span.style.fontSize = '14px';
        span.style.lineHeight = '1';
        return span;
    }

    function preventNonNumericInput(event) {
        if (!/[0-9]/.test(event.key)) {
            event.preventDefault();
        }
    }

    function handleSpanInput(event) {
        const value = event.target.textContent;
        if (!/^\d{0,2}$/.test(value)) {
            event.target.textContent = value.slice(0, 2);
        }
    }

    function updateHintFromInput() {
        const value = parseInt(reachedValueEl.value, 10);
        const unit = unitSelect.value;

        if (isNaN(value) || value < 0) {
            clearHint();
            return;
        }

        const totalSeconds = unit === 'seconds' ? value : value * 60;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        hoursSpan.textContent = String(hours).padStart(2, '0');
        minutesSpan.textContent = String(minutes).padStart(2, '0');
        secondsSpan.textContent = String(seconds).padStart(2, '0');
    }

    function updateInputFromHint() {
        const hours = parseInt(hoursSpan.textContent, 10) || 0;
        const minutes = parseInt(minutesSpan.textContent, 10) || 0;
        const seconds = parseInt(secondsSpan.textContent, 10) || 0;

        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        if (unitSelect.value === 'seconds') {
            reachedValueEl.value = totalSeconds;
        }
    }

    function clearHint() {
        hoursSpan.textContent = '00';
        minutesSpan.textContent = '00';
        secondsSpan.textContent = '00';
    }

    function toggleFieldsVisibility() {
        if (unitSelect.value === 'percent') {
            reachedValueEl.style.display = 'block'; // Show percentage input
            hintElement.style.display = 'none'; // Hide hint fields
        } else {
            reachedValueEl.style.display = 'none'; // Hide percentage input
            hintElement.style.display = 'flex'; // Show hint fields
        }
    }

    // Add event listeners to update the hint and input field
    reachedValueEl.addEventListener('input', updateHintFromInput);
    unitSelect.addEventListener('change', () => {
        toggleFieldsVisibility(); // Toggle visibility on unit change
        updateHintFromInput();
    });
    hoursSpan.addEventListener('blur', updateInputFromHint);
    minutesSpan.addEventListener('blur', updateInputFromHint);
    secondsSpan.addEventListener('blur', updateInputFromHint);

    // Initial setup on page load
    toggleFieldsVisibility(); // Ensure correct visibility on load
    updateHintFromInput();
});


jQuery(document).ready(function($) {
	$('.sr-advanced-trigger-editscreen-enable-toggle').on('change', function() {
		const post_id = $(this).data('post_id');
		const enable = $(this).is(':checked');
		$.ajax({
			url: sonaar_admin_ajax.ajax.ajax_url,
			method: 'POST',
			data: {
				action: 'toggle_post_status',
				nonce: sonaar_admin_ajax.ajax.ajax_nonce,
				post_id: post_id,
				enable: (enable) ? 'true' : 'false'
			},
			success: function(response) {
				if (response.success) {
					console.log(response.data.message);
				}
			}
		});
	});
});

document.addEventListener('DOMContentLoaded', function() {

    if (!document.querySelector('.post-type-sr_advanced_triggers')) {
        return;
    }

    function wrapRowsInParent() {
        const rows = Array.from(document.querySelectorAll('.cmb-row'));
        let parentContainer;

        rows.forEach((row) => {
            if (row.classList.contains('cmb-type-title')) {
                // Create a new parent div for each title row
                parentContainer = document.createElement('div');
                parentContainer.classList.add('cmb-row-parent');
                row.parentNode.insertBefore(parentContainer, row);
            }
            // Append current row to the latest parent container
            if (parentContainer) {
                parentContainer.appendChild(row);
            }
        });
    }

    function updateConditionalVisibility() {
        const titleRows = document.querySelectorAll('.cmb-row.cmb-type-title');
        
        titleRows.forEach((titleRow) => {
            let hasVisibleChild = false;
            let nextSibling = titleRow.nextElementSibling;
            
            while (nextSibling && !nextSibling.classList.contains('cmb-type-title')) {
                if (nextSibling.style.display !== 'none') {
                    hasVisibleChild = true;
                }
                nextSibling = nextSibling.nextElementSibling;
            }

            titleRow.style.display = hasVisibleChild ? '' : 'none';
			 // Set the parent container's visibility based on the title row's visibility
			 const parentContainer = titleRow.closest('.cmb-row-parent');
			 if (parentContainer) {
				 parentContainer.style.display = hasVisibleChild ? '' : 'none';
			 }
        });

        document.querySelector('.post-type-sr_advanced_triggers').style.display = 'block';
    }

    wrapRowsInParent();
    updateConditionalVisibility();

    const observer = new MutationObserver(updateConditionalVisibility);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] });
});