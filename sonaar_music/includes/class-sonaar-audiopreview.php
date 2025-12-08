<?php
/**
 * SRMP3_AudioPreview Class
 *
 * A class to handle MP3 audio previews in WordPress.
 */
class SRMP3_AudioPreview {
    private static $instance = null;
    private $overwrite;
    private $folder_name;
    private $preview_batch_size;
    private $preview_duration;
    private $fadein_duration;
    private $fadeout_duration;
    private $ad_preroll;
    private $ad_postroll;
    private $uploads_dir;
    private $watermark_file;
    private $watermark_gap;
    private $trimstart;
    private $customFilePrefix;
    private $api_url;

    private $preview_duration_overall;
    private $fadein_duration_overall;
    private $fadeout_duration_overall;
    private $ad_preroll_overall;
    private $ad_postroll_overall;
    private $watermark_file_overall;
    private $watermark_gap_overall;
    private $trimstart_overall;

    /**
     * Constructor
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new SRMP3_AudioPreview();
        }
        return self::$instance;
    }
    private function __construct() {
        // Initialization code here
        $this->api_url = 'https://api.sonaar.io/api.php';
        $this->folder_name = (Sonaar_Music::get_option('preview_folder_name', 'srmp3_settings_audiopreview') != null) ? Sonaar_Music::get_option('preview_folder_name', 'srmp3_settings_audiopreview') : 'audio_preview';
        $this->preview_batch_size = (Sonaar_Music::get_option('preview_batch_size', 'srmp3_settings_audiopreview') != null) ? intval(Sonaar_Music::get_option('preview_batch_size', 'srmp3_settings_audiopreview')) : 1;
        $this->overwrite = Sonaar_Music::get_option('preview_overwrite', 'srmp3_settings_audiopreview');
        $this->preview_duration_overall = Sonaar_Music::get_option('audiopreview_duration', 'srmp3_settings_audiopreview');
        $this->fadein_duration_overall = Sonaar_Music::get_option('fadein_duration', 'srmp3_settings_audiopreview');
        $this->fadeout_duration_overall = Sonaar_Music::get_option('fadeout_duration', 'srmp3_settings_audiopreview');
        $this->ad_preroll_overall = Sonaar_Music::get_option('ad_preroll', 'srmp3_settings_audiopreview');
        $this->ad_postroll_overall = Sonaar_Music::get_option('ad_postroll', 'srmp3_settings_audiopreview');
        $this->watermark_file_overall = Sonaar_Music::get_option('audio_watermark', 'srmp3_settings_audiopreview');
        $this->watermark_gap_overall = (Sonaar_Music::get_option('watermark_spacegap', 'srmp3_settings_audiopreview') != null) ? intval(Sonaar_Music::get_option('watermark_spacegap', 'srmp3_settings_audiopreview')) : '';
        $this->trimstart_overall = Sonaar_Music::get_option('trimstart', 'srmp3_settings_audiopreview');
        
        $this->setup_audio_preview_environment();
       

        add_action('wp_ajax_index_audio_preview', array($this, 'index_audio_preview'));
        add_action('wp_ajax_count_audio_files', array($this, 'count_audio_files'));
        add_action('wp_ajax_remove_audio_files_and_update_posts', array($this, 'remove_audio_files_and_update_posts'));
    }

    private function setup_audio_preview_environment() {
        if (defined('DOING_AJAX') && !DOING_AJAX) {
            return; // Don't execute for AJAX operations
        }

        $folder = '/' . $this->folder_name . '/';
        $this->uploads_dir = wp_get_upload_dir()['basedir'] . $folder;
        
        
        if (!is_dir($this->uploads_dir)) {
            mkdir($this->uploads_dir, 0755);
        }
    }
    public function saveThePageFirst(){
        
        echo json_encode([
            'message' => 'Error! Save this page first.',
            'progress' => 100,
            'error' => true,
            'completed' => true,
            'totalPosts' => 0,
            'processedPosts' => 0
        ]);
        wp_die();
    }
    public function fileNotCreated($message = null){    
        if(empty($message)){
            $message = 'Error! File has not been created';
        }
        echo json_encode([
            'message' => $message,
            'progress' => 100,
            'error' => true,
            'completed' => true,
            'totalPosts' => 1,
            'processedPosts' => 1
        ]);
        wp_die();
    }
   
    
















    public function index_audio_preview() {
        check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');

        // Check if either is null and return if so
        if ($this->preview_duration_overall === null) {
            $this->saveThePageFirst();
        }

        // Arguments to get all products and sr_playlist posts with alb_tracklist meta key.
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : null;
        $index = isset($_POST['index']) ? intval($_POST['index']) : null;
       

        if ($post_id !== null && $index !== null) {
            // Sanitize the fields
            $audioUrl = isset($_POST['audioUrl']) ? esc_url_raw($_POST['audioUrl']) : null;
            $audioTitle = isset($_POST['audioTitle']) ? sanitize_text_field($_POST['audioTitle']) : null;
            $customData = isset($_POST['customData']) ? $_POST['customData'] : null;

            $this->overwrite = 'true';
            
            $file_output = '';

            if (filter_var($audioUrl, FILTER_VALIDATE_URL)) {
                // Parse the URL to get the host
                $parsedUrl = parse_url($audioUrl);
                $isSameDomain = isset($parsedUrl['host']) && $parsedUrl['host'] === $_SERVER['HTTP_HOST'];

                if ($isSameDomain) {
                    // Treat as local file
                    $file_output = $this->trimfile($audioUrl, null, $post_id, $index, null, $customData);
                } else {
                    // Treat as stream
                    $stream_title = isset($audioTitle) ? $audioTitle : $index;
                    $file_output = $this->trimfile($audioUrl, $stream_title, $post_id, $index, null, $customData);
                }
            } else {
                // If it's not a valid URL, treat as a local file. I dont think we enter here very often..or AT ALL.
                $file_output = $this->trimfile($audioUrl, null, $post_id, $index, null, $customData);
            }
            
            if(!$file_output || $file_output == '' || is_array($file_output)){
                if(is_array($file_output) && isset($file_output['message'])){
                    $this->fileNotCreated($file_output['message']);
                }else{
                    $this->fileNotCreated();
                }
            }else{
                $filename = isset($file_output) ? basename($file_output) : '';

                echo json_encode([
                    'progress' => 100,
                    'message' => '[' . $filename .'] generated!',
                    'file_output' => $file_output,
                    'completed' => true,
                    'totalPosts' => 1,
                    'processedPosts' => 1
                ]);
                wp_die();
            }
        }else{
            // BULK PROCESSING
            $limit = $this->preview_batch_size; // Process 250 posts at a time. Adjust this value based on your needs.
            $offset = isset($_POST['offset']) ? intval($_POST['offset']) : 0;
            $posts_in = isset($_POST['posts_in']) ? $_POST['posts_in'] : null;

            $optionData = isset($_POST['optionData']) ? $_POST['optionData'] : null;

            $args = array(
                'post_type' => array('product', 'sr_playlist'),
                'meta_key'  => 'alb_tracklist',
                //'post__in' => array( 5932,5933,5934,5935 ),
                'posts_per_page' => $limit,
                'offset' => $offset,
            );
            // if posts_in, add to args
            if ($posts_in !== null && !empty($posts_in)) {
                //convert posts_in in array
                $posts_in = explode(',', $posts_in);
                $args['post__in'] = $posts_in;
            }

            $query = new WP_Query( $args );

            $totalPosts = $query->found_posts;
            $processedPosts = $offset;
            $progress = 0;
            if ( $query->have_posts() ) {
                while ( $query->have_posts() ) {
                    $query->the_post();
                    $post_id = get_the_ID();
                    $tracks = get_post_meta($post_id, 'alb_tracklist', true);
                    if ($tracks && is_array($tracks)) {
                        foreach ($tracks as $index => $item) {
                            if (isset($item['post_audiopreview']) && $item['post_audiopreview'] === 'disabled') {
                                continue;
                            }else{
                                if (isset($item['track_mp3']) && !empty($item['track_mp3'])) {
                                        $this->trimfile($item['track_mp3'], null , $post_id, $index, $tracks, null, $optionData);
                                }
                                if (isset($item['stream_link']) && !empty($item['stream_link'])) {
                                        $stream_title = isset($item['stream_title']) ? $item['stream_title'] : $index;
                                        $this->trimfile($item['stream_link'], $stream_title, $post_id, $index, $tracks, null, $optionData);
                                }
                            }
                        
                        }
                        
                        $processedPosts++;
                    }
                }

                $progress = ($processedPosts / $totalPosts) * 100;
            }

            $response = array(
                'progress' => isset($progress) ? $progress : 0,  // Ensure that $progress is set
                'message' => '',
                'completed' => ($progress >= 100),
                'totalPosts' => $totalPosts,
                'processedPosts' => $processedPosts
            );

            // Reset post data.
            wp_reset_postdata();
            echo json_encode($response);
            wp_die();
        }
    }
    private function trimfile($file_input_fullpath, $file_output_title = null , $post_id = '', $index = null, $tracks = null, $customData = null, $optionData = null){

      //if $file_input_fullpath domain is a .local or .dev, return
        $parsedUrl = parse_url($file_input_fullpath);
        if(isset($parsedUrl['host']) && (strpos($parsedUrl['host'], '.local') !== false || strpos($parsedUrl['host'], '.localhost') !== false || strpos($parsedUrl['host'], '.test') !== false || strpos($parsedUrl['host'], '.example') !== false || strpos($parsedUrl['host'], '.invalid') !== false)){
            return array('message' => 'Error! File has not been created. Localhost domain detected.');
        }
        
      
        // Sanitize customData fields
        if ($customData) {
            $customData = $this->sanitize_option_data($customData);
            //error_log("custom data = " . print_r($customData, true));
        }
        if ($optionData) {
            $optionData = $this->sanitize_option_data($optionData);
            //error_log("optionData data = " . print_r($optionData, true));
        }

        $item = null;

        if($tracks){
            $item = $tracks[$index];
        }
        // Check if we should use the track custom preview or if customData is provided
        if (!empty($customData) || (isset($tracks[$index]['post_audiopreview_settings']) && $tracks[$index]['post_audiopreview_settings'] == 'custom')) {
            $this->customFilePrefix = 'x';

            // Use customData if set, otherwise fallback to item values
            $this->preview_duration = isset($customData['previewLength']) ? $customData['previewLength'] : (isset($item['post_audiopreview_duration']) ? $item['post_audiopreview_duration'] : 30);
            $this->fadein_duration = isset($customData['fadein']) ? $customData['fadein'] : (isset($item['post_fadein_duration']) ? $item['post_fadein_duration'] : 0);
            $this->fadeout_duration = isset($customData['fadeout']) ? $customData['fadeout'] : (isset($item['post_fadeout_duration']) ? $item['post_fadeout_duration'] : 0);
            $this->ad_preroll = isset($customData['prerollFile']) ? $customData['prerollFile'] : (isset($item['post_ad_preroll']) ? $item['post_ad_preroll'] : null);
            $this->ad_postroll = isset($customData['postrollFile']) ? $customData['postrollFile'] : (isset($item['post_ad_postroll']) ? $item['post_ad_postroll'] : null);
            $this->watermark_file = isset($customData['watermarkFile']) ? $customData['watermarkFile'] : (isset($item['post_audio_watermark']) ? $item['post_audio_watermark'] : null);
            $this->watermark_gap = isset($customData['watermarkGap']) ? $customData['watermarkGap'] : (isset($item['post_audio_watermark_gap']) ? $item['post_audio_watermark_gap'] : null);
            $this->trimstart = isset($customData['trimstart']) ? $customData['trimstart'] : (isset($item['post_trimstart']) ? $item['post_trimstart'] : 0);
        } else {
            $this->customFilePrefix = '';
            $this->preview_duration = isset($optionData['previewLength']) ? $optionData['previewLength'] : $this->preview_duration_overall;
            $this->fadein_duration = isset($optionData['fadein']) ? $optionData['fadein'] : $this->fadein_duration_overall;
            $this->fadeout_duration = isset($optionData['fadeout']) ? $optionData['fadeout'] : $this->fadeout_duration_overall;
            $this->ad_preroll = isset($optionData['prerollFile']) ? $optionData['prerollFile'] : $this->ad_preroll_overall;
            $this->ad_postroll = isset($optionData['postrollFile']) ? $optionData['postrollFile'] : $this->ad_postroll_overall;
            $this->watermark_file = isset($optionData['watermarkFile']) ? $optionData['watermarkFile'] : $this->watermark_file_overall;
            $this->watermark_gap = isset($optionData['watermarkGap']) ? $optionData['watermarkGap'] : $this->watermark_gap_overall;
            $this->trimstart = isset($optionData['trimstart']) ? $optionData['trimstart'] : $this->trimstart_overall;
        }

        $this->trimstart = strtotime("1970-01-01 $this->trimstart UTC");
        $this->preview_duration = strtotime("1970-01-01 $this->preview_duration UTC");


        if ($file_output_title == null){
            // Extract the filename from the full path
            $parsed_url = parse_url($file_input_fullpath);
            $file_name = basename($parsed_url['path']);
            // Find the last occurrence of the period in the filename to determine the start of the extension
            $extension_position = strrpos($file_name, '.');
            // Generate a sanitized file name
            $sanitized_file_name = preg_replace('/[^a-zA-Z0-9\-\._]/', '_', $file_name);
            $file_output = $this->customFilePrefix . $post_id . '_' . substr($sanitized_file_name, 0, $extension_position) . '_preview' . substr($sanitized_file_name, $extension_position);
        }else{
            $file_output =  $this->customFilePrefix . $post_id . '_' . $file_output_title . '_preview.mp3';
        }
       
        // Step 1: Separate the file name and the extension
        $file_info = pathinfo($file_output);
        $file_name = $file_info['filename'];
        $file_extension = '.' . $file_info['extension'];
        // Step 2: Replace spaces, single quotes, slashes, and colons with hyphens
        $file_title = str_replace([' ', '\'', '/', ':'], '-', $file_name);
        // Step 3: Remove any remaining unwanted characters, keeping only letters, digits, hyphens, and underscores
        $file_title = preg_replace('/[^\p{L}\p{N}\-_]/u', '', $file_title);
        // Step 4: Replace multiple consecutive hyphens with a single hyphen
        $file_title = preg_replace('/-+/', '-', $file_title);
        // Step 5: Trim hyphens from the beginning and end of the string
        $file_title = trim($file_title, '-');
      
        $file_output_fullpath =  $this->uploads_dir . $file_title . $file_extension;
        $file_output_url = str_replace(wp_get_upload_dir()['basedir'], wp_get_upload_dir()['baseurl'], $file_output_fullpath);
        
        if ($this->overwrite == 'false'){
            if (file_exists($file_output_fullpath)) {
                return;
            }
        }

        $options = array(
            'http' => array(
                'method' => 'HEAD',
                'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36\r\n" .
                            "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8\r\n" .
                            "Accept-Encoding: gzip, deflate, br\r\n" .
                            "Accept-Language: en-US,en;q=0.5\r\n" .
                            "Connection: keep-alive\r\n"
            )
        );
        
        $context = stream_context_create($options);
        
        $headers = @get_headers($file_input_fullpath, 1, $context);
        if ($headers === false) {
            return array('message' => "Error 516: Audio source file does not seem to exist. Failed to retrieve headers for: " . $file_input_fullpath);
        }
        
        $normalized_headers = array_change_key_case($headers, CASE_LOWER);
        
        // Check for HTTP response code in headers
        $http_status = isset($normalized_headers[0]) ? $normalized_headers[0] : '';
        if (stripos($http_status, '403') !== false) {
            return array('message' => "Error 403: Access to the file is forbidden (403). The server may have restricted access to this file at: " . $file_input_fullpath);
        } elseif (stripos($http_status, '404') !== false) {
            return array('message' => "Error 404: File not found (404). Please ensure the file exists at: " . $file_input_fullpath);
        }
        
        // Check if Content-Length header is present
        if (!isset($normalized_headers['content-length'])) {
            return array('message' => "Error 624: Content-Length header not set or invalid. Possible server restriction or file access issue at: " . $file_input_fullpath);
        }
       
       
        
        /*$this->ad_preroll = "";
        $this->ad_postroll = "";
        $this->watermark_file = "https://api.sonaar.io/sonaar_watermark.mp3";*/

        $api_url = $this->api_url . '/trim';
        // Retrieve the user license key
        $user_license_key = get_site_option('sonaar_music_licence');
        $user_agent = 'SRMP3PRO/' . SRMP3PRO_VERSION . ' WordPress/' . get_bloginfo('version') . '; ' . get_bloginfo('url') . '; License-Key/' . $user_license_key;

        $payload = json_encode([
            'license_key' => $user_license_key,
            'file_input_fullpath' => $file_input_fullpath,
            'file_output_title' => $file_title,
            'post_id' => $post_id,
            'index' => $index,
            'options' => [
                'post_audiopreview_duration' => $this->preview_duration,
                'post_fadein_duration' => $this->fadein_duration,
                'post_fadeout_duration' => $this->fadeout_duration,
                'post_ad_preroll' => $this->ad_preroll,
                'post_ad_postroll' => $this->ad_postroll,
                'post_audio_watermark' => $this->watermark_file,
                'post_audio_watermark_gap' => $this->watermark_gap,
                'post_trimstart' => $this->trimstart
            ]
        ], JSON_PRETTY_PRINT);

        //error_log("payload = " . print_r($payload, true));

        $response = wp_remote_post($api_url, [
            'body' => $payload,
            'headers' => [
                'Content-Type' => 'application/json',
                'User-Agent' => $user_agent
            ],
            'timeout' => 300 // Increase the timeout to 300 seconds (5 minutes) otherwise it times out for long files.
        ]);

        //error_log("response: " . print_r($response, true));
        /*if (is_wp_error($response)) {
            error_log("Error: " . $response->get_error_message());
        }*/

        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);

        //error_log("result: " . print_r($result, true));

       

        if ($result && isset($result['success']) && $result['success'] === true && isset($result['file_output_url'])) {
            $file_output_url = $result['file_output_url'];
        
            // Fetch the file from the API server
            $file_response = wp_remote_get($file_output_url);
        
            if (!is_wp_error($file_response)) {
                $file_body = wp_remote_retrieve_body($file_response);
        
                // Define the local file path
                $local_file_path = $this->uploads_dir . '/' . basename($file_output_url);
        
                // Save the file to the local server
                file_put_contents($local_file_path, $file_body);
        
                // Get the base URL for the uploads directory
                $upload_dir = wp_upload_dir();
                $file_output_url = $upload_dir['baseurl'] . '/' . $this->folder_name . '/' . basename($file_output_url);
            } else {
                $file_output_url = '';
            }
        } else {
            $file_output_url = '';
        }
        

        $alb_tracklist = get_post_meta($post_id, 'alb_tracklist', true);

        // Check if the fetched tracks is an array (to avoid PHP errors) and if index is provided. WIP: If user has added an empty track in cmb2, we will have an incorrect index.
        if (is_array($alb_tracklist) && isset($index) && isset($alb_tracklist[$index])) {
            // Update the 'audio_preview' key of the specific item in the array with the new path
            $alb_tracklist[$index]['audio_preview'] = $file_output_url;
            // Update the post meta with the modified tracks
            update_post_meta($post_id, 'alb_tracklist', $alb_tracklist);
        }
        return $file_output_url;
    }

    private function sanitize_option_data($data) {
        return [
            'trimstart' => isset($data['trimstart']) ? sanitize_text_field($data['trimstart']) : '',
            'previewLength' => isset($data['previewLength']) ? sanitize_text_field($data['previewLength']) : '',
            'fadein' => isset($data['fadein']) ? sanitize_text_field($data['fadein']) : '',
            'fadeout' => isset($data['fadeout']) ? sanitize_text_field($data['fadeout']) : '',
            'watermarkFile' => isset($data['watermarkFile']) ? esc_url_raw($data['watermarkFile']) : '',
            'watermarkGap' => isset($data['watermarkGap']) ? sanitize_text_field($data['watermarkGap']) : '', // Assuming this is not a URL
            'prerollFile' => isset($data['prerollFile']) ? esc_url_raw($data['prerollFile']) : '',
            'postrollFile' => isset($data['postrollFile']) ? esc_url_raw($data['postrollFile']) : '',
        ];
    }
    
    public function count_audio_files() {
        check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');

        $files = glob($this->uploads_dir . '*.*');
        $fileCount = count($files);
        echo json_encode(['count' => $fileCount]);
        wp_die();
    }

    public function remove_audio_files_and_update_posts() {
        check_ajax_referer('sonaar_music_admin_ajax_nonce', 'nonce');

        try {
            // 1. Remove all files from your folder
            $files = glob($this->uploads_dir . '*'); // get all file names
            foreach($files as $file) { 
                if(is_file($file)) {
                    unlink($file); // delete file
                }
            }

            // 2. Update all posts
            $args = array(
                'post_type' => array('product', 'sr_playlist'),
                'meta_key'  => 'alb_tracklist',
                'posts_per_page' => -1 // get all posts
            );

            $query = new WP_Query($args);
            if($query->have_posts()) {
                while($query->have_posts()) {
                    $query->the_post();
                    $post_id = get_the_ID();
                    $data = get_post_meta($post_id, 'alb_tracklist', true);
                    if($data && is_array($data)) {
                        foreach($data as $index => $item) {
                            $data[$index]['audio_preview'] = ''; // set 'audio_preview' to empty
                        }
                        update_post_meta($post_id, 'alb_tracklist', $data); // update the post meta
                    }
                }
            }

            // Return success response
            echo json_encode([
                'success' => true,
                'message' => 'All files removed and posts updated successfully!'
            ]);
            wp_die();

        } catch(Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
            wp_die();
        }
    }
}
