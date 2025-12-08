$ = jQuery;
var elementAudio = document.createElement("audio"); // Object for iOS audio
elementAudio.crossOrigin = "anonymous";

var elementAudioSingle = document.createElement("audio");
elementAudioSingle.crossOrigin = "anonymous";

var srp_startingTime = 0; // Used by the sonaar_ts (time stamp) shortcode
var srp_lyricsAreScrolling = false;
var myVueAr = [];
var myVueTag = [];
var myVueRange = [];
var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
var webAudioNotSupported;

IRON.canvasAnimation = [];
IRON.rangeSelector = [];
IRON.previousTrackThreshold = 2; //The number of seconds a track must play before the "Previous" button resets the track to the beginning.

sonaar_music.option.tooltip_tracklist_btn = (typeof sonaar_music.option.tooltip_tracklist_btn === 'undefined') ? 'View Tracklist' : sonaar_music.option.tooltip_tracklist_btn;
sonaar_music.option.tooltip_rwd_btn = (typeof sonaar_music.option.tooltip_rwd_btn === 'undefined') ? 'Rewind 15 seconds' : sonaar_music.option.tooltip_rwd_btn;
sonaar_music.option.tooltip_prev_btn = (typeof sonaar_music.option.tooltip_prev_btn === 'undefined') ? 'Previous' : sonaar_music.option.tooltip_prev_btn;
sonaar_music.option.tooltip_play_btn = (typeof sonaar_music.option.tooltip_play_btn === 'undefined') ? 'Play/Pause' : sonaar_music.option.tooltip_play_btn;
sonaar_music.option.tooltip_next_btn = (typeof sonaar_music.option.tooltip_next_btn === 'undefined') ? 'Next' : sonaar_music.option.tooltip_next_btn;
sonaar_music.option.tooltip_fwrd_btn = (typeof sonaar_music.option.tooltip_fwrd_btn === 'undefined') ? 'Forward 30 seconds' : sonaar_music.option.tooltip_fwrd_btn;
sonaar_music.option.tooltip_speed_btn = (typeof sonaar_music.option.tooltip_speed_btn === 'undefined') ? 'Speed Rates' : sonaar_music.option.tooltip_speed_btn;
sonaar_music.option.tooltip_shuffle_btn = (typeof sonaar_music.option.tooltip_shuffle_btn === 'undefined') ? 'Shuffle' : sonaar_music.option.tooltip_shuffle_btn;
sonaar_music.option.tooltip_repeat_playlist_btn = (typeof sonaar_music.option.tooltip_repeat_playlist_btn === 'undefined') ? 'Enable Repeat' : sonaar_music.option.tooltip_repeat_playlist_btn;
sonaar_music.option.tooltip_repeat_track_btn = (typeof sonaar_music.option.tooltip_repeat_track_btn === 'undefined') ? 'Enable Repeat Track' : sonaar_music.option.tooltip_repeat_track_btn;
sonaar_music.option.tooltip_repeat_disable_btn = (typeof sonaar_music.option.tooltip_repeat_disable_btn === 'undefined') ? 'Disable Repeat' : sonaar_music.option.tooltip_repeat_disable_btn;
sonaar_music.option.tooltip_volume_btn = (typeof sonaar_music.option.tooltip_volume_btn === 'undefined') ? 'Volume' : sonaar_music.option.tooltip_volume_btn;

// iOS 14 and 15 has a bug when using createMediaElementSource.the audio is distorted. Dont use webaudioapi on these versions. Audio Spectrum wont work with iOS 14 and 15.
if (iOS) {
  var iOSVersion;
  var match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  iOSVersion = [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3] || 0, 10)];
  if (iOSVersion[0] < 16) {
      webAudioNotSupported = true;
    }
}

// Set a css varaible for the window height as vh units are not usable on mobile browsers
IRON.setExtendedPlayerHeightVar = function() {
  if ( document.getElementById('srp-extendedPlayer-height')) {
    document.getElementById('srp-extendedPlayer-height').remove();
  }
  var windowHeight = window.innerHeight;
  var styleTag = document.createElement('style');
  styleTag.id = 'srp-extendedPlayer-height';
  styleTag.innerHTML = ':root { --srp-extendedPlayer-height: ' + (windowHeight - $('.srp_ext_primary').innerHeight() ) + 'px; }';
  document.body.appendChild(styleTag);
}

IRON.setLimitedSizeObject = function(obj, key, value, maxSize) { // Set a new key value pair in an object and limit the object size
  obj[key] = value;
  const keys = Object.keys(obj);
  if (keys.length > maxSize) {
    const oldestKey = keys[0];
    delete obj[oldestKey];
  }
}

IRON.setTracksTimeMemories = function(audioPlayer, newTime = null, completed = false) { 
  if(audioPlayer.trackMemory){
    var time = (newTime != null)? newTime : sr_getTrackCurrentTime(audioPlayer);
    const $currentTrack = audioPlayer.find('.sr-playlist-item').eq(audioPlayer.currentTrack);
    var trackDuration = sr_setAudioElementInstance(audioPlayer).duration;
    trackDuration = isNaN(trackDuration) ? 0 : trackDuration;
    $currentTrack.data('current-time', time);
    if (IRON.localStorageTrackMemory[$currentTrack.data('track-memory-key')]?.[2] === true) {
      completed = true;
    }
    IRON.setLimitedSizeObject(IRON.localStorageTrackMemory, $currentTrack.data('track-memory-key'), [time, trackDuration, completed], 50);
    localStorage.setItem('srp_tracks_memories', JSON.stringify(IRON.localStorageTrackMemory) );
  }
}

IRON.fetchThumnbnailsFromItunes = {
		cachedThumbsArray: [],
		displayThumbnail: function(img, audioPlayer, track, pos){
      const $audioPlayer = $(audioPlayer);
      const $track = $(track);
      const isFirstTrackAndNotPlaying = pos === 0 && !$audioPlayer.hasClass('audio-playing');
      const isCurrentTrack = $track.hasClass('current');
      const showArtwork = $audioPlayer.data('hide-artwork') !== '1' && $audioPlayer.data('hide-artwork') !== 'true';
      const $albumArtImg = $audioPlayer.find('.album-art img');

			if (img) {

        if (IRON.sonaar.player.list.tracks ) {
          if(IRON.sonaar.player.selectedPlayer == audioPlayer || !audioPlayer) {
            IRON.sonaar.player.list.tracks[pos].poster = img;
          }
        }

        if (!audioPlayer) return;

        if (isFirstTrackAndNotPlaying || isCurrentTrack) {
            if (showArtwork) {
                $audioPlayer.removeClass('sonaar-no-artwork');
                if ($albumArtImg.length) {
                    $albumArtImg.attr('src', img);
                } else {
                    $audioPlayer.find('.album-art').append('<img src="' + img + '">');
                }
                srp_getColorsFromImage(audioPlayer, img);
            }
        }

        $track.data('albumart', img); // Save the img in the track data for setMediaSessionAPI
    
        if ($audioPlayer.hasClass('show-trackartwork')) {
            const $trackImg = $track.find('img');
            if (!$trackImg.length) {
                $track.prepend($('<img>', { src: img, class: 'sr_track_cover' }));
            } else {
                $trackImg.attr('src', img);
            }
        }
    
       
      } else {
        // No img set

        if (IRON.sonaar.player.list.tracks) {
          IRON.sonaar.player.list.tracks[pos].poster = '';
        }
        
        if (!audioPlayer) return;
        if (isFirstTrackAndNotPlaying || isCurrentTrack) {
            $audioPlayer.addClass('sonaar-no-artwork');
            $audioPlayer.find('.album-art img').remove();
        }
        $track.data('albumart', '');
        if ($track.find('.sr_track_cover').length) {
            $track.find('.sr_track_cover').remove();
        }
        
      }
		},
		init: function(that, termArray, audioPlayer, track, pos){
			
      termArray = termArray.split(' - ').join('-').split(' ').join('+');
      //termArray='NOFX Linoleum';
			var thumb; // image from itunes
			var apiUrl = 'https://itunes.apple.com/search?term='+termArray;
			if(termArray == 'Song title unavailable' || termArray == 'No Titles Available'){
				// thumb = $.qtmplayerRadioFeedObj.qtFeedData.cover;
				that.cachedThumbsArray[termArray] = false;
				that.displayThumbnail(false, audioPlayer, track, pos);
				return;
			}
			if( undefined === that.cachedThumbsArray[termArray] ) {
        //console.log("Calling iTunes Search API: ", termArray);
				$.ajax({
					type: 'GET',
					cache: true,
					url: apiUrl,
					async: true,
					context: this,
          jsonp: false,
					success: function(json) {
						if('object' !== typeof( json )){
							json = JSON.parse(json);
						}
						if(json.resultCount > 0){

							thumb = json.results[0].artworkUrl100.split('100x100bb.jpg').join('500x500bb.jpg');
							that.cachedThumbsArray[termArray] = thumb;
							that.displayThumbnail(thumb, audioPlayer, track, pos);
							return;
						}else{
              that.cachedThumbsArray[termArray] = false;
            }
					}
				});
			} else {
				// return cached image
				that.displayThumbnail( that.cachedThumbsArray[termArray], audioPlayer, track, pos);
				return;
			}
		},
}

IRON.getIceCastInfo = function(audioPlayer = false) {
  function fetchIcecastInfo(data, icecast_mount, track, trackDataPos, audioPlayer) {
    if (audioPlayer){
      if (track.data('icecast-error') === 1){
        return;
      }
    }
    return new Promise(function(resolve, reject) {
      jQuery.ajax({
        type: 'GET', 
        url: data,
        async: true,
        jsonp: false,
        success: function(json) {
          var resultArray = [];
          var title = '';
          var artist = '';
          var artwork = '';
          var server_name = '';
          if('object' === typeof( json )){

           if (json.hasOwnProperty('id')) {
              // Handle the specific JSON structure
              if(json['title']){
                title = json['title'];
              }
              
              if(json['artist']){
                artist = json['artist'];
              }

              if(json['cover']){
                artwork = json['cover'];
              }
              
            } else if (json.hasOwnProperty('current_track')){
              // radio.co
              if(json.current_track.title){
                title = json.current_track.title;
              }              
              if(json.current_track.artist){
                artist = json.current_track.artist;
              }
              if(json.current_track.artwork_url){
                artwork = json.current_track.artwork_url;
              }
              if(json.current_track.artwork_url_large){
                artwork = json.current_track.artwork_url_large;
              }

            } else if (icecast_mount !== '') {
              // based on https://stream.p-node.org/json.xsl
              var source = json.mounts[icecast_mount];
              title = source['title'];
              if(source['artist']){
                artist = source['artist'];
              }
              if(source['server_name']){
                server_name = source['server_name'];
              }
            } else if (json.hasOwnProperty('now_playing')) {
              // Handle Azuracast radio
              title = json.now_playing.song.title;
              artist = json.now_playing.song.artist;
              artwork = json.now_playing.song.art;
              server_name = json.station.name;
            } else {
              var source = json.icestats.source;
              if('undefined' === typeof(source)){ return; }
              if(source[0]){
                title = source[0]['title'];
                if(source[0]['artist']){
                  artist = source[0]['artist'];
                }
                if(source[0]['server_name']){
                  server_name = source[0]['server_name'];
                }
              } else if( source['title'] ){
                title = source['title'];
                if(source['artist']){
                  artist = source['artist'];
                }
                if(source['server_name']){
                  server_name = source['server_name'];
                }
              }
            }
          } else if('array' === typeof( json )){
            if(icecast_mount !== '') {
              if("undefined" !== typeof( json[icecast_mount]) ){
                title = json[icecast_mount]['title'];
              } else if( "undefined" !== typeof( json['source'][icecast_mount] ) ){
                title = json['source'][icecast_mount]['title'];
              }
            } else if(json['icestats']['source']['title']){
              title = (json['icestats']['source']['title']);
              if(json['icestats']['source']['artist']){
                artist = json['icestats']['source']['artist'];
              }
              if(json['icestats']['source']['server_name']){
                server_name = json['icestats']['source']['server_name'];
              }
            } else if(json['icestats']['source'][0]['title']){
              title = (json['icestats']['source'][0]['title']);
              if(json['icestats']['source']['artist']){
                artist = json['icestats']['source']['artist'];
              }
              if(json['icestats']['source']['server_name']){
                server_name = json['icestats']['source']['server_name'];
              }
            }
          }
          //title = "Em & Katie - Date Night Collective"; //test...should display an image from itunes
          //artwork = '';
          resultArray['title'] = title;
          resultArray['artist'] = artist;
          resultArray['server_name'] = server_name;
          resultArray['artwork'] = artwork;
          printResult(resultArray, track, trackDataPos);
        },
        error: function(xhr, status, error) {

          if(audioPlayer){
            audioPlayer.icecastLoaded = true;
            track.data('icecast-error', 1);
            $(track).find('.tracklist-item-title').text(track.originalText);
            
          }
          setOriginalTracksonSticky(trackDataPos);
        }
      });
    });
  }
  function printResult(result, track, trackDataPos){
    
    lookfortitle = result['title'].replace(result['server_name'], '');
    if(result['artwork'] !== ''){
      // there is an image set in the JSON so we use it instead of the iTunes API
      IRON.fetchThumnbnailsFromItunes.displayThumbnail(result['artwork'], audioPlayer, track, trackDataPos);
    }else{
      IRON.fetchThumnbnailsFromItunes.init(IRON.fetchThumnbnailsFromItunes, lookfortitle, audioPlayer, track, trackDataPos);
    }
    setStickyTracks(result, trackDataPos);

    if(sonaar_music.option.show_artist_name === "on"){
      artist_string = (result['artist']) ? '<span class="srp_trackartist"> ' + sonaar_music.option.artist_separator + ' ' + result['artist'] + '</span>': '';
      result['title'] = result['title'] + artist_string;
    }
    if(audioPlayer){
      audioPlayer.icecastLoaded = true;
      if(trackDataPos == 0 && !$(audioPlayer).find('.playlist li.current').length){
        $(audioPlayer).find('.sr_it-playlist-title').text(result['server_name']);
        $(audioPlayer).find('.album-title').text(result['server_name']);
        $(audioPlayer).find('.track-title').html(result['title']);
      }

      if ($(audioPlayer).find('.playlist li').length == 1) {
        $(audioPlayer).find('.album-title').text(result['server_name']);
        $(audioPlayer).find('.srp_player_boxed .album-title').html(result['title']);  //Yes, we show the track title in the album-title field in this case
        $(audioPlayer).find('.track-title').html(result['title']);
      } else {
        if($(track).hasClass('current')){
          $(audioPlayer).find('.sr_it-playlist-title').text(result['server_name']);
          $(audioPlayer).find('.album-title').text(result['server_name']);
          $(audioPlayer).find('.track-title').html(result['title']);
        }
      }
      $(track).find('.tracklist-item-title').html(result['title']);
    
    }
  }
  function startICInterval(audioPlayer = false){
    if (!this.icecastInterval) {
      //start audioplayer interval to fetch every 15 seconds
       this.icecastInterval = setInterval(function() {
        IRON.getIceCastInfo(audioPlayer);
      }, 15000);
    }
  }
  function convertTrackURLtoJson(url){
    let parsedUrl = new URL(url);
    url = parsedUrl.origin + parsedUrl.pathname.replace(/\/[^/]*$/, "/status-json.xsl");
    return url;
  }
  function setLoadStatus(pos, track = null, audioPlayer){
      if (IRON.sonaar.player.list.tracks && !IRON.sonaar.player.icecastLoaded) {
        if(typeof IRON.sonaar.player.list.tracks[pos] !== 'undefined'){
          IRON.sonaar.player.list.tracks[pos].trackTitleOriginalText =  IRON.sonaar.player.list.tracks[pos].track_title;
          IRON.sonaar.player.list.tracks[pos].albumTitleOriginalText =  IRON.sonaar.player.list.tracks[pos].album_title;
          IRON.sonaar.player.list.tracks[pos].track_title = 'Retrieving info...';
          IRON.sonaar.player.list.tracks[pos].album_title = 'Retrieving info...';
        }
      }
      if(audioPlayer){
        if(!audioPlayer.icecastLoaded){
          track.originalText = $(track).find('.tracklist-item-title').text();
          $(track).find('.tracklist-item-title').text('Retrieving info...');
        }
      }
  }
  function setStickyTracks(result, pos){
      if (IRON.sonaar.player.list.tracks && typeof IRON.sonaar.player.list.tracks[pos] !== 'undefined') {
        if(IRON.sonaar.player.selectedPlayer == audioPlayer || !audioPlayer) { // make sure the sticky is related to the current player widget selected.
          IRON.sonaar.player.icecastLoaded = true;
          IRON.sonaar.player.list.tracks[pos].track_title = result['title'];
          IRON.sonaar.player.list.tracks[pos].album_title = result['server_name'];
          if(result['artist']){
            IRON.sonaar.player.list.tracks[pos].track_artist = result['artist'];
          }
        }
      }
    
  }
  function setOriginalTracksonSticky(pos){
    if (IRON.sonaar.player.list.tracks) {
      IRON.sonaar.player.icecastLoaded = true;
      IRON.sonaar.player.list.tracks[pos].track_title = IRON.sonaar.player.list.tracks[pos].trackTitleOriginalText;
      IRON.sonaar.player.list.tracks[pos].album_title = IRON.sonaar.player.list.tracks[pos].albumTitleOriginalText;
    }        
  }

  if(!audioPlayer){
    IRON.sonaar.player.list.tracks.forEach(function(track) {
      if (!track.icecast_json) {
        return;
      }
      const icecast_mount = (track.icecast_mount == false) ? '' : track.icecast_mount;
      const jsonFile = track.icecast_json;
      if (jsonFile) {
        const trackDataPos = track.track_pos;
        setLoadStatus(trackDataPos, track, audioPlayer);
        fetchIcecastInfo(jsonFile, icecast_mount, track, trackDataPos, audioPlayer);
      }
    });
  }

  if(audioPlayer){
    const playlistItems = $(audioPlayer).find('.playlist li[data-icecast_json!=""]');
    playlistItems.each(function() {
      const jsonFile = $(this).data('icecast_json');
      if (jsonFile) {
        const track = $(this);
        const trackDataPos = $(this).index();
        const icecast_mount = $(this).data('icecast_mount')
        setLoadStatus(trackDataPos, track, audioPlayer);
        fetchIcecastInfo(jsonFile, icecast_mount, track, trackDataPos, audioPlayer);
      }
    });
  }
  startICInterval(audioPlayer);

}
function startAudioSpectrum( audioPlayer, location = false, restart = false ){

  if( audioPlayer == null ) return;
  // Check if is the sticky player spectrum
  let isStickyPlayer ;
  if( audioPlayer == '#sonaar-player' ){
    isStickyPlayer = true;
    audioPlayer = $('#sonaar-player');
  }else{
    isStickyPlayer = false;
  }


  if(! audioPlayer.hasClass('srp_player_spectrum') && !isStickyPlayer){ //Exit if spectrum is not enabled
    return;
  }


  if(  // Avoid to start the spectrum before user gesture when continuous player is enabled
    webAudioNotSupported ||  
    isStickyPlayer && //If the spectrum is from the sticky
    IRON.audioPlayer.stickyEnable && // If the sticky is enabled
    document.getElementById("sonaar-audio").paused //if the player is not playing yet  
    ){
    return;
  }
  var player;
  // Create spectrum container
  const container = document.createElement('div');
  container.className = 'srp_spectrum_container srp_hidden';

  //SET SPECTRUM CANVAS LOCATION
  const playerNum = srp_convertPlayerIdToPlayerNum(audioPlayer.attr('id'));
  if(playerNum){
    audioPlayer = IRON.players[playerNum].audioPlayer; // Get the audio player from the IRON.players array to reach audioPlayer attributes Eq:"adaptiveColors"
  }
  audioPlayer.spectrumAnimation = true;
  IRON.sonaar.spectrumAnimation = true;

  if( 
    ! IRON.audioPlayer.stickyEnable && isStickyPlayer || // If the sticky is disabled and the spectrum is from the sticky
    ! isStickyPlayer && playerNum == null //return if the player is not found
    ){ 
    return;
  }

  if(isStickyPlayer){
    if(sonaar_music.option.sticky_spectro_responsive === 'hide_tablet'){
      audioPlayer.addClass('srp_hide_spectro_tablet');
      audioPlayer.addClass('srp_hide_spectro_mobile');
    }else if(sonaar_music.option.sticky_spectro_responsive === 'hide_mobile'){
      audioPlayer.addClass('srp_hide_spectro_mobile');
    }
  }

  if( 
    window.matchMedia("(max-width: 768px)").matches && audioPlayer.hasClass('srp_hide_spectro_tablet') || //Disable on tablet enabled
    window.matchMedia("(max-width: 480px)").matches && audioPlayer.hasClass('srp_hide_spectro_mobile') //Disable on Mobile enabled
  ){
    if(isStickyPlayer){
      IRON.sonaar.spectrumAnimation = false;
    }

    audioPlayer.spectrumAnimation = false;

    return;
  }

  // spectro ="color1:#FF0064|color2:#0073FF|shadow:|barCount:500|barWidth:10|barGap:1|canvasHeight:100|halign:center|valign:bottom|spectroStyle:bars|sharpFx:|reflectFx:|gradientDirection:vertical|enableOnTracklist:|bounceClass:.control, .menu-item-1273, .elementor-element-377841ec|bounceVibrance:58|bounceBlur:true"
  const spectro = (IRON.sonaar.player.selectedPlayer != null)? IRON.sonaar.player.selectedPlayer.data("spectro"): audioPlayer.data("spectro");
  const spectroValues = ( typeof spectro === 'string') ?  spectro.split('|').reduce((obj, item) => {
    const parts = item.split(':');
    obj[parts[0]] = !isNaN(parts[1]) && parts[1] !== "" ? parseInt(parts[1]) : parts[1];
    return obj;
  }, {}) : false;
  if(spectroValues['color1'] == '' && spectroValues['color2'] != ''){
    spectroValues['color1'] = spectroValues['color2'];
    spectroValues['color2'] = '';
  }

  if (isStickyPlayer){
    if(IRON.sonaar.player.selectedPlayer != null && IRON.sonaar.player.selectedPlayer.adaptiveColors){
      var color1 = (spectroValues['color1'] == '')? 'rgba(0,0,0,0)' : spectroValues['color1'];// Set transparent color as default color if adaptive colors is enabled so the spectrum will be transparent until adaptive colors is applied
    }else{
      var color1 = sonaar_music.option.sticky_spectro_color1 || false;
    }
    var color2 = (IRON.sonaar.player.selectedPlayer != null && IRON.sonaar.player.selectedPlayer.adaptiveColors)? spectroValues['color2'] : sonaar_music.option.sticky_spectro_color2 || false; // Set transparent color as default color if adaptive colors is enabled so the spectrum will be transparent until adaptive colors is applied
    var barCount = parseInt(sonaar_music.option.sticky_spectro_barcount) || 60;
    var barWidth = parseInt(sonaar_music.option.sticky_spectro_barwidth) || 4;
    var barGap = sonaar_music.option.sticky_spectro_bargap !== undefined && sonaar_music.option.sticky_spectro_bargap !== null ? parseInt(sonaar_music.option.sticky_spectro_bargap) : 2;
    var canvasHeight = sonaar_music.option.sticky_spectro_canvasheight || 70;
    var barsAlignment = sonaar_music.option.sticky_spectro_halign || 'left';
    var barsVerticalAlignment = sonaar_music.option.sticky_spectro_valign || 'bottom';
    var spectroStyle = sonaar_music.option.sticky_spectro_style || 'bars';
    var blockPointu = (sonaar_music.option.sticky_spectro_sharpends === "true") ? true : false;
    var shockWaveVibrance = parseInt(sonaar_music.option.sticky_spectro_vibrance) || 40;
    var blockHeight = parseInt(sonaar_music.option.sticky_spectro_blocheight) || 2;
    var blockGap = parseInt(sonaar_music.option.sticky_spectro_blockgap) || 2;
    var spectroReflect = (sonaar_music.option.sticky_spectro_reflect === "true") ? true : false;
    var spectroShadow = (sonaar_music.option.sticky_spectro_shadow === "true") ? true : false;
    var spectroGradientDir = sonaar_music.option.sticky_spectro_gradientdir || 'vertical';
    var stickyContainer = sonaar_music.option.sticky_spectro_container || 'inside';
    var stickyPosBottom = sonaar_music.option.sticky_spectro_posbottom || '50';
    var stickyPosLeft = sonaar_music.option.sticky_spectro_posleft || '0';
    var mobileStickyPosBottom = sonaar_music.option.mobile_sticky_spectro_posbottom || '10';
    var mobileStickyPosLeft = sonaar_music.option.mobile_sticky_spectro_posleft || '0';
    var tracklistSpectrum = false;
  }else{
    var color1 = spectroValues['color1'] || false;
    var color2 = spectroValues['color2'] || false;
    var spectroShadow = (spectroValues['shadow'] !== "true") ? false : true;
    var barCount = spectroValues['barCount'] || 60;
    var barWidth = spectroValues['barWidth'] || 4;
    var barGap = spectroValues['barGap'] || 2;
    var canvasHeight = spectroValues['canvasHeight'] || 100;
    var barsAlignment = spectroValues['halign'] || 'left';
    var barsVerticalAlignment = spectroValues['valign'] || 'bottom';
    var spectroStyle = spectroValues['spectroStyle'] || 'bars';
    var blockPointu = spectroValues['sharpFx'] || false;
    var shockWaveVibrance = spectroValues['shockwaveVibrance']/100 || 0.4;
    var blockHeight = spectroValues['blockHeight'] || '2';
    var blockGap = spectroValues['blockGap'] || '2';
    var spectroReflect = spectroValues['reflectFx'] || false;
    var spectroGradientDir = spectroValues['gradientDirection'] || 'vertical';
    var tracklistSpectrum = spectroValues['enableOnTracklist'] || false;
    var selectors = spectroValues['bounceClass'] || false;
    var selectorMaxScale = spectroValues['bounceVibrance'] || 100;
    var selectorBlur = spectroValues['bounceBlur'] || false;
  }
  if (selectors){
      selectors = selectors.split(',');
      selectors = selectors.map((val) => val.trim());
  }
  spectroReflect = ( spectroReflect == 'false' ||  spectroReflect == '' ) ? false : true;
  audioPlayer.spectroReflect = spectroReflect;
  tracklistSpectrum = ( tracklistSpectrum == 'true' ) ? true : false;
  tracklistSpectrum = ( audioPlayer != '#sonaar-player' )? tracklistSpectrum : false;  
  if( playerNum != null && !audioPlayer.parents('.playlist_enabled').length && tracklistSpectrum){
    return;
  }  
  const pixelFx = (spectroStyle === 'bricks') ? true : false;

  if( !location && playerNum != null && !tracklistSpectrum || !location && playerNum != null && tracklistSpectrum && $(audioPlayer).filter('.show-playlist').length == 0){
    location = (audioPlayer.find('.srp_spectrum_box').length)? audioPlayer.find('.srp_spectrum_box') : audioPlayer.find('.player');
  }else if( !location && playerNum != null && tracklistSpectrum ){
    location = audioPlayer.find('.sr-playlist-item.current .tracklist-item-title');
  }else{
    if(isStickyPlayer){
      if (stickyContainer === "outside"){
        location = ( IRON.sonaar.player.isSmallDevice )? audioPlayer.find('.srp_extendedPlayer .sr_progressbar_sticky') : audioPlayer;   

      }else{
        location =  audioPlayer.find('#sPlayer');   
      }
    }else{

    location = audioPlayer;
    }
  }

  var totalWidth = (barWidth + barGap) * barCount;

  //CANVAS CREATION
  let canvas;
  let idIndex = (playerNum != null)? '-' + playerNum : '';
  let trackIndex = audioPlayer.find('.sr-playlist-item.current').index();
  idIndex = ( tracklistSpectrum && audioPlayer.find('.sr-playlist-item.current').length )? idIndex + '-' + trackIndex : idIndex ;
  idIndex = (isStickyPlayer)? '-sticky' : idIndex ;

  const canvasId = 'srp_spectrum' + idIndex;
  if( $( '#' + canvasId ).length ){
    canvas = $('#' + canvasId)[0];
  }else{
    canvas = document.createElement('canvas');
    location.prepend(container);

    canvas.id = canvasId;
 
    canvas.classList = 'srp_spectrum';
    container.appendChild(canvas);
  } 
  const ctx = canvas.getContext('2d');

if(isStickyPlayer){
  if (stickyContainer === "outside"){
    $('#sonaar-player .srp_spectrum_container').css('bottom', stickyPosBottom + 'px').css('left', stickyPosLeft + 'px');
    $('#sonaar-player .srp_extendedPlayer .srp_spectrum_container').css('bottom', mobileStickyPosBottom + 'px').css('left', mobileStickyPosLeft + 'px');
  }else{
    audioPlayer.find('.mobileProgress').css('display', 'block');
    audioPlayer.find('wave').css('display', 'none');
    audioPlayer.find('.sonaar_wave_cut').css('display', 'none');
    audioPlayer.find('.sonaar_wave_base').css('display', 'none');
  }
}
if(spectroStyle == 'selectors'){
  audioPlayer.find('.srp_spectrum_container').css('display', 'none');
}

let maxCanvasWidth = location.width();
if(
  tracklistSpectrum && //If tracklist spectrum is enabled
  $(audioPlayer).hasClass('srp_tracklist_grid') && //If tracklist is grid
  audioPlayer.find('.srp_spectrum_container').length && window.getComputedStyle( audioPlayer.find('.srp_spectrum_container')[0] ).getPropertyValue("position") == 'absolute' //If spectrum is set to absolute position
){
  maxCanvasWidth = 999999;
}

  totalWidth = totalWidth > maxCanvasWidth ? maxCanvasWidth : totalWidth;
  if((barWidth + barGap) * barCount > maxCanvasWidth){
    barsAlignment = 'left';
  }
  canvas.width = totalWidth;
  canvas.height = canvasHeight;
  container.style.height = canvasHeight + 'px';

  audioPlayer.spectrumColor1 = color1;
  audioPlayer.spectrumColor2 = color2;

  if(audioPlayer.adaptiveColors && !color2 ){
    color2 = (color1 === false)? audioPlayer.paletteColorsHex[0]: false;
    audioPlayer.spectrumColor2 = false;
  }

  if(audioPlayer.adaptiveColors && !color1){
    color1 = audioPlayer.paletteColorsHex[1];
    audioPlayer.spectrumColor1 = false;
  }

  if (color2) {
    // make the spectrum gradient colorized!
    if (spectroGradientDir === 'vertical'){
      var gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight); // vertical
    }else{
      const startPos = barsAlignment === 'left' ? 1 * (barWidth + barGap) : (canvas.width / 2) - ((barCount * (barWidth + barGap)) / 2) + (1 * (barWidth + barGap)) + (barGap/2);
      var gradient = ctx.createLinearGradient(startPos, 0, totalWidth+startPos, 0); // horizontal
    }
    gradient.addColorStop(0.25, color1);
    gradient.addColorStop(1, color2);
  }
  if (color1){
    spectrumColor = color1;
  }else{
    // make a rainbow gradient without any dynamic values
    var gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    var hues = [0, 60, 120, 180, 240, 300, 360];
    hues.forEach(function(hue, i) {
        gradient.addColorStop(i/hues.length, 'hsl(' + hue + ', 100%, 50%)');
    });
    spectrumColor = gradient;

    //define a default color1 for the spectroReflect below because its not defined yet
    color1 = '#ffffff';
  }

  
 // barsVerticalAlignment = 'middle';
  if (spectroReflect){
      barsVerticalAlignment = 'middle';
      srp_spectroReflect(ctx, canvas, 2.5, color1, color2 );
      ctx.lineWidth = barWidth;
  }else{
    if(color2 || spectroReflect){
      spectrumColor = gradient;
    }

    ctx.strokeStyle = spectrumColor;
    ctx.fillStyle = spectrumColor;
    ctx.imageSmoothingEnabled = true;
    ctx.lineWidth = barWidth;
  }

  if(spectroShadow){
    ctx.shadowColor = color1;
    ctx.shadowBlur = 10;
  }
  
  if(restart){
    initRenderFrame();
    return;
  }

  //GET THE MEDIA ELEMENT
  if(IRON.audioPlayer.stickyEnable){
    if (typeof myaudioElement !== 'undefined'){
      initRenderFrame();
      return;
    } 
    myaudioElement = document.getElementById('sonaar-audio')
  }else{
    if (typeof IRON.players[playerNum].audioElement !== 'undefined'){
      IRON.players[playerNum].audioElement = audioPlayer.find('audio')[0];
      initRenderFrame();
      return; 
    }
    IRON.players[playerNum].audioElement = audioPlayer.find('audio')[0];
    myaudioElement = IRON.players[playerNum].audioElement;
  }

  myaudioElement.crossOrigin = 'anonymous'

  //SET THE MEDIA ELEMENT AS THE SOURCE OF THE AUDIO CONTEXT AND CONNECT IT TO THE ANALYSER
  var sonaarAudioContext = new AudioContext();
  sonaarAudioContext.onstatechange = function() {
    if (sonaarAudioContext.state === 'suspended' || sonaarAudioContext.state === 'interrupted') { // Fix iOS Lockscreen issue
      sonaarAudioContext.resume();
    }
  };
  var analyser;

  player = IRON.audioPlayer.stickyEnable ? IRON.sonaar.player : IRON.players[playerNum];
  player.sonaarAnalyser = sonaarAudioContext.createAnalyser();
  analyser = player.sonaarAnalyser;
  
  var sonaarTrack = sonaarAudioContext.createMediaElementSource(myaudioElement);  
  sonaarTrack.connect(analyser)
  sonaarTrack.connect(sonaarAudioContext.destination)

  function initRenderFrame() {
    var frameAnimationCount = 0;
    player = IRON.audioPlayer.stickyEnable ? IRON.sonaar.player : IRON.players[playerNum];
    setTimeout(function(){
      $( '#' + canvasId ).parents('.srp_spectrum_container').removeClass('srp_hidden');
    }, 450);
    function renderFrame() {
      const frequencyBinCount = 1024;
      let data = new Uint8Array(frequencyBinCount);
      player.sonaarAnalyser.frequencyBinCount = frequencyBinCount;


      const canvasAnimation = requestAnimationFrame(renderFrame);
     
      if (spectroStyle !== 'string' && spectroStyle !== 'selectors') {
        player.sonaarAnalyser.getByteFrequencyData(data);
      } else {
        player.sonaarAnalyser.getByteTimeDomainData(data);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.clip();
     
    function scaleElements(data){
      // Function to scale the elements based on the frequency

      if (!selectors) return;

      for ( j = 0; j < selectors.length; j++) {
        let minOriginalScale;
        let maxScalePercent = selectorMaxScale; // adjust this value to control the maximum scale amount (10-100)
        let maxScale = 1 + (maxScalePercent / 100) * 0.2; // Calculate the maximum scale based on the percentage 1.12

        let originalScaleAmount = data[0];
        
        if(spectroStyle=='string' || spectroStyle=='selectors'){
          minOriginalScale = 128; // depending the spectro, they dont output the same frequency range so we need to adjust the minimum scale
        }else{
          minOriginalScale = 0;
        }
        let maxOriginalScale = 200;
        let minDesiredScale = 1;
        let maxDesiredScale = maxScale;
        let desiredScaleAmount = minDesiredScale + (originalScaleAmount - minOriginalScale) * (maxDesiredScale - minDesiredScale) / (maxOriginalScale - minOriginalScale);

        let newTransform = "scale(" + desiredScaleAmount + ")";
        document.querySelector(selectors[j]).style.transform = newTransform;
        
        if (selectorBlur === 'true'){
          let maxBlur = 1.1; // adjust this value to control the maximum blur amount
          let blurAmount = data[0] / 128 * maxBlur;
          if(data[0] < 129) {
            document.querySelector(selectors[j]).style.filter = 'blur(0px)';
          }else{
          document.querySelector(selectors[j]).style.filter = `blur(${blurAmount}px)`;
        }
        }
      }

    }
      
    scaleElements(data)

     if(spectroStyle === 'string'){
        /* 
        //
        // START OF STRINGGG SOUNDWAVE STYLE
        //
        */
        let vibration = 0.06 // adjust this value to control the amount of smoothing
        let previousX = 0; // keep track of the previous x value
        let previousY = (data[0] / 128) * canvas.height / 2; // keep track of the previous y value
        ctx.beginPath();
        
        ctx.lineWidth = barWidth;

        for(let i = 0; i < frequencyBinCount; i++) {
            let x = i / frequencyBinCount * canvas.width;
            let y = (data[i] / 128) * canvas.height / 2;
            x = previousX + vibration * (x - previousX); // apply exponential moving average to x
            y = previousY + vibration * (y - previousY); // apply exponential moving average to y
            previousX = x;
            previousY = y;

            if(i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
     
      }

      
      if (spectroStyle === 'bars' || spectroStyle === 'bricks') {
        /* 
        //
        // START OF BARS/BRICKS SOUNDWAVE STYLE
        //
        */
        for (let i = 0; i < barCount; i++) {  
          const amplitude = data[i];
          const percent = (pixelFx && barsVerticalAlignment !== 'middle' ) ? amplitude / 128 : amplitude / 256;
          const height = canvas.height * percent;
          if (barsVerticalAlignment === 'bottom') {
            var offset = (pixelFx) ? canvas.height : canvas.height - height - 1;
          } else if (barsVerticalAlignment === 'middle') {
            var offset = (pixelFx) ? canvas.height/2 : (canvas.height - height) / 2;;
          } else {
            var offset = 0;
          }

          if (barsAlignment === 'left') {
            var barX = i * (barWidth + barGap);
          } else if (barsAlignment === 'right') {
            var barX = canvas.width - ((barCount - i) * (barWidth + barGap)) - barWidth;
          } else {
            var barX = (canvas.width / 2) - ((barCount * (barWidth + barGap)) / 2) + (i * (barWidth + barGap));
          }
          
          if (pixelFx){
            blockHeight = blockHeight;
            for (let j = 0; j < height/2; j += blockHeight+blockGap) {
              const dotSize = (blockPointu) ? barWidth - (j * (barWidth / (height/2))) : barWidth;
              if(barsVerticalAlignment === 'bottom'){
                  
                      ctx.fillRect(barX + (barWidth / 2) - (dotSize / 2), offset - j - blockHeight - blockGap, dotSize, blockHeight);
                  
              }else{
                
                      ctx.fillRect(barX + (barWidth / 2) - (dotSize / 2), offset + j, dotSize, blockHeight);
                      ctx.fillRect(barX + (barWidth / 2) - (dotSize / 2), offset - j - blockHeight - blockGap, dotSize, blockHeight);
                  
              }

            }

          }else{
            ctx.fillRect(barX, offset, barWidth, height);
          }
        }
      } else if (spectroStyle === 'shockwave') {
          /* 
          //
          // START OF Shockwave style
          //
          */
          let maxAmplitude = Math.max(...data);
          let amplitudeFactor = canvas.height / (2 * maxAmplitude) *10;
          ctx.beginPath();
          ctx.moveTo(0, canvas.height/2);
          for (let i = 0; i < frequencyBinCount; i++) {
              const amplitude = data[i];
              const y = canvas.height/2 + (amplitude * amplitudeFactor) * 0.1 * Math.sin(i * shockWaveVibrance );
              ctx.lineTo(i, y);
          
          }
          ctx.stroke();
      }

      // Hide and Stop the animation according to the plugin sticky player settings
      if(isStickyPlayer &&  !IRON.sonaar.spectrumAnimation){
        audioPlayer.find('.srp_spectrum_container').addClass('srp_hidden');
        IRON.canvasAnimation = IRON.canvasAnimation.filter(function(el) {
          return el !== canvas.id;
        });
        cancelAnimationFrame(canvasAnimation)
       }

      if( ! isStickyPlayer && $('.iron-audioplayer').length && (
          (! audioPlayer.hasClass('sr_selectedPlayer') && IRON.audioPlayer.stickyEnable) ||
          (! audioPlayer.hasClass('sr_selected') && !IRON.audioPlayer.stickyEnable) ||
          (tracklistSpectrum && trackIndex >= 0 && audioPlayer.find('.sr-playlist-item.current').index() >= 0 && trackIndex != audioPlayer.find('.sr-playlist-item.current').index()) ||
          ! audioPlayer.spectrumAnimation ||
          ! $('#' + audioPlayer.attr('id') ).length // if the player is removed from the DOM
        )
      ){
        if(tracklistSpectrum){
          audioPlayer.find('.sr-playlist-item').eq(trackIndex).find('.srp_spectrum_container').addClass('srp_hidden')
        }else{
          audioPlayer.find('.srp_spectrum_container').addClass('srp_hidden');
        }
        
        IRON.canvasAnimation = IRON.canvasAnimation.filter(function(el) {
          return el !== canvas.id;
        });
        cancelAnimationFrame(canvasAnimation)
      }
  
      if ( myaudioElement.paused ) {//if media is paused during the animation during 50 frames, stop the animation
        frameAnimationCount++;
        if ( frameAnimationCount > 50 ) {
          if (myaudioElement.paused) {
            IRON.canvasAnimation = IRON.canvasAnimation.filter(function(el) {
              return el !== canvas.id;
            });
            cancelAnimationFrame(canvasAnimation);
          }
          frameAnimationCount = 0;
        }
      }
    }

    if (! IRON.canvasAnimation.includes(canvas.id) ) {
      IRON.canvasAnimation.push(canvas.id);
      renderFrame();
    }
    
  }

  ctx.restore();
  initRenderFrame();
}

function srp_spectroReflect(ctx, canvas, gapDistance, color1, color2 ){

  let objectHeight = canvas.height; // height of the object
  let colorStop1 = (gapDistance / objectHeight) + 0.5;
  var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height); // vertical
  gradient.addColorStop(0, color1);
  if (color2) {
      gradient.addColorStop(0.5, color2);
      gradient.addColorStop(0.5, srp_parseColor(color2, 0));
      gradient.addColorStop(colorStop1, srp_parseColor(color2, 0));
      gradient.addColorStop(colorStop1, srp_parseColor(color2, 0.4));
  }else{
    gradient.addColorStop(0.5, color1);
    gradient.addColorStop(0.5, srp_parseColor(color1, 0));
    gradient.addColorStop(colorStop1, srp_parseColor(color1, 0));
    gradient.addColorStop(colorStop1, srp_parseColor(color1, 0.4));
  }
  gradient.addColorStop(1, srp_parseColor(color1, 0));

  ctx.strokeStyle = gradient;
  ctx.fillStyle = gradient;
}
function srp_parseColor(color, alpha) {
  // Ensure that alpha is a value between 0 and 1
  alpha = Math.min(Math.max(alpha, 0), 1);
  if (color.startsWith("#")) {
    if (color.length === 9) {
        // extract the original alpha value
        let original_alpha = parseInt(color.slice(-2), 16);
        // calculate the new alpha value
        alpha = (Math.round(original_alpha * alpha) * 100 / 25500).toFixed(2); 
    }
  }else if(color.startsWith("rgba(")) {
    // RGBA color code
    let values = color.slice(5, -1).split(",");
    values[3] = (values[3] * alpha).toFixed(2); 
    return "rgba(" + values.join(",") + ")";
  } else {
    throw new Error("Unsupported color format: " + color);
  }
  result =  "rgba(" + parseInt(color.slice(1, 3), 16) + ", " + parseInt(color.slice(3, 5), 16) + ", " + parseInt(color.slice(5, 7), 16) + ", " + alpha + ")";
  return result;
}
function srp_getColorsFromImage(audioPlayer,artworkUrl) {
  var affectSticky = (sonaar_music.option.sticky_player_disable_adaptive_colors === 'true') ? false : true; // Set to true or false based on your requirement


  if(!audioPlayer.adaptiveColors){
    $('#srp_stickyplayer').remove();

    audioPlayer.prevAll('style:not(#srp-widget-player-style)').remove();
    return;
  } 

  if(artworkUrl == null || artworkUrl == ''){
    setTimeout(function() {
      $(audioPlayer).css("opacity", 1);
      return;
    }, 1000);
  }
  
  
  const colorThief = new ColorThief();
  const img = new Image();

  img.addEventListener('load', function() {
  
    paletteColors = colorThief.getPalette(img, 5);
    
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
    
    //convert all palette colors to hex
    audioPlayer.paletteColorsHex = [];
    for (var i = 0; i < paletteColors.length; i++) {
      var color = rgbToHex(paletteColors[i][0], paletteColors[i][1], paletteColors[i][2]);
      audioPlayer.paletteColorsHex.push(color);
    }

    if(audioPlayer.adaptiveColors == 'random'){
    // randomize the paletteColorsHex array
      audioPlayer.paletteColorsHex = audioPlayer.paletteColorsHex.sort(function() { return 0.5 - Math.random() });
    }else if(audioPlayer.adaptiveColors == '2'){
      // reverse the colors
      audioPlayer.paletteColorsHex = audioPlayer.paletteColorsHex.reverse();
    }else if(audioPlayer.adaptiveColors == '3'){
      //move the first color to the last position
      audioPlayer.paletteColorsHex.push(audioPlayer.paletteColorsHex.shift());
    }else if(audioPlayer.adaptiveColors == '4'){
      // move second color to the first position
      audioPlayer.paletteColorsHex.unshift(audioPlayer.paletteColorsHex[1]);
    }

    function getContrastColor(color) {
      var luma = (color.charAt(0) === '#')
        ? (0.2126 * parseInt(color.slice(1, 3), 16) + 0.7152 * parseInt(color.slice(3, 5), 16) + 0.0722 * parseInt(color.slice(5, 7), 16))
        : (0.2126 * parseInt(color.slice(0, 2), 16) + 0.7152 * parseInt(color.slice(2, 4), 16) + 0.0722 * parseInt(color.slice(4, 6), 16));
      return (luma < 130) ? '#fff' : '#000';
    }
    
    var foregroundColor = getContrastColor(audioPlayer.paletteColorsHex[0]);
    var paletteColorsHex_1_contrast = getContrastColor(audioPlayer.paletteColorsHex[1]);

    //create a darker color function
    function darkerColor(color, percent) {
      var num = parseInt(color.replace("#",""),16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
      return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    }
    //create a lighter color function
    function lighterColor(color, percent) {
      var num = parseInt(color.replace("#",""),16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = (num >> 8 & 0x00FF) + amt,
      B = (num & 0x0000FF) + amt;
      return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    }

    /*
    //----------------
    // START DEBUG //
    //----------------
    //delete color-square
    audioPlayer.find('.color-square').remove();    
    // create small square color from paletteColorsHex and display them relative to the audioplayer
    var colorSquare = '';
    for (var i = 0; i < audioPlayer.paletteColorsHex.length; i++) {
      colorSquare += '<div class="color-square" style="display:inline-block;z-index:1000;width:25px;height:25px;top:-100px;background-color:'+audioPlayer.paletteColorsHex[i]+'"></div>';
    }    
    // add colorsquare in iron_widget_radio
    audioPlayer.prepend(colorSquare);
    //----------------
    // END DEBUG //
    //----------------
    */

    if (! (audioPlayer.adaptiveColorsFreeze == true && $('#srp_stickyplayer').attr('data-player-source') == audioPlayer.id) ){
      $('#srp_stickyplayer').remove();
      audioPlayer.prevAll('style').not('#srp-widget-player-style').remove();

      //create style in the head
      $('head').append('<style id="srp_stickyplayer" data-player-source="' + audioPlayer.id + '"></style>');
      audioPlayer.before('<style></style>');
    }
    
    player_uid = '[data-id="' + audioPlayer.data('id') + '"] ';
    player_floated = (audioPlayer.data('playertemplate') == 'skin_float_tracklist') ? true : false;

    const cssColor = [
      {
        target: '\
        div#sonaar-player .control div,\
        div#sonaar-player .playlist,\
        div#sonaar-player .playlist .tracklist li.active span,\
        div#sonaar-player .playlist .title,\
        div#sonaar-player .playlist .tracklist li a,\
        div#sonaar-player .sricon-volume,\
        div#sonaar-player .player .sr_progressbar_sticky .timing,\
        div#sonaar-player .player .store .track-store li a,\
        div#sonaar-player .sonaar-extend-button,\
        .srmp3_singning p[begin]:not(.srmp3_lyrics_read ~ p),\
        .playlist .audio-track .sricon-play,\
        .playlist li.current .audio-track,\
        .playlist li.current .track-number,\
        .playlist li.current .audio-track .srp_trackartist,\
        .srp-play-button .sricon-play,\
        .sr_progressbar .currentTime,\
        .sr_progressbar .totalTime,\
        .srp_player_boxed .srp_noteButton,\
        .playlist .srp_pagination, .srp_ellipsis,\
        .srp_pagination_container .srp_pagination_arrows,\
        .album-store,\
        .album-player .album-title, .album-player .track-title,\
        div#sonaar-player .srp_ext_control,\
        div#sonaar-player .srp_ellipsis_btn, div#sonaar-player .srp_collapse_btn,\
        .control',
        css: 'color',
        value: audioPlayer.paletteColorsHex[1]
      },
      {
        target: '\
        div#sonaar-player,\
        div#sonaar-player .playlist,\
        div#sonaar-player .player .sr_progressbar_sticky .volume .slider-container,\
        div#sonaar-player.sr-float .playlist,\
        div#sonaar-player.sr-float .close.btn-player,\
        div#sonaar-player.sr-float .player.sr-show_controls_hover .playerNowPlaying,\
        div#sonaar-player .srp_extendedPlayer_container .srp_extendedPlayer,\
        div#sonaar-player .srp_extendedPlayer_container .srp_ext_overlay_panel,\
        div#sonaar-player .srp_extendedPlayer_container .srp_ext_section,\
        .srp_note',
        css: 'background-color',
        value: audioPlayer.paletteColorsHex[0]
      },
      {
        target: '\
        .album-player,\
        .srp_track_description,\
        .playlist li .audio-track,\
        .playlist li .audio-track .srp_trackartist,\
        .playlist li .track-number,\
        .srp_search_container .fa-search,\
        .srp_search_container .srp_search,\
        .sr_it-playlist-publish-date,\
        .srp_playlist_duration,\
        .srp_trackCount,\
        .srp_note,\
        div#sonaar-player,\
        #sonaar-modal div.sr_popup-content,\
        div#sonaar-player .playlist .tracklist li span,\
        div#sonaar-player .srp_ext_overlay_panel,\
        div#sonaar-player .srp_extendedPlayer_container .srp_ext_overlay_panel .srp-fav-bt,\
        div#sonaar-player .srp_extendedPlayer_container .srp-fav-bt,\
        div#sonaar-player .srp_ext_featured_cta,\
        div#sonaar-player .metadata-inner',
        css: 'color',
        value: foregroundColor
      },
      {
        target: '#sonaar-modal .srp-modal-variation-list .srp-modal-variant-selector',
        css: 'background-color',
        value: darkerColor(audioPlayer.paletteColorsHex[0],5)
      },
      {
        target: '.srp_player_boxed, .playlist .sr-playlist-item,div#sonaar-player .player, #sonaar-player .mobilePanel, div#sonaar-player .player .player-row:before, div#sonaar-modal div.sr_popup-content',
        css: 'background-color',
        value: darkerColor(audioPlayer.paletteColorsHex[0],15)
      },
      {
        target: '\
        @media only screen and (max-width: 1025px){div#sonaar-player .store}',
        css: 'background-color',
        value: darkerColor(audioPlayer.paletteColorsHex[0],15)
      },
      {
        target: '.srp_note',
        css: 'background-color',
        value: darkerColor(audioPlayer.paletteColorsHex[0],18)
      },
      {
        target: '.sr-cf-heading',
        css: 'background-color',
        value: darkerColor(audioPlayer.paletteColorsHex[0],30)
      },
      {
        target: '.sr-cf-heading',
        css: 'border-color',
        value: darkerColor(audioPlayer.paletteColorsHex[0],30)
      },
      {
        target: '.sr-playlist-heading-child',
        css: 'color',
        value: lighterColor(audioPlayer.paletteColorsHex[0],10)
      },
      {
        target: '.playlist .sr-playlist-item:hover, .playlist .sr-playlist-item.current',
        css: 'background-color',
        value: darkerColor(audioPlayer.paletteColorsHex[0],20)
      },
      {
        target: '.srp_search_container .srp_search',
        css: 'background-color',
        value: lighterColor(audioPlayer.paletteColorsHex[0],15)
      },
      {
        target: '.sr-playlist-cf-container',
        css: 'color',
        value: foregroundColor
      },
      {
        target: '.sr-playlist-cf-container',
        css: 'opacity',
        value: 0.6
      },
      {
        target: 'div.srp-play-circle,.srp_pagination_container .srp_pagination_arrows,.control .sr_speedRate div,div#sonaar-player div.sr_speedRate div,div#sonaar-player .close.btn_playlist:before,div#sonaar-player .close.btn_playlist:after,\
        div#sonaar-player .srp_extendedPlayer_container .srp_ext_overlay_panel .close',
        css: 'border-color',
        value: audioPlayer.paletteColorsHex[1]
      },
      
      {
        target: '\
        .playlist a.song-store:not(.sr_store_wc_round_bt),\
        .srp_noteButton .sricon-info',
        css: 'color',
        value: audioPlayer.paletteColorsHex[2]
      },
      {
        target: '.srp_track_description',
        css: 'opacity',
        value: 0.5
      },
      {
        target: '\
        .sr_it-playlist-title, div#sonaar-player .playlist button.play, div#sonaar-player .close.btn-player,div#sonaar-player div.sr_speedRate div,.control .sr_speedRate div,.srp_pagination_container .srp_pagination .active span,.srp-play-button-label-container,\
        #sonaar-player .srp_extendedPlayer_container .srp_extendedPlayer .srp_ext_featured_cta .srp_ext_cta_addtocart, #sonaar-player .srp_extendedPlayer_container .srp_extendedPlayer .srp_ext_featured_cta .srp_ext_cta_buynow',
        css: 'color',
        value: audioPlayer.paletteColorsHex[0]
      },
      {
        target: '\
        #sonaar-modal .srp_button, #sonaar-modal .srp-modal-variation-list .srp-modal-variant-selector:hover,\
        #sonaar-modal .srp-modal-variation-list .srp-modal-variant-selector.srp_selected,\
        .srp_pagination_container .srp_pagination .active span,.srp-play-button-label-container,\
        div#sonaar-player .playlist button.play,div#sonaar-player .mobileProgressing:after,\
        div#sonaar-player .progressDot,div#sonaar-player div.sr_speedRate div,\
        .control .sr_speedRate div,\
        #sonaar-player .srp_extendedPlayer_container .srp_extendedPlayer .srp_ext_featured_cta .srp_ext_cta_addtocart,\
        #sonaar-player .srp_extendedPlayer_container .srp_extendedPlayer .srp_ext_featured_cta .srp_ext_cta_buynow',
        css: 'background-color',
        value: audioPlayer.paletteColorsHex[1]
      },
      {
        target: '#sonaar-modal .srp_button, #sonaar-modal .srp-modal-variation-list .srp-modal-variant-selector:hover, #sonaar-modal .srp-modal-variation-list .srp-modal-variant-selector.srp_selected',
        css: 'color',
        value: paletteColorsHex_1_contrast
      },
      {
        target: '.buttons-block .store-list li .button, .song-store.sr_store_wc_round_bt',
        css: 'color',
        value: paletteColorsHex_1_contrast
       
      },
      {
        target: '.buttons-block .store-list li .button,.song-store.sr_store_wc_round_bt',
        css: 'background-color',
        value: audioPlayer.paletteColorsHex[1]
      },
      {
        target: 'div#sonaar-player .close.btn-player,div#sonaar-player .mobileProgress',
        css: 'background-color',
        value: audioPlayer.paletteColorsHex[3]
      },
      {
        target: 'div#sonaar-player .player',
        css: 'border-color',
        value: audioPlayer.paletteColorsHex[3]
      },
      {
        target: 'div#sonaar-player .player div.mobilePanel',
        css: 'border-color',
        value: darkerColor(audioPlayer.paletteColorsHex[0],15)
      },
    ];
    
    if(	Boolean(sonaar_music.option.waveformType === 'simplebar') ){
      cssColor.push(
        {
          target: 'div#sonaar-player .sonaar_fake_wave .sonaar_wave_cut',
          css: 'background-color',
          value: audioPlayer.paletteColorsHex[3]
        },
        {
          target: 'div#sonaar-player .sonaar_fake_wave .sonaar_wave_base',
          css: 'background-color',
          value: audioPlayer.paletteColorsHex[1]
        },
      )
    }
    
    if(player_floated){
      cssColor.push(
        {
          target: '.playlist, .playlist .sr-playlist-item',
          css: 'background-color',
          value: 'unset',
          skin: 'floated'
        },
        {
          target: '.album-player .album-title, .album-player .srp_trackartist, .sr_progressbar .currentTime, .sr_progressbar .totalTime',
          css: 'color',
          value: audioPlayer.paletteColorsHex[3],
          skin: 'floated'
        },
        {
          target: '.album-player .track-title, .control, .control .sricon-play',
          css: 'color',
          value: lighterColor(audioPlayer.paletteColorsHex[3],25),
          skin: 'floated'
        },
        {
          target: '.sr_it-playlist-title, .srp_subtitle, .srp_noteButton .sricon-info, .playlist li .audio-track, .playlist li .audio-track .srp_trackartist, .playlist li .track-number, .srp_track_description',
          css: 'color',
          value: audioPlayer.paletteColorsHex[1],
          skin: 'floated'
        },
        {
          target: '.playlist .audio-track .sricon-play',
          css: 'color',
          value: lighterColor(audioPlayer.paletteColorsHex[1],20),
          skin: 'floated'
        },
        {
          target: '',
          css: 'background-color',
          value: 'unset',
          skin: 'floated'
        },
      );
    }

    for (let i = 0; i < cssColor.length; i++) {
      var skin_prefix = '';
      if(cssColor[i]['skin'] === 'floated'){
        skin_prefix = '[data-playertemplate="skin_float_tracklist"]';
      }
      //Check if cssColor[i] contains value with , if yes, split it and add it to the array
      if(cssColor[i]['target'].indexOf(',') != -1){
        var cssColorValue = cssColor[i]['target'].split(',');
        for (let j = 0; j < cssColorValue.length; j++) {
          if(affectSticky && cssColorValue[j].indexOf('#sonaar-') != -1 ){
            $('#srp_stickyplayer').append(cssColorValue[j] + '{' + cssColor[i]['css'] + ':' + cssColor[i]['value'] + ';transition: all 600ms;}');
          }else{
            audioPlayer.prev('style').append(skin_prefix + player_uid + cssColorValue[j] + '{' + cssColor[i]['css'] + ':' + cssColor[i]['value'] + ';transition:' + cssColor[i]['css'] + ' 600ms;}');
          }
        }
      }else{
        if(affectSticky && cssColor[i]['target'].indexOf('#sonaar-') != -1){
          $('#srp_stickyplayer').append(cssColor[i]['target'] + '{' + cssColor[i]['css'] + ':' + cssColor[i]['value'] + ';transition: all 600ms;}');
        }else{
          audioPlayer.prev('style').append(skin_prefix + player_uid + cssColor[i]['target'] + '{' + cssColor[i]['css'] + ':' + cssColor[i]['value'] + ';transition:' + cssColor[i]['css'] + ' 600ms;}');
        }
      }
    }
    if( !$(audioPlayer).hasClass('srp_tracklist_grid') ){
      audioPlayer.prev('style').append(player_uid + '.playlist{background-color:' + darkerColor(audioPlayer.paletteColorsHex[0],10) + ';}');
    }
     
    //check if audioPlayer contains a gradient (set with background-image) but not an image url
    if (audioPlayer.find('.srp_player_boxed').length && audioPlayer.find('.srp_player_boxed').css('background-image') != 'none' && audioPlayer.find('.srp_player_boxed').css('background-image').indexOf('url') == -1) {
      audioPlayer.prev('style').append(player_uid + '.srp_player_boxed{background-image:linear-gradient(0deg,' + darkerColor(audioPlayer.paletteColorsHex[4], 25) + ' 0%, ' + darkerColor(audioPlayer.paletteColorsHex[0],20) + ' 100%)!important;');
      if(affectSticky){
        $('#srp_stickyplayer').append('#sonaar-player .player{background-image:linear-gradient(45deg,' + darkerColor(audioPlayer.paletteColorsHex[4], 25) + ' 0%, ' + darkerColor(audioPlayer.paletteColorsHex[0],20) + ' 100%)');
      }
    }
  
    if(typeof audioPlayer.spectrumColor1 !== 'undefined' && !audioPlayer.spectrumColor1 && typeof audioPlayer.spectrumColor2 !== 'undefined' && !audioPlayer.spectrumColor2){
     
      let color1 = (audioPlayer.spectrumColor1) ? audioPlayer.spectrumColor1 : audioPlayer.paletteColorsHex[0];
      let color2 = (audioPlayer.spectrumColor2) ? audioPlayer.spectrumColor2 : audioPlayer.paletteColorsHex[2];

      $('.srp_spectrum').each(function () {
        const canvas = this;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height); // vertical
        gradient.addColorStop(0.25, color1);
        gradient.addColorStop(1, color2);
        ctx.fillStyle = gradient;
        ctx.strokeStyle = gradient;
        if( 
          $(this).parents('#sonaar-player').length && sonaar_music.option.sticky_spectro_reflect === "true" ||
          ! $(this).parents('#sonaar-player').length && audioPlayer.spectroReflect
        ){
          srp_spectroReflect(ctx, canvas, 2.5, color1, color2);
        }
        
      })
    }

    if(audioPlayer.attr('data-wave-color') == false){
      audioPlayer.soundwaveColorBG = audioPlayer.paletteColorsHex[2];
     // audioPlayer.find('.sonaar_wave_base').css('background-color',audioPlayer.paletteColorsHex[2]);
    }
    if(audioPlayer.attr('data-wave-progress-color') == false){
      audioPlayer.soundwaveProgressColor = audioPlayer.paletteColorsHex[1];
      //audioPlayer.find('.sonaar_wave_cut').css('background-color',audioPlayer.paletteColorsHex[1]);
    }

    IRON.createFakeWave(audioPlayer, false);

    if(IRON.audioPlayer.stickyEnable && IRON.sonaar.player.list.tracks.length) IRON.createFakeWave(false, true);

    if(audioPlayer.adaptiveColorsFreeze == true){
      audioPlayer.adaptiveColorsSet = true;
    }
    // set timeout of 1 second to allow the image and colors to be loaded because of the color transition effect.
    setTimeout(function() {
      $(audioPlayer).css("opacity", 1);
    }, 1000);
  });

  img.crossOrigin = 'anonymous';
  img.src = artworkUrl;
}
IRON.audioPlayer = (function ($) {
  "use strict";
  var seekTimeOut;
  var autoplayEnable;
  var audioPlayer;
  var playlist;
  var stickyEnable = false;
  var random_order = false;
 
  function setMediaSessionAPI(trackTitle, albumTitle, artistName, albumArt) {
    //WIP: Does not work with the mini-player play button. Works only when click in the tracklist.
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackTitle,
        artist: albumTitle, // We want to show album Title instead of artist name in the Notification
        album: albumTitle,
        artwork: [
          { src: albumArt, sizes: '512x512', type: 'image/jpeg' },
        ]
      });
    }
  }
  function initPlayer(player) {
    audioPlayer = player;

    if(typeof player.params == 'undefined'){
      player.params = {};
    }
    this.audioPlayer = player;

   
    var waveContainer = this.audioPlayer.find(".player .wave").attr("id");
    playlist = audioPlayer.find(".playlist .srp_list")
    playlist.children(":not(li)").remove(); // woocommerce shop page insert a unwanted <a> tag in the playlist who cause a bug with the track index.
    this.playlist = playlist;
    this.autoplayEnable = audioPlayer.data("autoplay");
    audioPlayer.spectrumColor1 = false;
    audioPlayer.spectrumColor2 = false;
    audioPlayer.id = audioPlayer.data("id");
    audioPlayer.pagination_offset = parseInt(audioPlayer.attr("data-pagination_scroll_offset"), 10);
    audioPlayer.albums = audioPlayer.data("albums");
    audioPlayer.remove_wave = audioPlayer.data("no-wave");
    audioPlayer.shuffle = audioPlayer.data("shuffle") || false;
    audioPlayer.stickyPlayer = IRON.audioPlayer.stickyEnable;
    audioPlayer.notrackskip = audioPlayer.data("notrackskip");
    audioPlayer.playerType = audioPlayer.data("playertemplate");
    audioPlayer.hide_progressbar = audioPlayer.data("hide-progressbar") ? true : false;
    audioPlayer.adaptiveColors = audioPlayer.data("adaptive-colors");
    audioPlayer.adaptiveColorsFreeze = audioPlayer.data("adaptive-colors-freeze");
    audioPlayer.lazy_load = audioPlayer.data("lazyload");
    audioPlayer.progressType = audioPlayer.data("progress-bar-style");
    audioPlayer.setTrackSoundwaveCursor = audioPlayer.data("track-sw-cursor");
    audioPlayer.trackMemory = audioPlayer.hasClass('srp_track_memory');

    // Define an async function for the fetch operation

    audioPlayer.listJs = (audioPlayer.hasClass('srp_linked') || audioPlayer.find('.srp_search_container').length || audioPlayer.find('.sr-cf-heading').length || audioPlayer.find('.srp_pagination').length); //If Linked to a search or filter widget || If the current Player has a Search Input || If the current Player has CF Columns || Pagination is acitvated
    
    audioPlayer.list = {};
    audioPlayer.list.tracks = [];

    if(audioPlayer.trackMemory){
      IRON.localStorageTrackMemory = (localStorage.getItem('srp_tracks_memories') == null) ? {} : JSON.parse(localStorage.getItem('srp_tracks_memories'));
    }

    playlist.find(".sr-playlist-item").each(function () {
        var $track = $(this);
        var trackData = {
            peakFile:             $track.data("peakfile"),
            mp3:                  $track.data("audiopath"),
            sourcePostID:         $track.data("post-id"),
            id:                   $track.data("trackid"), // Its the media attachment ID if set.
            track_pos:            $track.data("track-pos"),
            isPreview:            $track.data("is-preview"),
            peak_allow_frontend:  $track.data("peakfile-allow"),
            artwork:              $track.data("artwork"),
        };
        audioPlayer.list.tracks.push(trackData);
    });

    $('.iron-audioplayer .srp_repeat').attr('data-repeat-status', IRON.repeatStatus);
    $('.iron-audioplayer .srp_repeat').attr('title', IRON.repeatToolTipLabel());

    setTrackSoundwaveCursor(audioPlayer);

    if(!audioPlayer.adaptiveColors){
      $(audioPlayer).css("opacity", 1);
    }
    sr_setPopUp();//set Popup, required for the store-content popup
    if (audioPlayer.shuffle) {
      var trackNumber = Math.floor(Math.random() * playlist.find("li").length);
    } else {
      var trackNumber = playlist.find("li").not('[data-relatedtrack="1"]').index();
    }
    random_order = setRandomList(playlist.find("li"), trackNumber);

    if (audioPlayer.data("scrollbar")) {
      var scrollItem = $(audioPlayer).find(".playlist .srp_list")[0];

      var ps = new PerfectScrollbar(scrollItem, {
        wheelSpeed: 0.7,
        swipeEasing: true,
        wheelPropagation: false,
        minScrollbarLength: 20,
        suppressScrollX: true,
        maxScrollbarLength: 100,
      });
      //$('.iron-audioplayer .playlist ul').perfectScrollbar({'suppressScrollX': true});
    }
    if (audioPlayer.data("wave-color") == false) {
      audioPlayer.soundwaveColorBG = (audioPlayer.soundwaveColorBG === '' || typeof audioPlayer.soundwaveColorBG == 'undefined') ? sonaar_music.option.music_player_timeline_color : audioPlayer.soundwaveColorBG;
    } else {
      audioPlayer.soundwaveColorBG = (audioPlayer.soundwaveColorBG === '' || typeof audioPlayer.soundwaveColorBG == 'undefined') ? audioPlayer.data("wave-color") : audioPlayer.soundwaveColorBG;
    }
    if (audioPlayer.data("wave-progress-color") == false) {
      audioPlayer.soundwaveProgressColor = (audioPlayer.soundwaveProgressColor === '' || typeof audioPlayer.soundwaveProgressColor == 'undefined') ? sonaar_music.option.music_player_progress_color : audioPlayer.soundwaveProgressColor;   
    } else {
      audioPlayer.soundwaveProgressColor = (audioPlayer.soundwaveProgressColor === '' || typeof audioPlayer.soundwaveProgressColor == 'undefined') ? audioPlayer.data("wave-progress-color") : audioPlayer.soundwaveProgressColor;   
    }

    this.$audio_el = $("#" + waveContainer).find(".sonaar_media_element")[0];
    fakeWaveUpdate(this.$audio_el, audioPlayer, playlist);
    $(audioPlayer).find(".wave").css("opacity", "1");
    
    setPlaylist(playlist, this.$audio_el, audioPlayer);

    if (audioPlayer.shuffle) {
      var trackNumber = random_order[0];
    } else {
      var trackNumber = playlist.find("li").not('[data-relatedtrack="1"]').index();
    }
    var track = playlist.find("li").eq(trackNumber);
    $(audioPlayer).attr("trackselected", trackNumber);

    if(!IRON.audioPlayer.stickyEnable && !audioPlayer.hasClass('audio-playing') || IRON.audioPlayer.stickyEnable){ //Dont update the mini player if the player is already playing a track from another ajax page
      setCurrentTrack(track, trackNumber, audioPlayer, this.$audio_el);
      updateMiniPlayer(audioPlayer, track);
    }
    audioPlayer.find('.sr_it-playlist-publish-date').text(track.data('date'));
    if(track.data('tracktime')){
      audioPlayer.find('.totalTime').text('-' + track.data('tracktime'));
    }
    setControl(this.$audio_el, audioPlayer, playlist);
    
    if (audioPlayer.data("autoplay")) {
      autoplayEnable = true;
    }

    sr_playerCTAresponsive();
    sr_initSlider(audioPlayer.find('.slider-container .slide'), audioPlayer, this.$audio_el);
    srp_js_dynamic_style(audioPlayer);
    IRON.favorites.setFavButtons(audioPlayer);

    srp_setTrackListColumns(audioPlayer);
    
    if(typeof sonaar_music.option.general_volume != 'undefined' ){
      if( getCookieValue("sonaar_mp3_player_volume") != '' && IRON.audioPlayer.stickyEnable){
        sr_getCookieVolume();
      }else{
        sr_setVolume(sonaar_music.option.general_volume/100, audioPlayer, this.$audio_el);
      }
    }else{
      sr_setVolume(1, audioPlayer, this.$audio_el);
    } 

    if( audioPlayer.find('.srp_swiper').length && typeof audioPlayer.swiper == 'undefined' && typeof Swiper != 'undefined' ){
      const numberOfSlidesRequiredForVirtual = 20;
      const selectedTrack = function(){
        if( audioPlayer.find('.srp_swiper').data('swiper-source') == 'track' ){
          var slideId = audioPlayer.attr('trackselected');
        }else{
          var slideId = $(audioPlayer).find('.sr-playlist-item').eq(audioPlayer.attr('trackselected')).data('post-id');
        }
        var initialSlideIndex = $(audioPlayer).find('.swiper-slide[data-slide-id="' + slideId + '"]').index();
        return initialSlideIndex;
      }

      const setVirtualExtraSlides = function(){
        var extraSlidestValue = 3; //default value for ['virtual']['addSlidesAfter']  and ['virtual']['addSlidesAfter'] 
        if( typeof parameters['slidesPerView'] != 'undefined' && typeof parameters['loop'] != 'undefined' && parameters['loop'] == true){
          const numberOfSlide = $(audioPlayer).find('.swiper-slide').length;
          while (numberOfSlide < (parameters['slidesPerView'] + (extraSlidestValue*3))*2 && extraSlidestValue > 0 ) {
            extraSlidestValue--; 
          }
        }
        return extraSlidestValue;
      }


      var parameters =  eval('(' +audioPlayer.find('.srp_swiper').data('params')+ ')')
      if( typeof parameters['navigation'] != 'undefined' && parameters['navigation'] != false ){
        if( parameters['navigation'] == true ){
          parameters['navigation'] = {};
        }
        if( typeof parameters['navigation']['nextEl'] == 'undefined' || typeof parameters['navigation']['nextEl'] != 'undefined' && parameters['navigation']['nextEl'] == '.srp_swiper-button-next'){
          parameters['navigation']['nextEl'] = '.iron-audioplayer[data-id="' + audioPlayer.id + '"] .srp_swiper-button-next'; //Add the player id to the next button
        }
        if( typeof parameters['navigation']['prevEl'] == 'undefined' || typeof parameters['navigation']['prevEl'] != 'undefined' && parameters['navigation']['prevEl'] == '.srp_swiper-button-prev'){
          parameters['navigation']['prevEl'] = '.iron-audioplayer[data-id="' + audioPlayer.id + '"] .srp_swiper-button-prev'; //Add the player id to the prev button
        }
      }
      if( typeof parameters['pagination'] != 'undefined' && typeof parameters['pagination']['el'] != 'undefined' && parameters['pagination']['el'] == '.swiper-pagination'){
        parameters['pagination']['el'] = '.iron-audioplayer[data-id="' + audioPlayer.id + '"] .swiper-pagination'; //Add the player id to the pagination
      }
      if( typeof parameters['initialSlide'] == 'undefined' ){
        parameters['initialSlide'] = selectedTrack(); 
      }
      
      if( $(audioPlayer).find('.swiper-slide').length > numberOfSlidesRequiredForVirtual && audioPlayer.shuffle != true){
        if( typeof parameters['virtual'] == 'undefined' ){
          parameters['virtual'] = {};
          parameters['virtual']['enabled'] = true;
          parameters['virtual']['addSlidesAfter'] = setVirtualExtraSlides();
          parameters['virtual']['addSlidesBefore'] = setVirtualExtraSlides();
        } 
      }else{
        parameters['virtual'] = false;
      }

      if( audioPlayer.find('.srp_swiper').data('init') !== 'true' ){

        audioPlayer.swiper = new Srp_swiper(audioPlayer.find('.srp_swiper')[0], parameters);
  
        const playerEl = audioPlayer;
        audioPlayer.swiper.on('transitionEnd', function() { 
          if (!IRON.swiper.isTransitionEnd) {
            IRON.swiper.isTransitionEnd = true;
            IRON.swiper.showHiddenSlide( playerEl);
          }
        });
        IRON.swiper.showHiddenSlide( audioPlayer);
        audioPlayer.find('.srp_swiper').data('init', 'true');
        if( typeof parameters['autoplay'] != 'undefined' && parameters['autoplay'] !== false){
          audioPlayer.swiper.autoplay.start(); //Force autoplay to start when the player is loaded and the params autoplay is set to true. The autoplay is not working when we change player option in the elementor editor
        }
      }
    }
    if(typeof IRON.favorites.favoritesEnabled != 'undefined' && IRON.favorites.favoritesEnabled){ //If favorites list is already loaded
      audioPlayer.removeClass('srp_favorites_loading');
    }
   
    if(audioPlayer.trackMemory){
      const singleTrack = audioPlayer.find('.sr-playlist-item').eq(Number(audioPlayer.attr('trackselected')));
      if(singleTrack.length){
        const trackMemoryKey = IRON.getTrackMemoryKeyFormat(singleTrack.data('audiopath'));
        if(typeof IRON.localStorageTrackMemory[trackMemoryKey] == 'object'){
          const [currentTime, duration] = IRON.localStorageTrackMemory[trackMemoryKey];
          var $audio_el =  audioPlayer.find('.album-player .sonaar_media_element')[0];
          $audio_el.currentTime = currentTime;
          
          audioPlayer.find('.album-player .sonaar_wave_cut').width((currentTime / duration) * 100 + "%");
          setTimeCurrentTime(audioPlayer, $audio_el.currentTime)
        }
        singleTrack.data( 'track-memory-key', trackMemoryKey );
      }
    }
    


    checkIfResult(audioPlayer);
  }

  /* triggerPlay is called everytime NEW track (only) is clicked to play, and NOT on page load */
  var triggerPlay = function (audioPlayer) {
    if(audioPlayer.hasClass('srp_player_spectrum') && !IRON.audioPlayer.stickyEnable){
      const playerNum = srp_convertPlayerIdToPlayerNum(audioPlayer.attr('id'))
      if(typeof IRON.players[playerNum].audioElement == 'undefined'){
        startAudioSpectrum(audioPlayer);
      }else{
        startAudioSpectrum(audioPlayer, false, true);
      }
    }
  };
  
  function setSingleMetaHeadingInMiniplayer($source, $target) {
    if ($target.length) {
      $target.html('').hide(); // Empty the current field when we switch track
      if ((typeof $source !== 'undefined') && $source.length) {
        $target.html( $target.attr('data-prefix') + ' ' + $source).show();
      }
    }
  }
  
  /* setCurrentTrack is called on load before audio playing AND on play */
  function setCurrentTrack(track, index, audioPlayer, $audio_el) {
  
    audioPlayer.currentTrack = index; 
    
    if(typeof IRON.sonaar.player.selectedPlayer === 'undefined' || IRON.sonaar.player.selectedPlayer === null){
      IRON.getIceCastInfo(audioPlayer);
    }

    var albumArt = audioPlayer.find(".album .album-art");
    var albumReleaseDate = audioPlayer.find(".srp_subtitle");
    var artworkUrl = (typeof audioPlayer.data('albumart') != 'undefined')? audioPlayer.data('albumart'): track.data('albumart');

    if (audioPlayer.data('hide-artwork') != '1' && audioPlayer.data('hide-artwork') != 'true') {
      if (artworkUrl) {
        audioPlayer.removeClass('sonaar-no-artwork');
        if (albumArt.find("img").length) {
          albumArt.find("img").attr("src", artworkUrl);
        } else {
          albumArt.css("background-image", "url(" + artworkUrl + ")");
        }
      } else {
        audioPlayer.addClass('sonaar-no-artwork');
      }

    }
    


    srp_getColorsFromImage(audioPlayer,artworkUrl);
    


    if (!audioPlayer.hasClass("show-playlist")) {
      albumArt.css("cursor", "pointer");
    }
    audioPlayer.data("currentTrack", index);

    albumReleaseDate.text(track.data("releasedate"));

    audioPlayer.find(".player").removeClass("hide");
    audioPlayer.find(".wave").removeClass("reveal");

    if (!track.data("showloading")) {
      audioPlayer.find(".player").addClass("hide");
    } else {
      audioPlayer.find(".progressLoading").css("opacity", "0.75");
    }

    //set time from memory
    if( audioPlayer.trackMemory && typeof audioPlayer.find('.sr-playlist-item').eq(index).data('current-time') != 'undefined' && !audioPlayer.stickyPlayer ){
      const audioInstance = sr_setAudioElementInstance(audioPlayer);
      audioInstance.currentTime = (audioPlayer.find('.sr-playlist-item').eq(index).data('current-time'));
    }
      

   


    setTime(audioPlayer, $audio_el);

    hideEmptyAttribut(track.data("releasedate"), audioPlayer.find(".srp_subtitle"));

    if (!audioPlayer.hasClass('sr_selectedPlayer') || !audioPlayer.stickyPlayer) {
      IRON.audioPlayer.checkArtWorkFullBg(audioPlayer, artworkUrl);
      IRON.createFakeWave(audioPlayer);
    }

    if (!audioPlayer.stickyPlayer) {
      updateMiniPlayer(audioPlayer, track);
      IRON.swiper.update(audioPlayer, index);
    }
    audioPlayer.find('.sr_it-playlist-publish-date').text(track.data('date'));
    if (! IRON.audioPlayer.stickyEnable) {
      audioPlayer.find('.sonaar_media_element')[0].playbackRate = audioPlayer.attr('data-speedrate');
    }
  }

  function updateMiniPlayer(audioPlayer, track) {
    audioPlayer.find('.srp_player_boxed, .album-player, .album-store').removeClass('srp_hidden');
    $(audioPlayer).attr("trackselected",  track.index());
    if(track.attr('data-icecast_json') == '' || typeof track.attr('data-icecast_json') == 'undefined'){
      var playlistTitleElement = audioPlayer.find(".sr_it-playlist-title, .album-title");
      var prefixTitle = (typeof audioPlayer.find(".album-title").attr('data-prefix') === 'undefined')? '' : audioPlayer.find(".album-title").attr('data-prefix');
      if (typeof audioPlayer.data("playlist_title") !== "undefined" && audioPlayer.data("playlist_title").length) {
        playlistTitleElement.text(prefixTitle + ' ' + audioPlayer.data("playlist_title"));
      } else if(typeof track.attr('data-albumtitle') != 'undefined'){
        playlistTitleElement.text(prefixTitle + ' ' + track.attr('data-albumtitle'));
      }else{
        audioPlayer.find('.srp_player_boxed, .album-player, .album-store').addClass('srp_hidden');
      }

      var trackTitleSource = (typeof track.data("tracktitle") != 'undefined')? track.data("tracktitle").toString().split('<span class="srp_trackartist">')[0] : '';
      setSingleMetaHeadingInMiniplayer( trackTitleSource,  audioPlayer.find('.track-title') );
    }
    setSingleMetaHeadingInMiniplayer( track.data("artist"), audioPlayer.find('.album-player .srp_artistname') );
    setSingleMetaHeadingInMiniplayer( track.data("tracktime"), audioPlayer.find('.album-player .srp_duration') );
    setSingleMetaHeadingInMiniplayer(track.find('.srp_cf_data.sr-playlist-cf--description').text(), audioPlayer.find('.album-player .srp_description'));
    setSingleMetaHeadingInMiniplayer(track.find('.srp_cf_data.sr-playlist-cf--product_cat').text(), audioPlayer.find('.album-player .srp_category'));
    setSingleMetaHeadingInMiniplayer(track.find('.srp_cf_data.sr-playlist-cf--playlist-category').text(), audioPlayer.find('.album-player .srp_category'));
    setSingleMetaHeadingInMiniplayer(track.find('.srp_cf_data.sr-playlist-cf--product_tag').text(), audioPlayer.find('.album-player .srp_tag'));
    setSingleMetaHeadingInMiniplayer(track.find('.srp_cf_data.sr-playlist-cf--playlist-tag').text(), audioPlayer.find('.album-player .srp_tag'));
    setSingleMetaHeadingInMiniplayer(track.find('.srp_cf_data.sr-playlist-cf--podcast-show').text(), audioPlayer.find('.album-player .srp_podcast_show'));
    audioPlayer.find('.srp_meta_cf').each(function(){
      setSingleMetaHeadingInMiniplayer(track.find('.srp_cf_data.sr-playlist-cf--' + $(this).data('cf')).html(), $(this));
    })

    if (audioPlayer.data('playertemplate') == 'skin_boxed_tracklist' && audioPlayer.find('.srp_track_cta').length) {
      audioPlayer.find('.srp_track_cta .song-store-list-container').remove();
      audioPlayer.find('.srp_track_cta').append(track.find('.song-store-list-container').clone());
    }
    const $currentTrack = audioPlayer.find('.sr-playlist-item:not(.srp_related_track)').eq(track.index());
    /*Miniplayer Note Button*/
    if($currentTrack.find('.srp_noteButton').length || 
    $currentTrack.find('.srp_track_description').length && $currentTrack.find('.srp_track_description').html().length
    ){
      audioPlayer.find('.album-player .srp_noteButton').removeClass('srp_hide');
      audioPlayer.find('.album-player .srp_noteButton .sricon-info').attr('data-source-post-id', $currentTrack.attr('data-post-id'));
      audioPlayer.find('.album-player .srp_noteButton .sricon-info').attr('data-track-position', $currentTrack.attr('data-track-pos'));
      audioPlayer.find('.album-player .srp_noteButton .sricon-info').attr('data-track-title', $currentTrack.attr('data-tracktitle'));
    }else{
      audioPlayer.find('.album-player .srp_noteButton').addClass('srp_hide');
    }
    audioPlayer.find('.srp_player_boxed .srp_note').remove();
    /*End Miniplayer Note Button*/
  }

  function checkArtWorkFullBg(audioPlayer, artwork) {
    var hasArtworkBgClass = (null !== audioPlayer) ? audioPlayer.closest('.srp_artwork_fullbackground_yes').length > 0 : false;
    if (hasArtworkBgClass) {
      if (audioPlayer.data('hide-artwork') != '1' && audioPlayer.data('hide-artwork') != 'true') {
        // Determine if this is the first call for this audio player
        var isFirstCall = typeof audioPlayer.data('firstCall') === 'undefined' || audioPlayer.data('firstCall') === false;
        audioPlayer.data('firstCall', true);

        var hasArtworkBgClass_Gradient = audioPlayer.closest('.srp_artwork_fullbackground_wgradient_yes').length > 0;
        if (hasArtworkBgClass_Gradient) {
          audioPlayer.find('.srp-artworkbg-gradient').remove();
          var backgroundDiv = document.createElement('div');
          backgroundDiv.className = 'srp-artworkbg-gradient';
          audioPlayer[0].appendChild(backgroundDiv);
        }
  
        if (artwork === false) {
          var currentTrackIndex = audioPlayer.currentTrack;
          artwork = $(audioPlayer).find('.sr-playlist-item').eq(currentTrackIndex).data('albumart');
        }

        if (artwork) {
          // Find existing background divs and fade them out
          var existingBackgrounds = audioPlayer.find('.srp-artworkbg');
          existingBackgrounds.addClass('srp-fade-out');
          setTimeout(function() {
            existingBackgrounds.remove();
          }, 2500); // Corresponds to the animation duration
  
          // Create new background div and append it
          var newBackgroundDiv = document.createElement('div');
          newBackgroundDiv.className = 'srp-artworkbg';

          if (!isFirstCall) {
            newBackgroundDiv.className += ' srp-fade-in';
          }

          newBackgroundDiv.style.backgroundImage = 'url(' + artwork + ')';
          audioPlayer[0].appendChild(newBackgroundDiv);
        } else {
          // Next track has no artwork, remove the previous image with fade-out effect
          var backgrounds = audioPlayer.find('.srp-artworkbg');
          backgrounds.addClass('srp-fade-out');
          setTimeout(function() {
            backgrounds.remove();
          }, 2500); // Corresponds to the animation duration
        }
      }
    }
  }
  
  
  function setRandomList(tracks, firstTrackIndex = null) {
    var poolTrack = new Array();
    var i = 0;
    $(tracks).each(function () {
      poolTrack.push(i);
      i++;
      poolTrack = poolTrack.sort(function (a, b) {
        return 0.5 - Math.random();
      });
    });

    if (firstTrackIndex != null) {
      const indexTrack = poolTrack.indexOf(firstTrackIndex);
      if (indexTrack !== -1) {
        poolTrack.splice(indexTrack, 1);
        poolTrack.unshift(firstTrackIndex);
      }
    }
    return poolTrack;
  }

  function setPlaylist(playlist, $audio_el, audioPlayer) {

    let playlistTimeDuration = 0;
    let trackNumberArray = [];

    playlist.find('li').each(function (i) {
      if( ! $(this).data('relatedtrack') ){
        trackNumberArray.push(i+1);
      }else{
        trackNumberArray.push('');
      }
      preSetSingleTrack($(this));
      if ($(this).data('relatedtrack') != '1') { //Count playlist time duration
        if ($(this).data('tracktime')) {
          convertTime($(this).data('tracktime'));
          playlistTimeDuration = playlistTimeDuration + convertTime($(this).data('tracktime'));
        }
      }

    });

    //Output playlist time duration
    playlistTimeDuration = Math.round(playlistTimeDuration / 60) * 60; //Round to minutes
    playlistTimeDuration = moment.duration(playlistTimeDuration, "seconds");
    let durationOutput = '';
    let timeDurationMinutes = playlistTimeDuration._milliseconds / 60000;
    let timeDurationHours = Math.floor(timeDurationMinutes / 60);
    if (timeDurationHours > 0) {
      timeDurationMinutes = timeDurationMinutes - (timeDurationHours * 60);
      durationOutput += timeDurationHours + ' ' + audioPlayer.find('.srp_playlist_duration').data('hours-label') + ' ';
    }
    durationOutput += timeDurationMinutes + ' ' + audioPlayer.find('.srp_playlist_duration').data('minutes-label');
    audioPlayer.find('.srp_playlist_duration').html(durationOutput);
    
    if (!audioPlayer.hasClass('srp_reordered') && audioPlayer.listJs) {
      listJsInit(audioPlayer);
    }
    
    playlist.find('li').each(function () { //have to be loaded after listJsInit
      setFrontendSingleTrack($(this), $(this).index(), trackNumberArray[$(this).index()], $audio_el, audioPlayer);
      if( audioPlayer.hasClass('srp_has_customfields') ){
        setColumnCta(this);
      }
    });
 
  }
  
  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  var srmp3ResizeHandler = debounce(function() {
    if(IRON.audioPlayer.activePlayer){
        startAudioSpectrum(IRON.audioPlayer.activePlayer);
    }
    if(typeof sonaar_music.option.sticky_spectro_style !== "undefined" && sonaar_music.option.sticky_spectro_style != "none"){
        startAudioSpectrum('#sonaar-player')
    }
    $('.iron-audioplayer').each(function(){
        srp_setTrackListColumns(this , true);
    })
    if(typeof IRON.sonaar != 'undefined' && typeof IRON.sonaar.player != 'undefined'){
        if ($(window).outerWidth() > 540) {
            IRON.sonaar.player.isSmallDevice = false;
        } else {
            IRON.sonaar.player.isSmallDevice = true;
        }
    }
    IRON.setExtendedPlayerHeightVar();
  }, 500); // 250ms debounce time

  $(window).on('resize', srmp3ResizeHandler);

  function updatePaginationAjax(player) {

    let currentPage = parseInt(player.srp_player_param['srp_page'], 10);
    if (isNaN(currentPage)) {
      currentPage = 1;
    }
    let postperpage = parseInt(player.srp_player_param['posts_per_page'], 10);
    let totalPages = parseInt(player.attr('data-total_pages'), 10);

    let output = '';
    
    const ellipsis = '<li class="disabled"><span class="page">...</span></li>';

    if (totalPages == 1){
      player.find('.srp_pagination_container').remove();
    }
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
          output += `<li${i === currentPage ? ' class="active"' : ''}><span class="page" data-i="${i}" data-page="${postperpage}">${i}</span></li>`;
      }
    } else {
      // Always display the first page
      output += `<li${currentPage === 1 ? ' class="active"' : ''}><span class="page" data-i="1"  data-page="${postperpage}">1</span></li>`;
    
      if (currentPage === 1) {
          output += `<li><span class="page" data-i="2"  data-page="${postperpage}">2</span></li>`;
          output += ellipsis;
      
      } else if (currentPage === 2) {
          output += `<li class="active"><span class="page" data-i="2"  data-page="${postperpage}">2</span></li>`;
          output += `<li><span class="page" data-i="3"  data-page="${postperpage}">3</span></li>`;
          output += ellipsis;
      
      } else if (currentPage === 3) {
          for (let i = 2; i <= 4; i++) {
              output += `<li${i === currentPage ? ' class="active"' : ''}><span class="page" data-i="${i}"  data-page="${postperpage}">${i}</span></li>`;
          }
          output += ellipsis;
      
      } else if (currentPage >= 4 && currentPage <= totalPages-3) {
          output += ellipsis;
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
              output += `<li${i === currentPage ? ' class="active"' : ''}><span class="page" data-i="${i}"  data-page="${postperpage}">${i}</span></li>`;
          }
          output += ellipsis;
      
      } else if (currentPage >= totalPages-2 && currentPage <= totalPages) {
          output += ellipsis;
          for (let i = totalPages - 3; i <= totalPages - 1; i++) {
              output += `<li${i === currentPage ? ' class="active"' : ''}><span class="page" data-i="${i}"  data-page="${postperpage}">${i}</span></li>`;
          }
      }
     
      // Always display the last page
      output += `<li${currentPage === totalPages ? ' class="active"' : ''}><span class="page" data-i="${totalPages}"  data-page="${postperpage}">${totalPages}</span></li>`;
    }

    player.find('.srp_pagination').html(output);
    player.find('.srp_pagination').off('click');
    player.find('.srp_pagination--prev').off('click');
    player.find('.srp_pagination--next').off('click');

    player.find('.srp_pagination').on('click', '.page', function() {
      let pageNumber = $(this).data('i'); // Get the page number from the data-i attribute
      $(this).parents('li').addClass('active').siblings().removeClass('active');
      srp_updatePage(pageNumber, player);
      IRON.audioPlayer.reloadAjax(player, true);
    });

    player.find('.srp_pagination--prev').on('click', function(){
      if(player.find('.srp_pagination').find('.active').prev().length > 0){
        player.find('.srp_pagination').find('.active').prev().find('span')[0].click()
      }
    })
    player.find('.srp_pagination--next').on('click', function(){
      if(player.find('.srp_pagination').find('.active').next().length > 0){
        player.find('.srp_pagination').find('.active').next().find('span')[0].click()
      }
    });

    let elements = player[0].querySelectorAll('.srp_sort');

    const unwantedValues = [
      'srmp3_cf_album_title',
      'srmp3_cf_album_img',
      'srmp3_cf_audio_title',
      'srmp3_cf_description',
      'srmp3_cf_artist',
      'podcast-show',
      'product_tag',
      'product_cat',
      'playlist-category',
      'playlist-tag'
    ];
    function handleElementClick(sortValue, e) {
      e.preventDefault();
      // Special condition for tracklist-item-title
      if (sortValue === 'tracklist-item-title') {
          sortValue = 'title';
      }
      if (sortValue === 'post_id') {
        sortValue = 'ID';
      }
      if (sortValue === 'post_date') {
        sortValue = 'date';
      }
      if (sortValue === 'post_modified') {
        sortValue = 'modified';
      }

      // Check current URL for srp_order value and decide on ascending or descending
      const currentOrder = new URLSearchParams(window.location.search).get('srp_order');
      if (currentOrder === `${sortValue}_asc`) {
          sortValue += '_desc';
      } else {
          sortValue += '_asc';
      }
      srp_updatePage(1, player);
      srp_updateOrder(sortValue, player);
      IRON.audioPlayer.reloadAjax(player, true)
    }

    elements.forEach(element => {
      if (element._clickHandler) {
        element.removeEventListener('click', element._clickHandler);
      }
      let sortValue = element.getAttribute('data-sort').replace('sr-playlist-cf--', '');
        // Skip unwanted values
      if (unwantedValues.includes(sortValue)) {
        $(element).removeClass('srp_sort');
        $(element).css('pointer-events', 'none');
        return;
      }
      const boundClickHandler = handleElementClick.bind(null, sortValue);
      element.addEventListener('click', boundClickHandler);
      element._clickHandler = boundClickHandler; // store the reference for later removal
      
    });

  }


  //Reset the tracklist when is has been modified by the search/filter options
  var srp_wait = false; 
  function listJsInit(audioPlayer) {
   
    if(audioPlayer.lazy_load){
      return;
    }
    //return; //should do this if we are in lazyload...but the search seems to stop working (not added in the query url)
    if( !audioPlayer.find('.srp_list li').length )
      return;

    
    if( typeof List == 'undefined')
    return;

    const sortItems = ['srp_cf_data', 'tracklist-item-title', 'srp_track_description','tracklist-item-time', { name: 'srp_tracklist-item-date', attr: 'date' }]; // add default values
    const sortItemsFromCF = audioPlayer.find('.srp_list').data('filters').split(',').map(function(el) { return "sr-playlist-cf--" + el}); //get all elements from data-sortby, convert them to array and add prefix "sr-playlist-cf--" to all element. 

    let sortOptions = sortItems.concat(sortItemsFromCF); //['tracklist-item-title', 'sr-playlist-cf--artist_name', 'sr-playlist-cf--acf_category', 'sr-playlist-cf--acf_beats_per_minutes', 'sr-playlist-cf--has_drum', 'srp_track_description', 'tracklist-item-time', { name: 'srp_tracklist-item-date', attr: 'date' }]; //Set searching area

    var options = {
      valueNames: sortOptions,
      listClass: 'srp_list',
      searchClass: 'srp_search',
      sortClass: 'srp_sort',
      //page: audioPlayer.data("tracks-per-page"),
      /*pagination: [{
        name: "srp_pagination",
        paginationClass: "srp_pagination",
        outerWindow: 1
      }],*/
      //indexAsync: true,
      searchDelay: 1000,
 
     // pagination: true
    };
    
    if(audioPlayer.data("tracks-per-page")){
      options.page = audioPlayer.data("tracks-per-page");
      options.pagination = [{
        name: "srp_pagination",
        item: '<li><span class="page" onclick="srp_scrollToTrackListTop(\''+audioPlayer.id+'\')"></span></li>',
        paginationClass: "srp_pagination",
        outerWindow: 1,
        innerWindow: 1
      }]
      audioPlayer.find('.srp_pagination--prev').on('click', function(){
        if(audioPlayer.find('.srp_pagination').find('.active').prev().length > 0){
          audioPlayer.find('.srp_pagination').find('.active').prev().find('span')[0].click()
        }
      })
      audioPlayer.find('.srp_pagination--next').on('click', function(){
        if(audioPlayer.find('.srp_pagination').find('.active').next().length > 0){
          audioPlayer.find('.srp_pagination').find('.active').next().find('span')[0].click()
        }
      })   
      audioPlayer.addClass('srp_reordered');  
   }

   



    const tracklistID = audioPlayer.find('.playlist').attr('id');
    for (var playerIndex = 0; playerIndex < IRON.players.length && IRON.players[playerIndex].audioPlayer.attr('id') != tracklistID; playerIndex++) { }; //Set playerIndex
    audioPlayer.orderedList = new List(tracklistID, options);
    audioPlayer.orderedList.on('updated', function () {
      
      if (IRON.audioPlayer.stickyEnable && IRON.sonaar.player.selectedPlayer == audioPlayer) { //if Sticky is sync to this widget player, unsync them before modifying the tracklist.
        IRON.sonaar.player.selectedPlayer = null;
        audioPlayer.removeClass('sr_selectedPlayer');
        audioPlayer.removeClass('audio-playing');
        IRON.sonaar.player.playlistID = null;
      }
      audioPlayer.addClass('srp_reordered');
      if (IRON.audioPlayer.stickyEnable || ! audioPlayer.hasClass('sr_selectedPlayer')) { //Reset the player if sticky is enabled or when the page is loaded with filterOrSearch parameter in the URL
      
        var player = Object.create(IRON.audioPlayer); // pour reloader avec pagnination (sans ajax)
        player.init(audioPlayer);
        IRON.players[playerIndex] = player;
      }else{ //keep the current track playing and unselect the current track from the track list
        audioPlayer.find('.srp_list .current').removeClass('current');
        audioPlayer.data('currentTrack', 999999);// CurrentTrack equal 999999 when we dont want a track selected in the tracklist
        var relatedtrackCount = 0;
        audioPlayer.find('.playlist li').each(function () { //initialize new tracklist
          if( $(this).data('relatedtrack') ){
            relatedtrackCount++;
          }
          var trackNumber = $(this).index() + 1 - relatedtrackCount;
          if($(this).data('init') !== true){ //Dont init twice the same track
            setFrontendSingleTrack($(this), $(this).index(), trackNumber, IRON.players[playerIndex].$audio_el, audioPlayer);
          }
        })

      }
      srp_setTrackListColumns(audioPlayer);

    })
  }

  function checkIfResult(audioPlayer){
    
    if( $(audioPlayer).find(".srp_list li").length){
      audioPlayer.find('.srp_notfound').css('display', 'none');
      audioPlayer.find('.sr-cf-heading').css('display', 'flex');
      audioPlayer.find('.srp_pagination_container').css('display', 'flex');
    } else {
      audioPlayer.find('.srp_notfound').css('display', 'block');
      audioPlayer.find('.sr-cf-heading').css('display', 'none');
      audioPlayer.find('.srp_pagination_container').css('display', 'none');
    }
   
    
  }

  $('.srp_search').keydown(function(e) { //Trigger search on keyup - we are inittiating search field inside the player seperatly for ajax.
    if( !$(this).parents('.iron-audioplayer').length ){
      IRON.searchField.search(this, e);
    }
  });

  $('.srp_search_container .srp_reset_search').click(function() {
    //delete search keywords on icon click
    const metaValue = $(this).parents('.srp_search_container').find('input')[0].value;
    const playerId = $(this).parents('.srp_search_container').data('player-id');
    srp_removeMeta('search', metaValue, playerId);
  });

  function setTime(audioPlayer, $audio_el) {
    $($audio_el).on("timeupdate", function () {
      karaokeMode(audioPlayer, $audio_el.currentTime);
      setTimeCurrentTime(audioPlayer, $audio_el.currentTime);
      setTimeTotalTime(audioPlayer, $audio_el)
      IRON.setTracksTimeMemories(audioPlayer);
    });
  }

  function setTimeCurrentTime(audioPlayer, currentTime) {;
    var time = moment.duration(currentTime, "seconds");
    if (time.hours() >= 12 || time.hours() <= 0) {
      audioPlayer.find(".currentTime").html(moment(time.minutes() + ":" + time.seconds(), "m:s").format("mm:ss"));
    } else {
      audioPlayer.find(".currentTime").html(moment(time.hours() + ":" + time.minutes() + ":" + time.seconds(), "h:m:s").format("h:mm:ss"));
    }
  }

  function setTimeTotalTime(audioPlayer, $audio_el) {
    if ($audio_el.duration !== Infinity) {
      var timeLeft = moment.duration($audio_el.duration - $audio_el.currentTime, "seconds");
      if(timeLeft.milliseconds() > 0){
        if (timeLeft.hours() >= 12 || timeLeft.hours() <= 0) {
          audioPlayer.find(".totalTime").html("-" + moment(timeLeft.minutes() + ":" + timeLeft.seconds(), "m:s").format("mm:ss"));
        } else {
          audioPlayer.find(".totalTime").html("-" + moment(timeLeft.hours() + ":" + timeLeft.minutes() + ":" + timeLeft.seconds(), "h:m:s").format("h:mm:ss"));
        }
      }else{
        audioPlayer.find(".totalTime").html("");
      }
    } else {
      audioPlayer.find(".totalTime").html("");
    }
  }

  function seekTime(time) {
    if (IRON.audioPlayer.stickyEnable) {
      IRON.sonaar.player.seekTime(time);
    } else {
      if (time) {
        if (this.audioPlayer.find('.sonaar_media_element')[0].duration !== Infinity) {
          this.audioPlayer.find('.sonaar_media_element')[0].currentTime = convertTime(time);
        }
      }
    }
  }
  /*
    setControl is called on load before audio playing
    */
  function setControl($audio_el, audioPlayer, playlist) {
    audioPlayer.unbind('click');
    if (audioPlayer.stickyPlayer) {
      audioPlayer.on("click", ".play, .album .album-art", function (event) {
        if ($(audioPlayer).hasClass("sr_selectedPlayer")) {
            IRON.sonaar.player.play();
        } else {
          if(audioPlayer.id == 'popup_player'){
              var playButton = IRON.bt_that_launched_the_popup.closest('li.sr-playlist-item').find('.srp_audio_trigger');
              var singlePlayerButton = IRON.bt_that_launched_the_popup.closest('.srp_control_box').find('.srp-play-button');
              if (playButton.length > 0) { // popup has been triggered from a widget player
                playButton.click(); 
              } else if(singlePlayerButton.length > 0){ // popup has been triggered from a single player
                singlePlayerButton.click();
              } else if(IRON.sonaar.player.selectedPlayer){ // popup has been triggered from a sticky player
                var selectedPlayerWidget = IRON.sonaar.player.selectedPlayer[0];
                var postId = audioPlayer.list.tracks[0].sourcePostID;
                var trackPos = audioPlayer.list.tracks[0].track_pos;
                playButton = $(selectedPlayerWidget).find('.sr-playlist-item[data-post-id="'+postId+'"][data-track-pos="'+trackPos+'"] .srp_audio_trigger');
                if(playButton.length > 0){
                  playButton.click();
                }else{
                  play(audioPlayer, $audio_el, playlist);
                }
              }else{ // condition cta wont work but the track will still be able to play
                play(audioPlayer, $audio_el, playlist);
              }
          }else{
            play(audioPlayer, $audio_el, playlist);
          }
        }
        event.preventDefault();
      });
      audioPlayer.on("click", ".previous", function (event) {
        previous(audioPlayer, playlist);
        event.preventDefault();
      });
      audioPlayer.on("click", ".next", function (event) {
        next(audioPlayer, $audio_el, playlist);
        event.preventDefault();
      });
    } else {
      audioPlayer.on("click", ".play, .album .album-art", function (event) {

        if(!audioPlayer.hasClass('sr_selected') && !audioPlayer.hasClass('audio-playing')){
          sr_addTrackToPlaylist( $(audioPlayer).find('.playlist li').eq($(audioPlayer).attr('trackselected')), audioPlayer);
        }
        togglePause(audioPlayer);

        if (!audioPlayer.hasClass("audio-playing")) {
          play(audioPlayer, $audio_el);
          triggerPlay(audioPlayer);
        } else {
          togglePause(audioPlayer);
        }
        togglePlaying(audioPlayer, $audio_el);
        event.preventDefault();
      });
      audioPlayer.on("click", ".previous", function (event) {
        previous(audioPlayer, playlist);
        event.preventDefault();
      });
      audioPlayer.on("click", ".next", function (event) {
        next(audioPlayer, $audio_el, playlist);
        event.preventDefault();
      });
    }
    audioPlayer.on("click", ".sr_skipForward", function () {
      sr_audioSkipTo(30, $audio_el);
    });
    audioPlayer.on("click", ".sr_skipBackward", function () {
      sr_audioSkipTo(-15, $audio_el);
    });
    audioPlayer.on("click", ".sr_shuffle", function (event) {
      sr_shuffleToggle(event, audioPlayer);
    });
    audioPlayer.on("click", ".srp_repeat", function () {
      IRON.repeatButtonToggle();
    });
    audioPlayer.on("click", ".sr_speedRate", function (event) {
      sr_setSpeedRate(event, audioPlayer, $audio_el);
    });
    audioPlayer.on("click", ".volume .sricon-volume", function (event) {
      sr_muteTrigger(event, audioPlayer, $audio_el);
    });
    audioPlayer.on("mouseenter", ".volume .sricon-volume", function (event) {
      sr_updateSlider(event, audioPlayer);
    });
    audioPlayer.on('click', '.srp_swiper-control .srp_play', function (event) {
      IRON.swiper.play(this, audioPlayer);
    });

    audioPlayer.on("click", ".srp_noteButton i", function () {
      let noteParent;
      if ($(this).parents('.sr-playlist-item').length) {
        noteParent = $(this).parents('.sr-playlist-item');
      } else {
        noteParent = $(this).parents('.srp_player_boxed');
      }
      if (noteParent.find('.srp_note').length == 0) {
        const el = $(this);
        srp_wc_loadspinner(el);
        var data = {
          'action': 'load_track_note_ajax',
          'post-id': $(this).attr('data-source-post-id'),
          'track-position': $(this).attr('data-track-position'),
          'track-title': $(this).attr('data-track-title'),
          'track-desc-postcontent': $(this).attr('data-track-use-postcontent'),
          'nonce': sonaar_music.ajax.ajax_nonce
        };

        $.post(sonaar_music.ajax.ajax_url, data, function (response) {
          srp_wc_unloadspinner(el);
          response = JSON.parse(response);
          const notePopup = $('<article/>', { class: 'srp_note' });
          $(notePopup).hide();
          $(notePopup).prepend('<div class="sr_close">' + closeSvg + '</div>' + response);
          if (el.parents('.sr-playlist-item').length) {
            if (el.parents('.sr-playlist-item').find('.srp_note').length == 0) { //not insert the note if it is already append
              if(el.parents('.srp_tracklist_grid').length){
                el.parents('.sr-playlist-item').find('.store-list').before(notePopup);
              }else{
                el.parents('.sr-playlist-item').append(notePopup);
              }
            }
            toggleNote(el);
          } else {
            $(audioPlayer).find('.srp_player_boxed').prepend(notePopup);
            toggleNote(el);
          }
        })
      } else {
        toggleNote($(this));
      }
    });

    audioPlayer.on('click', '.sr_track_cover', function (event) {
      if( !audioPlayer.hasClass('srp_tracklist_grid') ) return;
      if ( $(event.target).is('.srp_play')) return;
      
      if ($(this).parents('.sr-playlist-item').data('post-url')) { 
       // l'option to link the tracklist title is enable
        // go to the post url
        window.location.href = $(this).parents('.sr-playlist-item').data('post-url');
      }
    });
    audioPlayer.on('click', '.sr_track_cover .srp_play', function () {
      $(this).parents('.sr-playlist-item').find('.srp_audio_trigger').click();
    });
    audioPlayer.on("click", ".srp_note .sr_close", function () {
      toggleNote($(this));
    });
    audioPlayer.on('mouseenter', '.sr-playlist-item:not(.srp_extendable) .song-store-list-menu', function () {
      openStoreListContainer(this);
    });
    audioPlayer.on('mouseleave', '.sr-playlist-item:not(.srp_extendable) .song-store-list-container', function () {
      closeStoreListContainer(this);
    });
    
    audioPlayer.on('mouseenter', '.srp_extendable, .song-store-list-menu, .srp_ellipsis', function () {
      if( 
        ($(audioPlayer).hasClass('srp_responsive') && $('.song-store-list-menu:hover, .srp_ellipsis:hover').length ) ||
        ! audioPlayer.hasClass('srp_responsive')  
        ){
          const el = ( $(this).hasClass('srp_extendable') )? $(this) : $(this).parents('.srp_extendable');
          el.find('.song-store-list-menu').width('fit-content');
          el.addClass('srp_extended')
      }
    });
    audioPlayer.on('mouseleave', '.srp_extendable', function () {
      let width;
      if(audioPlayer.hasClass('srp_responsive')){
        width = ( $(this).find('.song-store-list-menu').data('mobile-width') )? $(this).find('.song-store-list-menu').data('mobile-width') : 100 ;
      }else{
        width = ( $(this).find('.song-store-list-menu').data('width') )? $(this).find('.song-store-list-menu').data('width') : 200 ;
      }
      $(this).find('.song-store-list-menu').width(width);
      $(this).removeClass('srp_extended')
    });

    audioPlayer.on('click', '.srp_wc_variation_button', function () {
      if($(this).find('.sricon-spinner-wrap').length) return; //if the button is already loading, do nothing
      srp_variation_button(this);
      return false;
    })
    audioPlayer.on('click', '.srp-make-offer-bt', function () {
      if($(this).find('.sricon-spinner-wrap').length) return; //if the button is already loading, do nothing
      srp_variation_button(this);
      return false;
    })

    // Event listener for the regular audio player
    audioPlayer.on('click', '.sr_store_ask_email', function(e) {
      e.preventDefault();
      handleAskEmailClick($(this));
    });

    audioPlayer.find('.playlist .ajax_add_to_cart').on('click', function () {
      srp_add_to_cart_loadspinner($(this));
    })

    //Store button ajax call for popup
    audioPlayer.off('click', '.sr-store-popup');
    audioPlayer.on('click', '.sr-store-popup', function () {
      let playerId = 0;
      const el = this;
      $(IRON.players).each(function () {
        if (this.audioPlayer.id == $(el).parents('.iron-audioplayer').data('id')) {
          playerId = this.audioPlayer.id;
          return;
        }
      })
      const id = $(this).data('source-post-id');
      const storeId = $(this).data('store-id');
      const trackNumber = $(this).parents('.sr-playlist-item').index();
      sr_popUp(id, storeId, trackNumber, playerId, $(this));
    })
    audioPlayer.find('.srp_search').keydown(function(e) { //Trigger search on keyup 
        IRON.searchField.search(this, e);
    });
  }


  function toggleNote(el) {
    let noteParent;
    if (el.parents('.sr-playlist-item').length) {
      noteParent = el.parents('.sr-playlist-item');
    } else {
      noteParent = el.parents('.srp_player_boxed');
    }
    const currentOpened = (noteParent.find('.srp_note').attr('data-note') == 'opened') ? true : false;
    el.parents('.iron-audioplayer').find('.srp_note_opened').each(function () {
      const item = $(this);
      $(this).removeClass('srp_note_opened');
      $(this).find('.srp_note').attr('data-note', 'closed')
      if (el.parents('.sr-playlist-item').length) {
        $(this).find('.srp_noteButton i.sricon-close-circle').removeClass('sricon-close-circle').addClass('sricon-info');
        $(this).find('.srp_note').css('opacity', 1).slideUp(125, function () {
          if (item.find('.srp_track_description').length) {
            item.find('.srp_track_description').fadeIn(75);
          }
        }).animate(
          { opacity: 0 },
          { queue: false, duration: 125 }
        );
      } else {
        $(this).find('.srp_note').fadeOut(125);
      }
    });
    if (!currentOpened) {
      noteParent.find('.srp_note').attr('data-note', 'opened');
      if (el.parents('.sr-playlist-item').length) {
        noteParent.find('.srp_noteButton i.sricon-info').removeClass('sricon-info').addClass('sricon-close-circle');
        if (noteParent.find('.srp_track_description').length) {
          noteParent.find('.srp_track_description').fadeOut(75, function () {
            noteParent.find('.srp_note').css('opacity', 0).slideDown(125).animate(
              { opacity: 1 },
              { queue: false, duration: 250 }
            );
          });
        } else {
          noteParent.find('.srp_note').css('opacity', 0).slideDown(125).animate(
            { opacity: 1 },
            { queue: false, duration: 250 }
          );
        }
      } else {
        noteParent.find('.srp_note').fadeIn(125);
      }
      noteParent.addClass('srp_note_opened');
    }
  }
  /*
  Set Lyrics of what is currently playing
  */
  function karaokeMode(audioPlayer, currentTime) {
    var selectedLyricLine = '';
    var i = 0
    if (audioPlayer.stickyPlayer) {
      var currentTrack = IRON.sonaar.player.currentTrack;
      if(!IRON.sonaar.player.list.tracks[currentTrack].has_lyric) return;
      var playerId = IRON.sonaar.player.selectedPlayer.id;
    } else {
      if($(audioPlayer).find('.sr-playlist-item.current').data('track-lyric') != '1') return;
      var currentTrack = $(audioPlayer).find('.sr-playlist-item.current').index();
      var playerId = $('.iron-audioplayer.sr_selectedPlayer').data('id');
    }
    $('.srp_selected_player').removeClass('srp_selected_player');
    $('#sonaar-modal[data-track-number="' + currentTrack + '"][data-player-id="' + playerId + '"]').addClass("srp_selected_player");
    while (i < 3 && selectedLyricLine.length == 0) {
      selectedLyricLine = $('#srmp3_lyrics_container p[begin="' + (currentTime - i) + '"], #srmp3_lyrics_container p[begin^="' + Math.floor(currentTime - i) + '."], #sonaar-modal.srp_selected_player p[begin="' + (currentTime - i) + '"], #sonaar-modal.srp_selected_player p[begin^="' + Math.floor(currentTime - i) + '."]')
      i++;
    }

    if (selectedLyricLine.length) {
      selectedLyricLine.parents('.srmp3_lyrics, #sonaar-modal.srp_selected_player').addClass("srmp3_singning");

      $(".srmp3_lyrics_read").removeClass("srmp3_lyrics_read");
      selectedLyricLine.addClass("srmp3_lyrics_read");
      jQuery('#srmp3_sticky_lyrics').replaceWith(
        jQuery('<span>', {
          id: 'srmp3_sticky_lyrics',
          class: 'srmp3_lyrics_container',
          title: $(selectedLyricLine[0]).text(),
          text: $(selectedLyricLine[0]).text()
        }).appendTo('#srmp3_lyricsplaying_container'));

      // keep lyrics centered in the modal
      if (!document.getElementById('srmp3_lyrics_container').classList.contains('srp_lyric_unlock')) {
        srp_lyricsAreScrolling = true;
        var element = document.querySelector("#srmp3_lyrics_container .srmp3_lyrics_read");
        element.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
      }
    }

  }
  function fakeWaveClick(from) {
    $(".sr_selectedPlayer .sonaar_fake_wave, #sonaar-player .sonaar_fake_wave, .mobileProgress").off("click");
    $(".sr_selectedPlayer .sonaar_fake_wave, #sonaar-player .sonaar_fake_wave, .mobileProgress").on("click", function (event) {
      if( $(this).parents('.iron-audioplayer').length && ! $(this).parents('.sr_selectedPlayer').length){
        return;
      }
      if($(this).parents('.sr-playlist-item:not(.current)').length){
        $(this).parents('.sr-playlist-item').find('.srp_audio_trigger').trigger('click');
      }
      if (from == "sticky") {
        var currentAudio = document.getElementById("sonaar-audio");
      } else {
        var currentAudio = $(this).parents('.iron-audioplayer').find('.album-player .sonaar_media_element')[0];
      }
      var progressedAudio = $(this).width() / event.offsetX;

      function waitUntilNewTrackIsloaded() { //when we click on waveform from the tracklist, we need to wait until the new track is loaded before seeking to the right position
        if( !isNaN(currentAudio.duration) ) {
          const duration = (currentAudio.duration == 'Infinity')? currentAudio.buffered.end(currentAudio.buffered.length-1) : currentAudio.duration;
          currentAudio.currentTime = duration / progressedAudio;
          event.preventDefault();
          clearInterval(intervalId);
        }
      }
      const intervalId = setInterval(waitUntilNewTrackIsloaded, 50);
      setTimeout(() => {
          clearInterval(intervalId);
      }, 3000);
    });
  }

  function preSetSingleTrack(singleTrack) {
    var soundwaveWrapper = singleTrack.find('.srp_soundwave_wrapper');
    var storeList = singleTrack.find('.store-list');
    var costumFieldColumns = singleTrack.find('.sr-playlist-cf-container');
    var noteButton = singleTrack.find('.srp_noteButton');
    const date = (typeof singleTrack.data('date-formated'))? singleTrack.data('date-formated') : '';
    singleTrack.removeAttr('data-date-formated');

    singleTrack.find('.srp_soundwave_wrapper, .store-list, .sr-playlist-cf-container, .srp_noteButton').remove();
    singleTrack.find(".audio-track").remove();

    $("");
    var audioTrigger = $("<div/>", {
      class: 'srp_audio_trigger'
    })

    singleTrack.find('.srp_tracklist-item-date').remove();
    let tracklistItemMeta = '<span class="srp_tracklist-item-date" date="' + singleTrack.data('date') + '"';
    if (singleTrack.data('show-date') != '1') {
      tracklistItemMeta += ' style="display:none;"'
    }
    tracklistItemMeta += '>' + date + '</span>';
    tracklistItemMeta += '<span class="tracklist-item-time">' + singleTrack.data("tracktime") + '</span>';

    if (singleTrack.data('post-url')) { // l'option to link the tracklist title is enable
      var tracklistItemContentBox = $("<div/>", { class: 'audio-track' });
      var playAndNumber = audioTrigger;
      var tracklistItemTitle = $("<a/>", { class: 'tracklist-item-title', href: singleTrack.data('post-url') }).append(singleTrack.data('tracktitle'));
    } else {
      var tracklistItemContentBox = $(audioTrigger).addClass('audio-track');
      var tracklistItemTitle = $("<div/>", { class: 'tracklist-item-title' }).append(singleTrack.data('tracktitle'));
      var playAndNumber = $("<span/>", {
        class: 'track-number',
        html:
          '<span class="number"></span><i class="sricon-play" aria-label="Play Track"></i>',
      });
    }

   tracklistItemContentBox
   .append(playAndNumber)
   .append(tracklistItemTitle)
   .append(soundwaveWrapper)
   .append(tracklistItemMeta);

   var playlistItemFlex = singleTrack.find('.sr-playlist-item-flex').length ? singleTrack.find('.sr-playlist-item-flex') : singleTrack;
   
   playlistItemFlex
   .append(tracklistItemContentBox)
   .append(costumFieldColumns)
   .append(storeList)
   .append(noteButton);
  }

  function setFrontendSingleTrack(singleTrack, eq, trackNumber, $audio_el, audioPlayer) {
    singleTrack.data('init', true); //Dont init twice the same track with listjs
    singleTrack.find('.srp_audio_trigger').on("click", function (event) {
        if ($(event.target).closest('.srp_soundwave_wrapper').length) {
          return;
        }
        if ($(this).find('.srp_noteButton:hover').length ) { //if we click on the note button: Note button could be inside the srp_audio_trigger in the tracklist grid layout
          return;
        }

        if ($(this).parents('.sr-playlist-item').attr("data-audiopath").length == 0) {
          return;
        }

        if ( !IRON.audioPlayer.stickyEnable && audioPlayer.hasClass('srp_reordered') || audioPlayer.hasClass('srp_player_is_favorite')) { 
          eq = $(this).parents('.sr-playlist-item').index(); //Base the EQ value on the tracklist order when the track list has been manipulated by filter or favorite 
        }

        if (audioPlayer.stickyPlayer && $(audioPlayer).hasClass('sr_selectedPlayer') && IRON.sonaar.player.currentTrack == eq) { //IF  track already loaded in the sticky player
          IRON.sonaar.player.play();
          return;
        }

        if (audioPlayer.stickyPlayer) {
          IRON.sonaar.player.setPlaylist(audioPlayer, eq, srp_startingTime);
          srp_startingTime = 0;
          audioPlayer.data("currentTrack", eq);
        }

        if (ifTrackIsPlaying($audio_el) && singleTrack.hasClass("current") && $(audioPlayer).hasClass('sr_selected')) {
          if (audioPlayer.stickyPlayer) {
            play(audioPlayer, $audio_el);
          } else {

            togglePause(audioPlayer);
            togglePlaying(audioPlayer, $audio_el);
          }
        } else if (singleTrack.hasClass("current") && $(audioPlayer).hasClass('sr_selected')) {
          play(audioPlayer, $audio_el);
        } else {
          if (!audioPlayer.stickyPlayer) {
            togglePause(audioPlayer);
            setAudio(singleTrack.data("audiopath"), $audio_el);
            $audio_el.play();
          }  
          
          setCurrentTrack(singleTrack, eq, audioPlayer, $audio_el);
          $(document).trigger("sonaarStats", [audioPlayer]);
          audioPlayer.find(".playlist li").removeClass("current");
          singleTrack.addClass("current");


          if (!audioPlayer.stickyPlayer) {
            sr_addTrackToPlaylist(singleTrack, audioPlayer);
            IRON.audioPlayer.sr_loadLyricsAjax(singleTrack.attr("data-post-id"), singleTrack.attr("data-track-pos"));
          }
          triggerPlay(audioPlayer);
          togglePlaying(audioPlayer, $audio_el);
          IRON.audioPlayer.activePlayer = audioPlayer;
          var trackTitle = String(singleTrack.data("tracktitle")).replace(/<span.*?span>/g, '');
          var albumTitle = singleTrack.data("albumtitle");
          var artistName = singleTrack.data("artist");
          var albumArt = singleTrack.data("albumart");

          IRON.audioPlayer.currentTrackData = {
            trackTitle: trackTitle,
            albumTitle: albumTitle,
            artistName: artistName,
            albumArt: albumArt
          }

          setMediaSessionAPI(trackTitle, albumTitle, artistName, albumArt);
        }
        if(audioPlayer.hasClass('srp_player_spectrum') && !audioPlayer.stickyPlayer){
          startAudioSpectrum(audioPlayer);
        }
        
        IRON.init_generatePeaks(audioPlayer);
        
        event.preventDefault();
      });

      if (singleTrack.data('post-url')) { // l'option to link the tracklist title is enable
        singleTrack.find('.srp_audio_trigger').addClass('track-number').html('<span class="number">' + trackNumber + '</span><i class="sricon-play" aria-label="Play Track"></i>');
      }else{
        singleTrack.find('.track-number .number').html(trackNumber);
      }

      singleTrack.find('.store-list').before(singleTrack.find('.audio-track'));
      if( $(audioPlayer).hasClass('srp_tracklist_grid') ){
        singleTrack.find('.audio-track').after(singleTrack.find('.srp_soundwave_wrapper'));
        singleTrack.find('.store-list').before(singleTrack.find('.srp_tracklist-item-date'));
        singleTrack.find('.store-list').before(singleTrack.find('.srp_track_description'));
        singleTrack.find('.audio-track').append(singleTrack.find('.srp_noteButton'));
      }

      singleTrack.find('.sr-playlist-cf-container').before(singleTrack.find('.audio-track'));
      singleTrack.find('.sr-playlist-cf-container').before(singleTrack.find('.sr_track_cover.srp_spacer'));
      if(singleTrack.find('.srp_soundwave_wrapper').length){
        IRON.createFakeWave(audioPlayer, false, singleTrack);
      }

      if(audioPlayer.trackMemory){
        const trackMemoryKey = IRON.getTrackMemoryKeyFormat(singleTrack.data('audiopath'));
        if(typeof IRON.localStorageTrackMemory[trackMemoryKey] == 'object'){
          const [currentTime, duration] = IRON.localStorageTrackMemory[trackMemoryKey];
          singleTrack.data( 'current-time', IRON.localStorageTrackMemory[trackMemoryKey][0] );
          singleTrack.find('.sonaar_wave_cut').width((currentTime / duration) * 100 + "%");
          audioPlayer.list.tracks[eq].hasCompleted = (typeof IRON.localStorageTrackMemory[trackMemoryKey][2] != 'undefined' && IRON.localStorageTrackMemory[trackMemoryKey][2] == true)? true : false;
        }
        singleTrack.data( 'track-memory-key', trackMemoryKey );
      }
  }

  function trackListItemResize() {
    $(".playlist li").each(function () {
      var storeWidth = $(this).find(".store-list").outerWidth();
      var trackWidth = $(this).find(".track-number").outerWidth();
      $(this)
        .find(".tracklist-item-title")
        .css("max-width", $(this).outerWidth() - storeWidth - trackWidth - 10);
    });
  }

  var setAudio = function (audio, $audio_el) {
    // setAudio function is not called when sticky player is enable

    if(typeof audioPlayer.hasPlayed == 'undefined'){ // Register the audio object a first time for iOS to continue to next track on lock mode.
      elementAudio.src = audio;
    }
    jQuery($audio_el).attr("src", audio);
    $audio_el.load();
    if (!audioPlayer.stickyPlayer) {
      $(".sr_selectedPlayer").removeClass("sr_selectedPlayer");
      $($audio_el).parents(".iron-audioplayer").addClass("sr_selectedPlayer");
    }
    fakeWaveClick("widget");
    audioPlayer.removeData('track_from_outer_page'); //'track_from_outer_page' is true when player play a track from another ajax page(pagination)
  };

  function getTime($audio_el) {
    return $audio_el.getCurrentTime();
  }

  function togglePlaying(audioPlayer, $audio_el) {
    $(".iron-audioplayer").removeClass("sr_selected");
    audioPlayer.addClass("sr_selected");

    $(".iron-audioplayer, .srmp3_sonaar_ts_shortcode").removeClass("audio-playing");


    if (ifTrackIsPlaying($audio_el)) {
      audioPlayer.addClass("audio-playing");
      if (typeof audioPlayer.data('ts-sync') != 'undefined') {
        $('#sonaar_ts-' + audioPlayer.data('ts-sync')).addClass("audio-playing");
      }
      audioPlayer.find('.currentTime, .totalTime').show();
      return;
    }

    $("#sonaar-player .play").removeClass("audio-playing");

  }

  function togglePause(audioPlayer) {
    $.each(IRON.players, function (index) {
      if (IRON.players[index] != audioPlayer) {
        IRON.players[index].audioPlayer.find(".album-player .sonaar_media_element")[0].pause()
      }
    });
  }

  function play(audioPlayer, $audio_el, playlist) {
    var currentTrack = audioPlayer.data("currentTrack");
    IRON.init_generatePeaks(audioPlayer);
    if (audioPlayer.stickyPlayer) {
      $audio_el.pause();
      if (typeof playlist !== "undefined") {
        playlist.find("li").eq(currentTrack).find('.srp_audio_trigger').click();
      }
    } else {
      if(currentTrack != 999999){ // CurrentTrack equal 999999 when the track is not in a playlist caused by list.js
        if($($audio_el).attr('src') == ''){
          setAudio($(audioPlayer).find('.playlist li').eq($(audioPlayer).attr('trackselected')).data("audiopath"), $audio_el);
          $(document).trigger("sonaarStats", [audioPlayer]);
        }
        if (!audioPlayer.find(".playlist li").hasClass("current") && audioPlayer.data('track_from_outer_page') !== true) { //'track_from_outer_page' is true when player play a track from another ajax page(pagination), so dont set the current class to a track from the tracklist
          var trackListElement = $(audioPlayer).find('.playlist li').eq($(audioPlayer).attr('trackselected'));
          trackListElement.addClass("current");
          if (!audioPlayer.stickyPlayer) {
            IRON.audioPlayer.sr_loadLyricsAjax(trackListElement.attr("data-post-id"), trackListElement.attr("data-track-pos"));
          }
        }
      }
      if (ifTrackIsPlaying($audio_el)) {
        $audio_el.pause();
      } else {
        $audio_el.play();
      }
      togglePlaying(audioPlayer, $audio_el);
    }
  }

  function previous(audioPlayer, playlist) {

    var audio_el = ( IRON.audioPlayer.stickyPlayer )? document.getElementById('sonaar-audio') : audioPlayer.find('.sonaar_media_element')[0];
    if( audio_el.currentTime > IRON.previousTrackThreshold ){ //Resets the track to the beginning Or go to the previous track.
        audio_el.currentTime = 0;
        return;
    }

    if (IRON.audioPlayer.stickyEnable && audioPlayer.hasClass('sr_selectedPlayer')) {
      IRON.sonaar.player.previous()
    } else {
      var currentTrack = audioPlayer.data("currentTrack");
      var nextTrack;
      if (audioPlayer.shuffle) {
        $(random_order).each(function (index) {
          if (this == currentTrack) {
            if (index == 0 && ! audioPlayer.hasClass('srp_noLoopTracklist')) {
              //if it is the first track form the shuffle order
              nextTrack = random_order[random_order.length - 1];
            } else {
              nextTrack = random_order[index - 1];
            }
          }
        });
      } else {
        nextTrack = currentTrack - 1;
      }

      playlist.find("li").eq(nextTrack).find('.srp_audio_trigger').click();
    }
  }

  function next(audioPlayer, $audio_el, playlist) {
    if (IRON.audioPlayer.stickyEnable && audioPlayer.hasClass('sr_selectedPlayer')) {
      IRON.sonaar.player.next()
    } else {
      var currentTrack = audioPlayer.data("currentTrack");
      var nextTrack;

      if (audioPlayer.shuffle) {
        $(random_order).each(function (index) {
          if (this == currentTrack) {
            if (index >= random_order.length - 1 && ! audioPlayer.hasClass('srp_noLoopTracklist')) {
              //if it is the last track form the shuffle order
              nextTrack = random_order[0];
            } else {
              nextTrack = random_order[index + 1];
            }
          }
        });
      } else {
        nextTrack = currentTrack + 1; 
      }

      if(!playlist.find("li").eq(nextTrack).length && audioPlayer.hasClass('srp_noLoopTracklist') && !IRON.audioPlayer.stickyEnable){
        wavesurfer.pause();
        audioPlayer.removeClass("audio-playing");
        $('.srmp3_sonaar_ts_shortcode').removeClass("audio-playing");
      }else{
        if (!playlist.find("li").eq(nextTrack).length) {
          nextTrack = 0;
        }
        $audio_el.pause();
        playlist.find("li").eq(nextTrack).find('.srp_audio_trigger').click();
      }
    }
  }

  function getPlayer() {
    return this;
  }
  function getplay() {
    play(this.audioPlayer, this.$audio_el);
  }

  function ifTrackIsPlaying($audio_el) {
    return !$audio_el.paused;
  }

  var fakeWaveUpdate = function ($audio_el, audioPlayer, playlist) {
    $($audio_el).off("ended");
    $($audio_el).on("ended", function () {
      IRON.setTracksTimeMemories(audioPlayer, 0, true); //Reset the track time memory when the track is ended
      audioPlayer.list.tracks[audioPlayer.data('currentTrack')].hasCompleted = true;
      if(IRON.repeatStatus !== false){
        //console.log(audioPlayer.notrackskip);
        if(IRON.repeatStatus === 'track' && audioPlayer.notrackskip !== "on"){
          sr_setTrackCurrentTime(0);
          $audio_el.play();
          return;
        }

        if(audioPlayer.data('currentTrack') + 1 >= audioPlayer.find('li').not('[data-relatedtrack="1"]').length && IRON.repeatStatus !== 'playlist' ){
          return;
        }
      }

      if (audioPlayer.notrackskip !== "on") {
        audioPlayer.hasPlayed = true;
        next(audioPlayer, $audio_el, playlist);
      } else {
        audioPlayer.removeClass("audio-playing");
        $('.srmp3_sonaar_ts_shortcode').removeClass("audio-playing");
      }
    });
    $($audio_el).on("timeupdate", function () {
      const duration = (this.duration == 'Infinity')? this.buffered.end(this.buffered.length-1) : this.duration;
      $(audioPlayer)
        .find('.album-player .sonaar_wave_cut, .sr-playlist-item.current .sonaar_wave_cut')
        .width(((this.currentTime + 0.35) / duration) * 100 + "%");
    });
  };

  function setTrackSoundwaveCursor($audioPlayer){
    if(!$audioPlayer.setTrackSoundwaveCursor || ! $audioPlayer.find('.srp_soundwave_wrapper').length) return;
    
    var player = $audioPlayer[0];
    var tooltip;
    var verticalLine;
    if (! $audioPlayer.find('.sr_tracklenght_tooltip').length){
      tooltip = document.createElement('div');
      tooltip.className = 'sr_tracklenght_tooltip';
      player.appendChild(tooltip);

      verticalLine = document.createElement('div');
      verticalLine.className = 'sr_tracklenght_tooltip_vertical';
      player.appendChild(verticalLine);
    }else{
       tooltip = document.querySelector('.sr_tracklenght_tooltip');
       verticalLine = document.querySelector('.sr_tracklenght_tooltip_vertical');
    }
    
    player.querySelectorAll('.srp_soundwave_wrapper .sonaar_fake_wave').forEach(function (element) {
      element.addEventListener('mousemove', function(e) {
        const timelineWidth = this.offsetWidth;
        const rect = this.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const trackLength = $(element).parents('.sr-playlist-item').data('tracktime');
        const duration = convertTime(trackLength);
        const time = (offsetX / timelineWidth) * duration;
        const fixedTooltipTopPosition = $(element).offset().top - $(player).offset().top;
        if (isNaN(time)) {
          return;
        }
        tooltip.innerText = formatTime(time);
        tooltip.style.transform = 'translateY(5px) scale(1)';
        tooltip.style.opacity = '1';
        tooltip.style.left = `${e.pageX - $(player).offset().left - 59}px`;
        tooltip.style.top = `${fixedTooltipTopPosition - 30}px`;

        verticalLine.style.display = 'block';
        verticalLine.style.height = `${this.offsetHeight+20}px`;
        verticalLine.style.left = `${e.pageX  - $(player).offset().left}px`;
        verticalLine.style.top = `${fixedTooltipTopPosition-10}px`;
      });

      element.addEventListener('mouseout', function() {
          tooltip.style.transform = 'translateY(20px) scale(0.5)';
          tooltip.style.opacity = '0';
          verticalLine.style.display = 'none';
      });
    });

    function convertTime(time) {
      const parts = time.split(':');
      return (+parts[0]) * 60 + (+parts[1]);
    }
    function formatTime(seconds) {
      const date = new Date(0);
      date.setSeconds(seconds);
      return date.toISOString().slice(11, 19);
    }
      
  }


  function ajaxInitPage() {
    setIronAudioplayers();
    resetsrp_vars();
    setStickyPlayer();
    stickyPlayerFromPageOption();
  }
  function startAjaxPreloaderAnim(player){
    player.find('.srp_shimmer_container').remove();
    player.find('.srp_notfound').css('display', 'none');
    const container = document.createElement('div');
    container.className = 'srp_shimmer_container';
    var cardWidthPercentage;
    var shimmerNum = player.find('.srp_list .sr-playlist-item').length;
    if(player.find('.srp_list .sr-playlist-item').length < 1){
        shimmerNum = player.srp_player_param.posts_per_page;
    }
    const gridColumns = (typeof player.srp_player_param.grid_column_number != 'undefined') ? player.srp_player_param.grid_column_number[0]: false;
    let playerlayout = 'list';
    if(gridColumns) {
        playerlayout = 'grid';
    }
    
    if (playerlayout === 'list') {
        const widths = ['40px', '50%', '10%', '10%', '10%', '2%' ,'2%'];
        for (let i = 0; i < shimmerNum; i++) { 
            const rowContainer = document.createElement('div');
            rowContainer.className = 'srp_shimmer_row';
    
            for (let j = 0; j < widths.length; j++) {
                const placeholder = document.createElement('div');
                placeholder.className = 'srp_shimmer_row_el';
                placeholder.style.flex = `0 0 ${widths[j]}`;

              if (j == 0){
                placeholder.style.height = '40px';
              }
            
              if( j>= widths.length-2){ // second last and last to be grow
                placeholder.style.flex = `1 0 ${widths[j]}`;
              }
                rowContainer.appendChild(placeholder);
            }
    
            container.appendChild(rowContainer);
        }
    
    } else if (playerlayout === 'grid') {

       cardWidthPercentage = 100 / player.srp_player_param.grid_column_number[0] - 0.5 + "%"; // Subtracting 2% for margins
      for (let i = 0; i < shimmerNum; i++) {
          const cardContainer = document.createElement('div');
          cardContainer.className = 'srp_shimmer_card';
          cardContainer.style.width = cardWidthPercentage; // Set card width based on columns per row
      
          const imagePlaceholder = document.createElement('div');
          imagePlaceholder.className = 'srp_shimmer_row_el';
          cardContainer.appendChild(imagePlaceholder);
      
          const shimmerHeights = ['30px', '20px', '20px'];
          for (const height of shimmerHeights) {
              const placeholder = document.createElement('div');
              placeholder.className = 'srp_shimmer_row_el';
              placeholder.style.height = height;
              cardContainer.appendChild(placeholder);
          }
      
          container.appendChild(cardContainer);
        }
        
    }
    // Append the container to the desired location
    player.find('.srp_list').css('display', 'none');
    player.find('.srp_list').before(container);
    if (playerlayout === 'grid'){
      var cardWidth = $('.srp_tracklist_grid .srp_shimmer_card').width()-50;
      $('.srp_tracklist_grid .srp_shimmer_card > .srp_shimmer_row_el:first-child').css('height', cardWidth + 'px');
      $('.srp_tracklist_grid .srp_shimmer_card').css('width', `calc(${cardWidthPercentage} - 10px)`);
    }

  }


  function reloadAjax(player = null, transition = false, forced = false, unsync = true){

    if(!player.lazy_load && !forced){
      return;
    }
    console.log('reload Ajax')
    if(typeof player.params == 'undefined'){
      player.params = {}; // this seems undefined when loading an initial player...
    }
    //return
    if (typeof IRON.removePlayerResizeListeners === 'function') {
      IRON.removePlayerResizeListeners(player.attr('data-id'));
    } 
    
    var num = srp_convertPlayerIdToPlayerNum(player.attr('data-id'));
   
    var maxDuration = 4000; 
    var interval = 100; 
    var elapsedTime = 0;
    var intervalId = setInterval(function() { //Set interval to wait for the player to be loaded: required for player inside a popup
    var playerIndex = srp_convertPlayerIdToPlayerNum(player.attr('data-id'));
    
        if (playerIndex !== null) {
        
            var playerId = player.attr('data-id').split('-');
            playerId = playerId[playerId.length - 1]; // get last element of the array
            if( (typeof window['srp_player_params_' + playerId] == 'undefined' || typeof window['srp_player_params_args_' + playerId] == 'undefined') && $('#srp_js_params_' + playerId).length){ //if player params are not set yet (for gutenberg block editor)              
              const scriptElement = document.getElementById('srp_js_params_' + playerId).textContent;
              const parts = scriptElement.split('var ').map(part => part.trim().replace(';', ''));
              const jsonObjects = parts.map(part => {
                const match = part.match(/(\w+)\s*=\s*(\{[^{}]+\})/);
                return match ? { variable: match[1], json: match[2] } : null;
              }).filter(Boolean);
              
              jsonObjects.forEach(obj => {
                window[`${obj.variable}`] = JSON.parse(`${obj.json}`);
              });    
            }

            var srp_player_param_args= window['srp_player_params_args_' + playerId];
            player.srp_player_param = window['srp_player_params_' + playerId];

            if(player.data("tracks-per-page")){
              player.srp_player_param['posts_per_page'] = player.data("tracks-per-page");
            }else{
              if(!player.hasClass('srp_player_is_recentlyPlayed')){
                player.srp_player_param['posts_per_page'] = 50; //if keep this low IF Ajax is activated and we dont have a tracks per page to prevent loading too many tracks. It can crash elementor editor.
              }
            }
            
            player.srp_player_param['srp_callFromAjax'] = 'true';
           
            let reformat_meta;
            if (player.params['meta'] && typeof player.params['meta'] === 'object') {
                reformat_meta = Object.entries(player.params['meta']).map(([key, value]) => `${key}:${value}`).join(';');
            }

            // meta
            player.srp_player_param['srp_meta'] = reformat_meta || '';
            
            // page
            player.srp_player_param['srp_page'] =  player.params['page']

            //order
            player.srp_player_param['srp_order'] =  player.params['order']

            // player id
            player.srp_player_param['srp_player_id'] = player.params['playerId']
 
            // search
            player.srp_player_param['srp_search'] =  player.params['search']
            //console.log(player.srp_player_param);
            player.srp_player_param['category'] =  player.data('category');
            
            if(transition){
              var $playlist = player.find('.srp_list');
              $playlist.css({ 'opacity': 0, 'transition': 'opacity 0.15s ease' });
              startAjaxPreloaderAnim(player);
            }
            var data = {
                'action': 'load_ajax_player',
                'nonce': sonaar_music.ajax.ajax_nonce,
                'args': srp_player_param_args,
                'parameters': player.srp_player_param,
            };
            //return;
            if (player.currentRequest) {
              player.currentRequest.abort(); // Abort the previous request
            }
            var isPlaying = player.hasClass('audio-playing');
            player.currentRequest = $.post(sonaar_music.ajax.ajax_url, data, function (response) {
                var parsedResponse = $(response);

                var newClassList = parsedResponse.find('.iron-audioplayer').attr('class');
                player.attr('class', newClassList);

                // Update the id and data-id attributes of .iron-audioplayer
                var newAudioPlayerId = parsedResponse.find('.iron-audioplayer').attr('id');
                var newAudioPlayerDataId = parsedResponse.find('.iron-audioplayer').attr('data-id');
                var newAudioPlayerUrlPlaylist = parsedResponse.find('.iron-audioplayer').attr('data-url-playlist');
                var newAudioPlayerTotalItems= parsedResponse.find('.iron-audioplayer').attr('data-total_items');
                var newAudioPlayerTotalPages = parsedResponse.find('.iron-audioplayer').attr('data-total_pages');
                player.attr('id', newAudioPlayerId);
                player.attr('data-id', newAudioPlayerDataId);
                player.attr('data-url-playlist', newAudioPlayerUrlPlaylist);
                player.attr('data-total_items', newAudioPlayerTotalItems);
                player.attr('data-total_pages', newAudioPlayerTotalPages);

                if (unsync){
                  IRON.sonaar.player.unsyncWidgetPlayers();
                }
                
                // Replace the content of the .srp_list div
               
                var newTracklistContent = parsedResponse.find('.srp_tracklist');
                player.find('.srp_tracklist').replaceWith(newTracklistContent);

                var newMiniPlayerMeta = parsedResponse.find('.album-player');
                player.find('.album-player').replaceWith(newMiniPlayerMeta);

                // Insert columnHeadings before srp_tracklist in the player
                var columnHeadings = parsedResponse.find('.sr-cf-heading');
                // Check if .sr-cf-heading exists within the player
                if (player.find('.sr-cf-heading').length == 0) {
                  player.find('.srp_tracklist').before(columnHeadings);
  
                }

                if(isPlaying && ! IRON.audioPlayer.stickyEnable){
                  player.addClass('audio-playing');
                  player.data('track_from_outer_page',true); //'track_from_outer_page' is true when player play a track from another ajax page(pagination)
                }
                
                var playerObj = Object.create(IRON.audioPlayer);
                playerObj.init(player);

                IRON.players[num] = playerObj;

                updatePaginationAjax(player);

                if (typeof IRON.advancedTriggers !== 'undefined') {
                  IRON.advancedTriggers.applyAllScenarios();
                }

                if(transition){
                  player.find('.srp_shimmer_container').remove(); // remove animation
                  $playlist.css('opacity',1); //show the playlist
                }
            }).fail(function() {
                console.log('An error occurred during the post operation.');
            }).always(function() {
              player.currentRequest = null; // Reset the request when it's complete.
          });
  
            clearInterval(intervalId);
        } else {
            if(transition){
              player.find('.srp_shimmer_container').remove();
              $playlist.css('opacity',1);
            }
            elapsedTime += interval;
            if (elapsedTime >= maxDuration) {
                clearInterval(intervalId);
            }
        }
    }, interval);
  }

//Make these functions accessible from IRON.audioPlayer
  return {
    init: initPlayer,
    getPlayer: getPlayer,
    play: getplay,
    autoplayEnable: autoplayEnable,
    triggerPlay: triggerPlay,
    stickyEnable: stickyEnable,
    ajaxInitPage: ajaxInitPage,
    setIronAudioplayers: setIronAudioplayers,
    fakeWaveClick: fakeWaveClick,
    karaokeMode: karaokeMode,
    sr_loadLyricsAjax: sr_loadLyricsAjax,
    updateMiniPlayer: updateMiniPlayer,
    setRandomList: setRandomList,
    setMediaSessionAPI: setMediaSessionAPI,
    checkArtWorkFullBg: checkArtWorkFullBg,
    seekTime: seekTime,
    reloadAjax: reloadAjax,
    next: next,
  };
  
})(jQuery);

function hideEmptyAttribut(string, selector) {
  if (string == "") {
    selector.css("display", "none");
  } else {
    selector.css("display", "block");
  }
}

//Set Sticky player if it is enable once
function setStickyPlayer() {
  if (isGutenbergActive()) { //Dont load the sticky player if we are in the guttenberg editor
    return;
  }
  var cookieSettingsValue = getCookieValue("sonaar_mp3_player_settings");
  if (
    (typeof srp_vars !== 'undefined' && srp_vars.sonaar_music.footer_albums != "" && srp_vars.sonaar_music.footer_albums != [""]) ||
    (sonaar_music.option.overall_sticky_playlist != null && sonaar_music.option.overall_sticky_playlist != [""]) ||
    cookieSettingsValue != ""
  ) {
    IRON.audioPlayer.stickyEnable = true;
  } else {
    jQuery(".iron-audioplayer").each(function () {
      if (jQuery(this).data("sticky-player")) {
        IRON.audioPlayer.stickyEnable = true;
      }
    });
  }
}

//Reset srp_vars on the ajaxify navigation
function resetsrp_vars() {
  var str = jQuery('script:contains("var srp_vars")').text();
  if (str !== "") {
    str = str.split("var srp_vars =")[1];
    srp_vars = JSON.parse(str.split(";")[0]);
  }
}

//Load Music player Content
function setIronAudioplayers(specificParentSelector) {
  $ = jQuery;

  //Set srp_linked to the audioplayer if a search or a selector widget interact with it
  $('.srp_search_container, .srp-filters-widget').each(function () {
    if( $(this).data('player-id') && $('#'+ $(this).data('player-id') + '.iron-audioplayer, #'+ $(this).data('player-id') + ' .iron-audioplayer' ).length ){
      $('#'+ $(this).data('player-id') + '.iron-audioplayer, #'+ $(this).data('player-id') + ' .iron-audioplayer' ).addClass('srp_linked');
    }else{
      $('.iron-audioplayer' ).eq(0).addClass('srp_linked');
    }
  })
  
  if (typeof IRON === 'undefined' || (typeof IRON !== 'undefined' && typeof IRON.audioPlayer === 'undefined'))
    return;
    
  if (typeof specificParentSelector !== "undefined") {
    if( $('#shortcode_builder').length ){
      return; //Avoid to set the player twice if we are in the shortcode builder. specificParentSelector is set when setIronAudioplayers is called from the widget inline script.
    }
    // set all audioplayers or only players inside a specific selector
    if (!specificParentSelector.includes('"') && !specificParentSelector.includes("'") && $('[data-id="' + specificParentSelector + '"]').hasClass('iron-audioplayer')) { //if specificParentSelector is the iron-audioplayer element (not parent)
      var playerSelector = $('[data-id="' + specificParentSelector + '"]');
    } else {
      var playerSelector = $(specificParentSelector + " .iron-audioplayer");
    }
    if (typeof IRON.players == "undefined") {
      IRON.players = []; //dont reset the IRON.players if they already exist and the setIronAudioplayers function is executed from sr-scripts.js
    }
  } else {
    var playerSelector = $(".iron-audioplayer");
    let protectedPlayer = [];
    if( typeof IRON.players != 'undefined'){
      for(const i in IRON.players) {  
        if(
            $(IRON.players[i].audioPlayer).parents(".elementor-widget-music-player").length || 
            $(IRON.players[i].audioPlayer).parents(".elementor-widget-woocommerce-products").length
          ){
            protectedPlayer.push(IRON.players[i]);
          }
      }
    }
    IRON.players = protectedPlayer;
  }

  playerSelector.each(function () {

    if (typeof specificParentSelector == "undefined" && $(this).parents(".elementor-widget-woocommerce-products").length) return;

    if (typeof specificParentSelector == "undefined" && $(this).parents(".elementor-widget-music-player").length) return;

    var player = Object.create(IRON.audioPlayer);
    player.init($(this));
    IRON.players.push(player);

    if ($('.iron-audioplayer').parents('#sonaar-modal').length) {
      //if player is in a modal we dont want to continue because it creates a bug if its parent is ajax.
      return;
    }

    if ( $('.iron-audioplayer').length - $('.elementor-location-popup').find('.iron-audioplayer').length == IRON.players.length){ //When is the last player to be init
      if( 
          $('.srp-filters-container').length || //filter dropdown widget
          $('.srp_filters_container').length || //filter tag widget
          $('.iron-audioplayer').find('.srp_search_container').length || 
          $('.iron-audioplayer').find('.sr-cf-heading').length || 
          $('.iron-audioplayer').find('.srp_pagination').length 
        ){
          srp_setSearchFiltersFromUrl();
        }
    }
  });
}
//Display stickyplayer from the page option
function stickyPlayerFromPageOption() {
  if (srp_vars.sonaar_music.footer_albums != "" && !IRON.sonaar.player.isPlaying && !IRON.sonaar.player.classes.continued) {
    if (Array.isArray(IRON.sonaar.player.playlistID)) {
      var currentPlaylist = IRON.sonaar.player.playlistID[0];
    } else {
      var currentPlaylist = IRON.sonaar.player.playlistID;
    }
    if (Array.isArray(srp_vars.sonaar_music.footer_albums)) {
      var newPlaylist = srp_vars.sonaar_music.footer_albums[0];
    } else {
      var newPlaylist = srp_vars.sonaar_music.footer_albums;
    }

    if (newPlaylist != currentPlaylist) {
      IRON.sonaar.player.currentTime = "";
      IRON.sonaar.player.totalTime = "";
      IRON.sonaar.player.setPlayer({
        id: srp_vars.sonaar_music.footer_albums,
        autoplay: false,
        soundwave: true,
        shuffle: srp_vars.sonaar_music.footer_albums_shuffle,
      });
    }
    return;
  }

  //Play from overall settings
  if (sonaar_music.option.overall_sticky_playlist != null && !IRON.sonaar.player.isPlaying && !IRON.sonaar.player.classes.continued) {
    if ( sonaar_music.option.sr_prevent_continuous_sticky_to_show === "true")
    return;
    
    // return if current page is edit post page
    if (window.location.href.indexOf('post.php') > -1 || window.location.href.indexOf('post-new.php') > -1)
    return;

    IRON.sonaar.player.currentTime = "";
    IRON.sonaar.player.totalTime = "";
    IRON.sonaar.player.setPlayer({
      id: sonaar_music.option.overall_sticky_playlist,
      autoplay: false,
      soundwave: true,
      shuffle: sonaar_music.option.overall_shuffle === "on" ? "1" : "",
    });
  }
}

var sonaarStatsTimeOut;
jQuery(document).on("sonaarStats", function (event, audioPlayer) {

  if( $('.elementor-editor-active').length ) return;

  if ($(audioPlayer).attr("id") == "sonaar-player") {
    var currentTrack = $(audioPlayer);
  } else {
    var currentTrackEQ = audioPlayer.data("currentTrack");
    var currentTrack = audioPlayer.find(".playlist .srp_list li").eq(currentTrackEQ);
  }
  clearTimeout(sonaarStatsTimeOut);

  sonaarStatsTimeOut = setTimeout(function () {
    if (!IRON.sonaar.player.classes.dontCountContinuous) {
      var trackTitle = currentTrack.attr("data-tracktitle");
      trackTitle = trackTitle.replace(/<span class="srp_trackartist">.*?<\/span>/g, '').trim();
      albumTitle = currentTrack.attr("data-albumtitle");
      fileURL = currentTrack.attr("data-audiopath");

      if (window['Matomo'] && sonaar_music.option.srmp3_use_matomo_mediaanalytics !== 'true'){
          console.log('send matomo stats for play');
          _paq.push(['trackEvent', 'MediaAudio', 'play', trackTitle ]);
      }

      if (typeof gtag === 'function' && srp_vars.sonaar_music.ga_tag) {
        gtag('event', 'played', {
          'event_category': '[Playlist Played] ' + albumTitle,
          'event_label': '[Track Played] ' + trackTitle,
          'non_interaction': true
        });
      }

      if (sonaar_music.option.srmp3_use_built_in_stats) {
        var target = currentTrack.attr("data-trackid") !== "" ? currentTrack.attr("data-trackid") : fileURL;
        var data = {
          action: "post_stats",
          nonce: sonaar_music.ajax.ajax_nonce,
          post_stats: {
            action: "play",
            target_title: trackTitle,
            target_url: target,
            page_title: sonaar_music.current_page.title,
            page_url: sonaar_music.current_page.url,
          },
        };
     
        jQuery.post(sonaar_music.ajax.ajax_url, data, function (response) { }); // this send stats in the wp db
      }
  
    }
    IRON.sonaar.player.classes.dontCountContinuous = false;
  }, 3000);
});

jQuery(document).on("click", ".iron-audioplayer .playlist .store-list a[download], #sonaar-player .track-store a[download]", function (event) {
  jQuery(document).trigger("sonaarTrackDownload", jQuery(this));
});

jQuery(document).on("sonaarTrackDownload", function (event, target) {
  if( $('.elementor-editor-active').length ) return;

  if ($(target).parents("#sonaar-player").length) {
    var currentTrack = jQuery(target).parents("#sonaar-player");
  } else {
    var currentTrack = jQuery(target).parents("li");
  }

  var trackTitle = currentTrack.attr("data-tracktitle");
  trackTitle = trackTitle.replace(/<span class="srp_trackartist">.*?<\/span>/g, '').trim();
  albumTitle = currentTrack.attr("data-albumtitle");
  fileURL = currentTrack.attr("data-audiopath");

  if (window['Matomo'] && sonaar_music.option.srmp3_use_matomo_mediaanalytics !== 'true'){
    console.log('send matomo stats for download');
    _paq.push(['trackEvent', 'MediaAudio', 'download', trackTitle + '[' + target_id + ']']);
  }

  if (typeof gtag === 'function' && srp_vars.sonaar_music.ga_tag) {
    console.log("GA - Download Tracked++");
    gtag('event', 'downloaded', {
      'event_category': '[Playlist Downloads] ' + albumTitle,
      'event_label': '[Track Download] ' + trackTitle,
      'non_interaction': true
    });
  }

  if (sonaar_music.option.srmp3_use_built_in_stats) {
    var target_id = currentTrack.data("trackid") !== "" ? currentTrack.data("trackid") : fileURL;
    var data = {
      action: "post_stats",
      nonce: sonaar_music.ajax.ajax_nonce,
      post_stats: {
        nonce: sonaar_music.ajax.ajax_nonce,
        target_title: trackTitle,
        target_url: target_id,
        page_title: sonaar_music.current_page.title,
        page_url: sonaar_music.current_page.url,
      },
    };
    
    jQuery.post(sonaar_music.ajax.ajax_url, data, function (response) { }); // this send stats in the wp db
  }
});

jQuery(document).ready(function () {
  setStickyPlayer();
  IRON.favorites.init();
  setIronAudioplayers();
  if (Boolean(sonaar_music.option.enable_continuous_player === "true") && !$("body").hasClass("wp-admin")) {
    if (!IRON.sonaar.player.preventContinuousUrl()) {
      sr_getCookieSettings();
    }
  } else if (IRON.audioPlayer.stickyEnable) {
    sr_getCookieVolume();
  }
  stickyPlayerFromPageOption();
  sr_filterInit();
  srp_getParamFromUrl();
  srp_initWC_JS();
  
});
 

// Function to handle the Ask for Email click on the CTA
function handleAskEmailClick(element, scenario = null, playerID = null, trackIdToSave = null) {
  //srp_wc_loadspinner(element);
  sr_setPopUp();
  
  // Initialize variables to hold the values
  var postId, trackPos, trackTitle, image_src, trackId, dataAudioPath;

  var playlistItem = element.closest('li.sr-playlist-item');
  var swiperSlide = element.closest('.swiper-slide');

  if (playlistItem.length) {
      postId = playlistItem.data('post-id');
      trackPos = playlistItem.data('track-pos');
      trackTitle = playlistItem.data('tracktitle');
      if(!postId){
        trackId = playlistItem.data('trackid');
        if(!trackId){
           dataAudioPath = playlistItem.data('audiopath');
        }
      }
      image_src = playlistItem.find('.sr_track_cover img').attr('src');
  } else if (swiperSlide.length) {
      postId = swiperSlide.data('post-id');
      trackPos = swiperSlide.data('track-pos');
      trackTitle = swiperSlide.find('.srp_swiper-track-title').text();
      image_src = swiperSlide.find('.srp_swiper-album-art').css('background-image').replace(/^url\(["']?/, '').replace(/["']?\)$/, ''); // Extract image URL
  } else {
      currentTrack = IRON.sonaar.player.currentTrack;
      postId = IRON.sonaar.player.list.tracks[currentTrack].sourcePostID;
      trackPos = IRON.sonaar.player.list.tracks[currentTrack].track_pos;
      trackTitle = IRON.sonaar.player.list.tracks[currentTrack].track_title;
      image_src = IRON.sonaar.player.list.tracks[currentTrack].poster;
  }

  //console.log("Values extracted:", { postId, trackPos, trackTitle, image_src, trackId, dataAudioPath });

  var nonce = sonaar_music.ajax.ajax_nonce;
  
  var data = {
      action: 'load_ask_for_email_popup_ajax',
      post_id: postId,
      track_pos: trackPos,
      track_title: trackTitle,
      image_src: image_src,
      nonce: nonce
  };


  //If a scenario is defined, add its id to the data object
  if (scenario) {
    data.scenario_id = scenario.id;
  }

  //console.log("AJAX request data for loading popup:", data);

  $.post(sonaar_music.ajax.ajax_url, data, function(response) {
      //console.log("AJAX response for loading popup:", response);
      response = JSON.parse(response);
      $('#sonaar-modal .sr_popup-body').html(response.html);

      if (!response.has_image) {
          $('.sr_popup-body').addClass('srp_popup_no_image');
      } else {
          $('.sr_popup-body').removeClass('srp_popup_no_image');
      }
      srp_askForEmailForm(postId, trackPos, trackId, dataAudioPath, scenario, playerID, element, trackIdToSave);
      sr_openPopUp();
      srp_wc_unloadspinner(element);
  }).fail(function() {
    console.error("Failed to load ask-for-email popup.");
  });
}
function srp_initWC_JS() {
  // Your existing logic
  $('.srp-make-offer-bt').on('click', function(event) {
      event.preventDefault();
  });

  // Check if we are in a single product page
  if (!$('.single-product').length) return;

  var form = document.querySelector(".variations_form");

  if (form && typeof srp_make_offer_variations !== 'undefined') {
    var variations = srp_make_offer_variations; // Use the global variable injected by PHP

    function handleVisibility(variationId) {
        var priceElement = form.querySelector(".woocommerce-variation-price");
        var addToCartButton = form.querySelector(".single_add_to_cart_button");
        var makeOfferButtons = document.querySelectorAll(".srp-make-offer-bt:not(.related .srp-make-offer-bt)");
        var variationsElement = form.querySelector(".woocommerce-variation-add-to-cart"); // Get the variations element

        var selectedVariation = variations.find(function(variation) {
            return variation.variation_id == variationId;
        });
        if (selectedVariation) {
            if (selectedVariation.make_offer_hide_price === "yes") {
                if (priceElement) priceElement.style.display = "none";
                if (addToCartButton) addToCartButton.style.display = "none";
            } else {
                if (priceElement) priceElement.style.display = "";
                if (addToCartButton) addToCartButton.style.display = "";
            }
        } else {
            if (priceElement) priceElement.style.display = "";
            if (addToCartButton) addToCartButton.style.display = "";
        }

        // Disconnect observer before DOM manipulation to prevent infinite loop
        observer.disconnect();

        makeOfferButtons.forEach(function(button) {
            var wrapper = button.closest(".srp-make-offer-btn-wrapper");

            // Move the "Make Offer" button before the "woocommerce-variation-add-to-cart" element
            if (variationsElement && wrapper && wrapper.parentNode !== variationsElement) {
                variationsElement.parentNode.insertBefore(wrapper, variationsElement);
            }

            if (button.getAttribute("data-variation") == variationId) {
                wrapper.style.display = "block"; // Show correct wrapper with Make Offer button
            } else {
                wrapper.style.display = "none"; // Hide other wrappers
            }
        });

        // Reconnect observer after DOM manipulation
        observer.observe(form.querySelector(".single_variation_wrap"), { childList: true, subtree: true });
    }

    var observer = new MutationObserver(function() {
        var variationId = form.querySelector(".variation_id").value;
        handleVisibility(variationId);
    });

    observer.observe(form.querySelector(".single_variation_wrap"), { childList: true, subtree: true });

    // Triggered when a variation is selected
    jQuery(form).on("found_variation", function(event, variation) {
        handleVisibility(variation.variation_id);
    });
}

}




function sr_filterInit(){
  setTimeout(function(){
    initFilterDropdowns();
    initFilterTags();
    initFilterRange();
  }, 0); // pushes the function execution to the end of the browser's event queue to allows filters in the popup working correctly
};

function initFilterDropdowns(){
  /*------------------------------
  START: FILTER DROPDOWNS
  ------------------------------*/
  var filterDropdown = document.querySelectorAll('[data-sr-dropdown-atts]');
  if(filterDropdown.length){
    sonaarFilter = Vue.component('sonaar-filters',{
      components: {
        Multiselect: window.VueMultiselect.default
      },
      template: `
      <div class="srp-filters-widget" :data-player-id="atts.playerid">
          <!--<label class="typo__label">{{atts.metakey}}</label>-->
          <multiselect :data-catid="atts.catid" :key="componentKey" :ref="atts.metakey"
              v-model="value"
              :options="atts.options"
              placeholder="Pick some"
              :multiple="(atts.selecttype == 'singleselect') ? false : true"
              :close-on-select="(atts.close_on_select) ? true : false"
              :clear-on-select="false"
              :preserve-search="false"
              :placeholder="atts.label"
              :hide-selected="false"
              :show-labels="false"
              :searchable="(atts.searchable) ? true : false"
              :readonly="true"
              label=""
              track-by=""
              :preselect-first="false"
              @remove="removeTag"
              @input="listAllAction"
              @select="dispatchAction"
              @close="closeEventHandler"
              :data-metakey="atts.metakey" 
              :data-label="atts.label"
          >
          <span slot="noResult">
            No matching options.
          </span>
       
              <template slot="selection" slot-scope="{ values, search, isOpen }">
                  <span class="multiselect__multiple"  v-if="values.length">{{ atts.label }} ({{ values.length }}+)</span>
              </template>
              <template slot="tag">{{ "" }}</template>
          </multiselect>
      </div>
      `,
      props: ['atts'],
      data: function() { return {
        componentKey: 0,
        value:this.initializeFilter(),
        
      } },
      mounted: function() {
        // open-on-init-only (can close after)
        // move content down when open (position relative vs position absolute)
      
        if(this.atts.open_on_init || this.atts.open_always){
          this.$refs[this.atts.metakey].$el.querySelector('.multiselect__content-wrapper').style.position = 'relative';
          this.$refs[this.atts.metakey].isOpen = true;
        }
      },
      methods: {
        closeEventHandler(){
          // open-always (cannot close)
          if(this.atts.open_always){
            this.$refs[this.atts.metakey].isOpen = true;
          }
        },
        initializeFilter(){
          const playerId = srp_getPlayerIdParamFromUrl();
          if( 
            this.atts.playerid == '' && playerId === null ||
            playerId == this.atts.playerid
          ){
            return srp_getMetaParams(this.atts.metakey);
          }
        },
        dispatchAction (value) {
          if (this.atts.selecttype == "singleselect"){
            // when dealing with single select
            this.removeTag();
          }

          srp_addMeta( this.atts.playerid, this.atts.metakey, value, this.atts.selecttype );

        },
        removeTag(value){
          srp_removeMeta( this.atts.metakey, value, this.atts.playerid, this.atts.selecttype);
        },
        listAllAction (values) {
        }
      },
    });

    filterDropdown.forEach(function(element) {
      var atts = JSON.parse(element.getAttribute('data-sr-dropdown-atts'));
      if (atts.options.length == 0)
      return;
  
      var playerId = atts.options[0].playerid;
      var player_cat_ids = [];

      if(playerId){
        var player = document.getElementById(playerId);
        if(player){
            var audioPlayer = player.querySelector('.iron-audioplayer');
            if (audioPlayer) {
              player_cat_ids = audioPlayer.getAttribute('data-category');
              player_cat_ids = player_cat_ids.split(',').map(Number);
            }
        }
      }
  
      if (player_cat_ids.length > 0 && atts.options) { // Added the check for showOnlyIds.length > 0
        atts.options.forEach(filter => {
            if (filter.term_ids) {
                const filteredOptions = [];
                const filteredTermIds = [];
                filter.term_ids.forEach((id, index) => {
                    if (player_cat_ids.includes(id)) {
                        filteredOptions.push(filter.options[index]);
                        filteredTermIds.push(id);
                    }
                });

                // Update filter with the filtered values only if there were matching IDs
                if (filteredOptions.length > 0) {
                    filter.options = filteredOptions;
                    filter.term_ids = filteredTermIds;
                }
            }
        });
      }
      const vm = new Vue({
          el: element,
          data: {},
          template: '<div :id="atts.id" class="srp-filters-container">' +
              '<sonaar-filters v-for="(filter, index) in atts.options" :atts="filter"/>' +
              '</div>',
          created: function() {
              this.atts = atts;
          }
      });
      myVueAr.push(vm);
    });
  
  }else{  
    myVueAr.forEach(function(vm){ //replacing the filter dropdowns with the new ones
      $('#'+ $(vm.$el).attr('id') ).replaceWith( vm.$el )
    })
  }
  /*------------------------------
  END: FILTER DROPDOWNS
  ------------------------------*/
}
function initFilterTags(){
  /*------------------------------
  START: FILTER TAGS
  ------------------------------*/
  var filterTags = document.querySelectorAll('[data-sr-tags-atts]');

  if(!filterTags.length){
    myVueTag.forEach(function(vm){ //replacing the filter tags with the new ones
      $('#'+ $(vm.$el).attr('id') ).replaceWith( vm.$el )
    })
    return;
  } 

    var filterButtonColors=['#E2675A','#FFA374', '#FDECB3','#FACA83','#FFCFD7', '#7E69FF','#EDFFAE','#9BC48D', '#D4FDE1','#CDF1F8','#B9C1E3', '#AE98E5','#7DB04D','#CCE780', '#8393CC','#00BFAF','#10A4EE', '#BFFB00','#FF94A6','#F7F47C', '#5171E4'];
    filterButtonColors = [...Array(3)].flatMap(() => filterButtonColors);

  

    Vue.component('sonaar-tags', {
      template: `
      <div class="srp-tags-widget">
          <div v-for="tagGroup in atts.options" class="srp_filter_container" :key="tagGroup.label" :data-randomcolor="tagGroup.randomcolor">
              <div class="srp_filter_button_label">{{ tagGroup.label }}</div>
              <transition-group name="list" tag="ul" class="srp_filter_buttons_list">
              <li v-for="(tagValue, index) in (showAllTags[tagGroup.label] ? tagGroup.options : limitedOptions(tagGroup))"
              :key="tagValue">
                      <div 
                          :class="['srp_filter_button', isActive(tagGroup, tagValue) ? 'srp_filter_button--active' : '']"
                          :style="getTagColor(tagGroup, index)"
                          :data-selecttype="tagGroup.selecttype"
                          :data-label="tagGroup.label"
                          :data-metakey="tagGroup.metakey"
                          :data-playerid="tagGroup.playerid"
                          :data-value="tagValue"
                          :data-cat="tagGroup.term_ids[index]"
                          @click="tagClicked(tagGroup, tagValue)">{{ tagValue }}</div>
                  </li>
              </transition-group>
              <div v-if="!showAllTags[tagGroup.label] && tagGroup.options.length > getItemsPerPage(tagGroup)">
                <a href="#" @click.prevent="toggleShowAll(tagGroup)" class="srp-filter-more-link">{{ tagGroup.show_more_label }}</a>
              </div>
              <div v-if="showAllTags[tagGroup.label] && tagGroup.options.length > getItemsPerPage(tagGroup)">
                  <a href="#" @click.prevent="toggleShowAll(tagGroup)" class="srp-filter-more-link">{{ tagGroup.show_less_label }}</a>
              </div>
          </div>
      </div>
      `,
    
      props: ['atts'],
      data: function() {
        const state = this.initializeState();
        return {
            showAllTags: state.showAllTags,
            activeTags: state.activeTags,
            filterButtonColors: filterButtonColors
        };
      },

      methods: {
        initializeState() {
          const initialState = {
              showAllTags: {},
              activeTags: []
          };
          const playerId = srp_getPlayerIdParamFromUrl();
      
          if (this.atts && this.atts.options) {
              this.atts.options.forEach(tagGroup => {
                  initialState.showAllTags[tagGroup.label] = false;  // Initialize showAllTags for each group
      
                  if ((tagGroup.playerid === '' && playerId === null) || playerId == tagGroup.playerid) {
                      let groupActiveTagsValues = srp_getMetaParams(tagGroup.metakey);
                      
                      if (groupActiveTagsValues) { 
                          // Convert tag values to identifiers
                          let groupActiveTags = groupActiveTagsValues.map(tagValue => this.getTagIdentifier(tagGroup, tagValue));
                          initialState.activeTags = [...initialState.activeTags, ...groupActiveTags];  // Populate activeTags array
                      }
                  }
              });
          }
      
          return initialState;
        },
        getItemsPerPage(tagGroup) {
          if (tagGroup.items_per_page === "all" || tagGroup.options.length <= Number(tagGroup.items_per_page)) {
              return Infinity;
          } else {
              return Number(tagGroup.items_per_page);
          }
        },
        toggleShowAll(tagGroup) {
          this.$set(this.showAllTags, tagGroup.label, !this.showAllTags[tagGroup.label]);
        },
        limitedOptions: function(tagGroup) {
          if (tagGroup.items_per_page === "all") {
              return tagGroup.options;
          } else {
              return tagGroup.options.slice(0, tagGroup.items_per_page);
          }
        },
        tagClicked(tagGroup, tagValue) {
            let tagIdentifier = this.getTagIdentifier(tagGroup, tagValue);
            
            if (this.isActive(tagGroup, tagValue)) {
                // Remove the tagIdentifier from the activeTags list
                this.activeTags = this.activeTags.filter(tag => tag !== tagIdentifier);
                srp_removeMeta(tagGroup.metakey, tagValue, tagGroup.playerid, tagGroup.selecttype);
              } else {
                  if (tagGroup.selecttype === 'singleselect') {
                      this.activeTags= [];
                      srp_removeMeta(tagGroup.metakey, null, tagGroup.playerid, tagGroup.selecttype);
                  }
                  this.activeTags.push(tagIdentifier);
                  srp_addMeta(tagGroup.playerid, tagGroup.metakey, tagValue, tagGroup.selecttype);
              }
        },
        isActive(tagGroup, tagValue) {
            let tagIdentifier = this.getTagIdentifier(tagGroup, tagValue);
            return this.activeTags.includes(tagIdentifier);
        },
        getTagIdentifier(tagGroup, tagValue) {
            return tagGroup.metakey + "_" + tagValue;
        },
        getTagColor(tagGroup, index) {
          const isActive = this.isActive(tagGroup, tagGroup.options[index]);
          const color = filterButtonColors[index % filterButtonColors.length];

          return tagGroup.randomcolor === 'true' && isActive ? { backgroundColor: color, borderColor: color } : {};
        },
      }
    });


    filterTags.forEach(element => {
      const atts = JSON.parse(element.getAttribute('data-sr-tags-atts'));

      if (atts.options.length == 0)
      return;
      
      var playerId = atts.options[0].playerid;
      var player_cat_ids = [];

      if(playerId){
        var player = document.getElementById(playerId);
        if(player){
            var audioPlayer = player.querySelector('.iron-audioplayer');
            if (audioPlayer) {
              player_cat_ids = audioPlayer.getAttribute('data-category');
              player_cat_ids = player_cat_ids.split(',').map(Number);
            }
        }
      }

      if (player_cat_ids.length > 0 && atts.options) { // Added the check for showOnlyIds.length > 0
        atts.options.forEach(filter => {
            if (filter.term_ids) {
                const filteredOptions = [];
                const filteredTermIds = [];
                filter.term_ids.forEach((id, index) => {
                    if (player_cat_ids.includes(id)) {
                        filteredOptions.push(filter.options[index]);
                        filteredTermIds.push(id);
                    }
                });

                // Update filter with the filtered values only if there were matching IDs
                if (filteredOptions.length > 0) {
                    filter.options = filteredOptions;
                    filter.term_ids = filteredTermIds;
                }
            }
        });
      }
      
      const vm = new Vue({
        el: element,
        data: { atts },
        template: '<sonaar-tags :id="atts.id" :atts="atts"/>'
      });
      
      myVueTag.push(vm);
  });


  /*------------------------------
  END: FILTER TAGS
  ------------------------------*/
}

function initFilterRange(){
  /*------------------------------
  START: DOUBLE RANGE SELECTOR
  ------------------------------*/
  Vue.component('vue-slider', window['vue-slider-component']);

  const sonaarDoubleRangeSelector = Vue.component('sonaar-double-range-selector', {
    template: `
    <div class="srp_range_container">
      <div class="srp_range_header">
        <div class="srp_filter_button_label">{{ sliderData.label }}</div>
        <div class="srp_range_value">{{ formattedSliderValue[0] }} - {{ formattedSliderValue[1] }} {{ sliderData.unit }}</div>
      </div>
      <vue-slider 
      v-model="sliderValue" 
      :tooltip="'focus'" 
      :marks="marks" 
      :min="computedMin" 
      :max="computedMax"
      :lazy="true"
      @change="updateRange" 
      :data-metakey="sliderData.metakey"
      :data-label="sliderData.label"
      >
        <template v-slot:tooltip="{ value }">
          <div class="vue-slider-dot-tooltip-inner vue-slider-dot-tooltip-inner-top">
            <span v-if="option.selecttype === 'time'" class="vue-slider-dot-tooltip-text">{{ secondsToTime(value) }}</span>
            <span v-else class="vue-slider-dot-tooltip-text">{{ value }}</span>
          </div>
        </template>
      </vue-slider>
      <div class="srp_range_buttons" v-if="option.selecttype === 'tempo'">
        <button class="srp_filter_button" @click="setTempoRange('slow')">Slow</button>
        <button class="srp_filter_button" @click="setTempoRange('medium')">Medium</button>
        <button class="srp_filter_button" @click="setTempoRange('fast')">Fast</button>
      </div>
    </div>
    `,
    props: ['option'],
    computed: {
        sliderValue: function() {
          //console.log(this.computedMin, this.computedMax);
            return [this.computedMin, this.computedMax];
        },
        computedMin: function() {
            if (this.option.selecttype === 'time') {
                return timeToSeconds(this.option.min);
            }
            let minVal = (!isNaN(this.option.min) && this.option.min !== null && this.option.min !== "") ? Number(this.option.min) : 0;
            return minVal;
        },
        computedMax: function() {
            if (this.option.selecttype === 'time') {
                return timeToSeconds(this.option.max);
            }
            let maxVal = (!isNaN(this.option.max) && this.option.max !== null && this.option.max !== "") ? Number(this.option.max) : 100;
            return maxVal;
        },
        formattedSliderValue: function() {
          if (this.option.selecttype === 'time') {
              return this.sliderValue.map(value => secondsToTime(value));
          } else {
              return this.sliderValue;
          }
        },
        marks: function() {
            function customRound(n) {
                n = Math.round(n);
                let lastDigit = n % 10;
                if (lastDigit < 3) {
                    return n - lastDigit;
                } else if (lastDigit < 8) {
                    return n + (5 - lastDigit);
                } else {
                    return n + (10 - lastDigit);
                }
            }
            let interval = (this.computedMax - this.computedMin) / 4; 
            let rawMarks = Array.from({ length: 5 }).map((_, idx) => customRound(this.computedMin + interval * idx));
        
            // If select type is 'time', convert the marks from seconds to HH:MM:SS format
            if (this.option.selecttype === 'time') {
                return rawMarks.reduce((acc, mark) => {
                    acc[mark] = secondsToTime(mark);
                    return acc;
                }, {});
            }
            return rawMarks.reduce((acc, mark) => {
                acc[mark] = mark.toString();
                return acc;
            }, {});
            }
    },
    data: function() {
      //console.log(this.option);
      return {
         // sliderValue: [null, null], // Temporary values
         sliderValue: this.option.selecttype === 'time' ? 
         [timeToSeconds(this.option.min), timeToSeconds(this.option.max)] : 
         [null, null],
          sliderData: {
              label: this.option.label,
              metakey: this.option.metakey,
              playerid: this.option.playerid,
              unit: this.option.unit
          }
      };
    },
    mounted: function() {
      this.sliderValue = [Number(this.computedMin), Number(this.computedMax)];

      let searchParams = new URLSearchParams(window.location.search);
      let playerIdQuery = searchParams.get('srp_player_id');

      if (playerIdQuery === this.sliderData.playerid) {
          let metaKeyQuery = searchParams.get('srp_meta');
          let decodedMetaKeyQuery = decodeURIComponent(metaKeyQuery);
          let metas = decodedMetaKeyQuery.split(';');
          metas.forEach((meta) => {
              let [key, value] = meta.split(':');
              if (key.endsWith('_minmax') && key.slice(0, -7) === this.sliderData.metakey) {
                  this.sliderValue = value.split('_').map(val => Number(val));
              }
          });
      }
      IRON.rangeSelector.push(this);
    },
    
    methods: {
      setTempoRange(tempo) {
        switch (tempo) {
          case 'slow':
            this.sliderValue = [this.computedMin, 64];
            break;
          case 'medium':
            this.sliderValue = [65, 115];
            break;
          case 'fast':
            this.sliderValue = [116, this.computedMax];
            break;
        }
        this.updateRange();
      },
      getUrlParams() {
        let vars = {};
        window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
            vars[key] = value;
        });
        return vars;
      },
      updateRange() {
          srp_removeMeta(this.sliderData.metakey, null, this.sliderData.playerid, 'range');
          srp_addMeta(this.sliderData.playerid, this.sliderData.metakey, this.sliderValue.join('_'), 'range'); // This will now use the updated slider values
      }
  }
});



var rangeSelectors = document.querySelectorAll('[data-sr-range-atts]');

if(!rangeSelectors.length){
  myVueRange.forEach(function(vm){ //replacing the filter Range with the new ones
    $('#'+ $(vm.$el).attr('id') ).replaceWith( vm.$el )
  })
  return;
} 
  
rangeSelectors.forEach(function(element) {
    var atts = JSON.parse(element.getAttribute('data-sr-range-atts'));
    const vm = new Vue({
      el: element,
      data: {
          atts
        },
      template: `
          <div :id="atts.id" class="srp_range_wrapper">
              <sonaar-double-range-selector 
                  v-for="option in atts.options" 
                  :key="option.metakey"
                  :option="option">
              </sonaar-double-range-selector>
          </div>
      `
  });
  myVueRange.push(vm);
});

}
// Helper function to convert second string to time format
function secondsToTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  let result;
  if (hours > 0) {
      result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else if (minutes > 0) {
      result = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
      result = `00:${secs.toString().padStart(2, '0')}`;
  }
  //console.log(`Input seconds: ${seconds}, Formatted time: ${result}`);
  return result;
}

// Helper function to convert time string to seconds
function timeToSeconds(timeStr) {
  const parts = timeStr.split(":").map(part => parseInt(part, 10));

  if (parts.length === 3) { // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) { // MM:SS format
      return parts[0] * 60 + parts[1];
  } else {
      return 0;
  }
}

function updateFilterSelector(metaParams, playerId = null){
  // updates options from filters dropdown
  for (const myVue in myVueAr){
    const vm = myVueAr[myVue];
    if( typeof vm != 'undefined'){
      if($(vm.$el).find('.srp-filters-widget').data('playerId') == playerId){
        for(const i in vm.$children){
          let params = metaParams[vm.$children[i].atts.metakey]
          if(typeof params == 'string'){
            vm.$children[i].value = params.split(',');
          }else{
            vm.$children[i].value = [];
          }
        }
      }
    }
  }
}

let debounceTimeout;

function sr_addTrackToPlaylist(track, $player, playlistName = 'RecentlyPlayed', mustPlayToProceed = true, maxPlaylistSize = 50, playerStateClass = 'srp_player_is_recentlyPlayed', debounceDelay = 3000) {
  if(sonaar_music.option.is_user_history_usermeta_enabled !== "true") return;
  
  isSrcLoaded = (typeof $("#sonaar-audio").attr("src") == "undefined") ? false : true;

    function executeTrackLogic() {
        let trackId;
        let trackPos;

        // Determine if the player is in the specified state
        if (typeof IRON.sonaar.player.list.tracks[0] !== 'undefined') {

            if(IRON.sonaar.player.continuous && isSrcLoaded === false) return; // if continuous player is loaded from Cookie and track is not set yet

            if(mustPlayToProceed && !IRON.sonaar.player.isPlaying) return;

            if (IRON.sonaar.player.selectedPlayer !== null && IRON.sonaar.player.selectedPlayer !== undefined) {
                if (IRON.sonaar.player.selectedPlayer.hasClass(playerStateClass)) {
                    return; // if we want to prevent the current player from auto-adding its track
                }
            }
            //console.log("here"); // This will only log if the above condition is false
            if (typeof track !== 'undefined') {
                if (typeof track.sourcePostID !== 'undefined') {
                    trackId = track.sourcePostID;
                    trackPos = track.track_pos;
                }
            } else {
                console.error('No track information available');
                return;
            }
        } else if (typeof $player !== 'undefined' && !$player.hasClass(playerStateClass)) {
          if (mustPlayToProceed && track.length === 0) return;
            trackId = $(track).data('post-id');
            trackPos = $(track).data('track-pos');
        } else {
            return;
        }

        if (!trackId) {
            console.error('Track ID is undefined');
            return;
        }

        // Construct trackInfo object
        const trackInfo = {
            postId: trackId.toString(),
            trackPos: trackPos ? trackPos.toString() : '0',
        };

        // Handle the playlist
        let playlistIndex = IRON.userPlaylists.findIndex(playlist => playlist.playlistName === playlistName);
        if (playlistIndex === -1) {
            IRON.userPlaylists.push({
                playlistName: playlistName,
                tracks: [trackInfo]
            });
        } else {
            let tracks = (typeof IRON.userPlaylists[playlistIndex].tracks === 'undefined') ? [] : IRON.userPlaylists[playlistIndex].tracks;
            tracks.unshift(trackInfo);
            IRON.userPlaylists[playlistIndex].tracks = tracks.slice(0, maxPlaylistSize);
        }

        // Update server or cookies based on system setup
        updatePlaylistStorage();
    }

    if (debounceDelay > 0) {
        clearTimeout(debounceTimeout);  // Clear existing timeout
        debounceTimeout = setTimeout(() => {
            executeTrackLogic();
        }, debounceDelay);
    } else {
        executeTrackLogic();
    }
}




function updatePlaylistStorage() {
  if (srp_vars.is_logged_in === 'no' && sonaar_music.option.is_user_history_cookie_enabled === "true" ) {
      document.cookie = "sonaar_mp3_playlists=" + encodeURIComponent(JSON.stringify(IRON.userPlaylists)) + "; max-age=31536000; path=/;";
      //check if $('.srp_player_is_recentlyPlayed') exist
      if ($('.srp_player_is_recentlyPlayed').length) {
        IRON.audioPlayer.reloadAjax($('.srp_player_is_recentlyPlayed'), false, true, false);
      }
  } else if (srp_vars.is_logged_in === 'yes') {
      $.ajax({
          url: sonaar_music.ajax.ajax_url,
          type: 'POST',
          dataType: 'json',
          data: {
              action: 'update_user_playlist',
              nonce: sonaar_music.ajax.ajax_nonce,
              playlists: IRON.userPlaylists
          },
          success: function (response) {
              //console.log(response);
              //console.log(IRON.userPlaylists);
              if ($('.srp_player_is_recentlyPlayed').length) {
                IRON.audioPlayer.reloadAjax($('.srp_player_is_recentlyPlayed'), false, true, false);
              }
          }
      });
  }
}

function sr_setCookieSettings() {
  if (IRON.sonaar.player.classes.feedUrl && !IRON.sonaar.player.elWidgetId) {
    // Escape and delete cookies if the player is not playing a playlist post
    document.cookie = "sonaar_mp3_player_settings" + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "sonaar_mp3_player_time" + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    return;
  }

  let track_Id;
  if(typeof IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack] != 'undefined' && typeof IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack].track_index != 'undefined'){
    track_Id = IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack].track_index;
  }else{
    track_Id = IRON.sonaar.player.currentTrack;
  }
  
  var playlistID, categoryID;

  if( IRON.sonaar.player.playlistID != null){
    playlistID = IRON.sonaar.player.playlistID.toString().split(", ");
  }else{
    playlistID = '';
  }
  if( IRON.sonaar.player.categoryID != null){
    categoryID = IRON.sonaar.player.categoryID.toString().split(", ");
  }else{
    categoryID = '';
  }

  cvalue = {
    playlistID: IRON.sonaar.player.elWidgetId ? IRON.sonaar.player.postId : playlistID,
    category: categoryID,
    trackID: track_Id ,
    elWidgetId: IRON.sonaar.player.elWidgetId,
    shuffle: IRON.sonaar.player.shuffle,
    mute: IRON.sonaar.player.mute,
    isPlaying: IRON.sonaar.player.isPlaying,
    minimize: IRON.sonaar.player.minimize,
    json: IRON.sonaar.player.cookieSetting.json, //Required for the continuous player with Post Related or "audio_meta_field" shorcode attribute as source
  };

  if (cvalue.playlistID == "" && cvalue.category == "") {
    //Verify cookie value
    return;
  }

  var now = new Date();
  var expires = (typeof sonaar_music.option.srmp3_cookie_expiration !== 'undefined') ? sonaar_music.option.srmp3_cookie_expiration : 3600;
  if(expires !=='default'){
    now.setTime(now.getTime() + expires * 1000); // Set the expiration time to 10 seconds from now
    expires = "expires=" + now.toUTCString();
  }
  document.cookie = "sonaar_mp3_player_settings" + "=" + JSON.stringify(cvalue) + ";" + expires + ";path=/";
}

function sr_setCookieVolume() {
  document.cookie = "sonaar_mp3_player_volume" + "=" + IRON.sonaar.player.volume + ";default;path=/";
}

function sr_setCookieTime() {
  if (IRON.sonaar.player.classes.continuousPlayer && ((IRON.sonaar.player.elWidgetId && IRON.sonaar.player.classes.feedUrl) || !IRON.sonaar.player.classes.feedUrl)) {
    // If Continuous player is enable AND if playlist is not built through a shortcode.
    var cvalue = sr_getTrackCurrentTime();
    document.cookie = "sonaar_mp3_player_time" + "=" + cvalue + ";default;path=/";
  }
}

function sr_getCookieSettings() {
  var cookieSettingsValue = getCookieValue("sonaar_mp3_player_settings");
  var cookieVolumeValue = getCookieValue("sonaar_mp3_player_volume");
  var cookieTimeValue = getCookieValue("sonaar_mp3_player_time");

  if (cookieSettingsValue != "") {
    cookieSettingsValue = JSON.parse(cookieSettingsValue);
    sr_setPlayerfromCookieSettings(cookieSettingsValue, cookieVolumeValue);
  } else {
    sr_setVolume(cookieVolumeValue);
  }
  if (cookieTimeValue != "") {
    sr_setTrackCurrentTime(cookieTimeValue);
  }
}

function sr_getCookieVolume() {
  const cookieVolumeValue = getCookieValue("sonaar_mp3_player_volume");
  sr_setVolume(cookieVolumeValue);
}

function getCookieValue(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function sr_setPlayerfromCookieSettings(playerSetting, cookieVolumeValue) {
  IRON.sonaar.player.setPlayer({
    id: playerSetting.playlistID,
    category: playerSetting.category,
    elwidgetid: playerSetting.elWidgetId,
    trackid: playerSetting.trackID,
    shuffle: playerSetting.shuffle,
    json: playerSetting.json,
    continuous: true
  });
  var firstLoad = true;

  sr_setVolume(cookieVolumeValue);
  sr_setMute(playerSetting.mute);
  if (playerSetting.isPlaying) {
    $("#sonaar-audio").on("loadeddata", function () {
      //when the audio element is loaded
      if (firstLoad) {
        //Dont want to SET current time on the second audio loading.
        firstLoad = false;
        IRON.sonaar.player.playAudio();
      }
    });
  }
  
  IRON.sonaar.player.classes.dontCountContinuous = true;
  IRON.sonaar.player.classes.continued = true;
  IRON.sonaar.player.minimize = playerSetting.minimize;
  IRON.sonaar.player.postId = playerSetting.playlistID;
  IRON.sonaar.player.elWidgetId = playerSetting.elWidgetId;
  IRON.sonaar.player.classes.feedUrl = IRON.sonaar.player.elWidgetId ? true : false;
  IRON.sonaar.player.cookieSetting.json = playerSetting.json; //Required for the continuous player with Post Related or "audio_meta_field" shorcode attribute as source
}

function sr_getTrackCurrentTime(audioPlayer = null) {
  if (IRON.audioPlayer.stickyEnable){
    return document.getElementById("sonaar-audio").currentTime;
  }else if(audioPlayer != null){
    const audioInstance = sr_setAudioElementInstance(audioPlayer);
    return audioInstance.currentTime;
  }   
}

function sr_getTrackDuration() {
  return document.getElementById("sonaar-audio").duration;
}

function sr_setTrackCurrentTime(value) {
  IRON.sonaar.player.cookieSetting.currentTime = value;

  var firstLoad = true;
  $("#sonaar-audio").on("loadeddata", function () {
    //when the audio element is loaded
    if (firstLoad) {
      //Dont want to SET current time on the second audio loading.
      firstLoad = false;

      if (value > sr_getTrackDuration() || sr_getTrackDuration() == "Infinity") return;

      document.getElementById("sonaar-audio").currentTime = value;
    }
  });
  
}

//Set Modal Popup
let sr_modal_loaded = false;
const closeSvg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 32 32" style="enable-background:new 0 0 32 32;" xml:space="preserve"><g><rect x="15.5" y="3.3" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -6.6274 16)" width="2" height="25.5"></rect><rect x="3.3" y="15.5" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -6.6274 16)" width="25.5" height="2"></rect></g></svg>';
function sr_setPopUp() {
  if (sr_modal_loaded !== true) {
    const popUp = '<div id="sonaar-modal" onclick="sr_closePopUp(this);"><div class="sr_popup-dialog"><div class="sr_popup-content"><div class="sr_close" onclick="sr_closePopUp(this)">' + closeSvg + '</div><div class="sr_popup-body"></div></div></div></div><div class="sr_popup-backdrop"></div>';
    jQuery('body').append(popUp);
    sr_modal_loaded = true;
  }
}


function sr_popUp(id, storeId, trackNumber = null, playerId = null, el) {
  srp_wc_loadspinner($(el))
  var data = {
    'action': 'load_post_by_ajax',
    'id': id,
    'store-id': storeId,
    'nonce': sonaar_music.ajax.ajax_nonce
  };
  $.post(sonaar_music.ajax.ajax_url, data, function (response) {
    srp_wc_unloadspinner($(el))
    response = srp_convertTTMLTime(JSON.parse(response));
    $('#sonaar-modal .sr_popup-body').html(response);
    $('#sonaar-modal').attr('data-track-number', trackNumber);
    $('#sonaar-modal').attr('data-player-id', playerId);
    sr_openPopUp();
  })
}
function sr_openPopUp() {
  $(document).keyup(function (e) {
    if (e.key === "Escape") {
      sr_closePopUp();
    }
  });
  sr_popup_maybe_apply_bg_img();
  $('body').addClass('sr_popup-open');
  $('#sonaar-modal, .sr_popup-backdrop').addClass('sr_show');
}
function sr_popup_maybe_apply_bg_img() {
  // Find the first image in the modal
  var $img = $('#sonaar-modal').find('img').first();
  if ($img.length > 0) {
    if(sonaar_music.option.cta_popup_background_image !== 'true') return;
    var imgUrl = $img.attr('src');

    // Add the has-bg-image class and dynamically inject the background image
    $('#sonaar-modal').addClass('has-bg-image');
    
    // Inject CSS to the ::before pseudo-element
    var styleTag = $('#sr-popup-bg-style');
    if (styleTag.length === 0) {
      $('head').append('<style id="sr-popup-bg-style"></style>');
      styleTag = $('#sr-popup-bg-style');
    }

    styleTag.html(`
      #sonaar-modal.has-bg-image .sr_popup-content::before {
        background-image: url('${imgUrl}');
      }
    `);
  } else {
    // Remove the background image if no image is found
    $('#sonaar-modal').removeClass('has-bg-image');
    
    // Remove the injected style if there's no background image
    $('#sr-popup-bg-style').remove();
  }
}

function sr_closePopUp(el) {

  // Prevent popup to be clicked outside and close if contain a form
  if (el !== undefined) {
    if (!$(el).hasClass('sr_close') && $('#sonaar-modal').find('input').length > 0) {
      return; // Exit the function and don't close the modal if it's a "Make Offer" form
    }
  }
  if ($(el).attr('id') == 'sonaar-modal' && $(".sr_popup-dialog:hover").length != 0) { //When "sr_closePopUp" function is cast from a click on 'sonaar-modal' we want exit the fucntion if the cursor is over the popup content.
    return;
  }
  //$(document).off(); // this conflict with Elementor Popup that does not open once our popup has been opened.
  $('body').removeClass('sr_popup-open');
  $('#sonaar-modal, .sr_popup-backdrop').removeClass('sr_show');
}

function sr_audioSkipTo(seconds = 30, $audio_el = null) {
  const audioInstance = sr_setAudioElementInstance();
  audioInstance.currentTime = audioInstance.currentTime + seconds;
}

function srp_toggleLyricsContainer() {
  if ($('#srmp3_lyrics_container').hasClass("open")) {
    $('#srmp3_lyrics_container').toggleClass("open");
    $('#srmp3_lyrics_container').toggle();
  }
}

// embed Lyrics
//let sr_lyric_loaded = false;

function sr_setLyricsPlayingContainer() {

  if (sr_lyric_loaded !== true) {
    const popUp = '<!-- Lyrics Now Playing --><div id="srmp3_lyricsplaying_container"></div><div id="srmp3_lyrics_container" style="display:none;"><i class="sricon-close-circle"></i><div class="srmp3_lyrics"></div></div>';
    jQuery('body').append(popUp);
    document.getElementById("srmp3_lyricsplaying_container").addEventListener("click", toggleLyrics);
    function toggleLyrics() {
      $('#srmp3_lyrics_container').toggle();
      $('#srmp3_lyrics_container').toggleClass("open");
    }

    var scrollItem = $('#srmp3_lyrics_container .srmp3_lyrics')[0];
    var ps = new PerfectScrollbar(scrollItem, {
      wheelSpeed: 1,
      swipeEasing: true,
      wheelPropagation: false,
      minScrollbarLength: 20,
      suppressScrollX: true,
      maxScrollbarLength: 100,
    });

    $('#srmp3_lyrics_container .srmp3_lyrics').on('scroll', function () {
      if (!srp_lyricsAreScrolling) {
        if ($('#srmp3_lyrics_container').hasClass('srp_lyric_unlock')) {
          const srmp_lyrics_pos = $('#srmp3_lyrics_container .srmp3_lyrics_read').offset().top - $('#srmp3_lyrics_container').offset().top
          if (srmp_lyrics_pos < $('#srmp3_lyrics_container').height() && srmp_lyrics_pos > 50) { // if element is visible after scrolling
            $('#srmp3_lyrics_container').removeClass('srp_lyric_unlock');
          }
        } else {
          $('#srmp3_lyrics_container').addClass('srp_lyric_unlock');
        }
      }
      srp_lyricsAreScrolling = false;
    });
    sr_lyric_loaded = true;
  }
  $(document).keydown(function (event) {
    if (event.keyCode == 27) {
      srp_toggleLyricsContainer();
    }
  });
  $('#srmp3_lyrics_container .sricon-close-circle').on('click', function () {
    srp_toggleLyricsContainer();
  })
}
var sr_lyric_loaded = false;
function sr_loadLyricsAjax(postid, track_pos) {
  $('.srmp3_lyrics_title').empty();
  $('.srmp3_lyrics_album').empty();
  $('.srmp3_lyrics').empty();
  $('.srmp3_lyrics').removeClass('srmp3_singning');
  $('.srmp3_lyrics_container').empty();
  $('#srmp3_lyricsplaying_container').empty();


  if (typeof IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack] != 'undefined' && IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack].has_lyric ||
    $($('.sr-playlist-item[data-post-id="' + postid + '"][data-track-pos="' + track_pos + '"]')[0]).attr('data-track-lyric')
  ) {

    if (!$('#srmp3_lyricsplaying_container').length)
      sr_setLyricsPlayingContainer();

    if (typeof IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack] != 'undefined') {
      track_title = IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack].track_title;
      album = IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack].album_title;
    } else {
      track_title = document.querySelector('.sr-playlist-item[data-post-id="' + postid + '"][data-track-pos="' + track_pos + '"]').getAttribute('data-tracktitle');
      album = document.querySelector('.sr-playlist-item[data-post-id="' + postid + '"][data-track-pos="' + track_pos + '"]').getAttribute('data-albumtitle');
    }

    jQuery('.srmp3_lyrics_album').replaceWith($('<div>', {
      class: 'srmp3_lyrics_album',
      text: album
    }).prependTo('#srmp3_lyrics_container'));
    jQuery('.srmp3_lyrics_title').replaceWith($('<div>', {
      class: 'srmp3_lyrics_title',
      text: track_title
    }).prependTo('#srmp3_lyrics_container'));


    var data = {
      'action': 'load_lyrics_ajax',
      'post-id': postid,
      'track-position': track_pos,
      'nonce': sonaar_music.ajax.ajax_nonce
    };

    $.post(sonaar_music.ajax.ajax_url, data, function (response) {
      response = srp_convertTTMLTime(JSON.parse(response));
      $('.srmp3_lyrics').html($(response).html());
    })

  }
}

function srp_convertTTMLTime(ttml) {
  ttml = $('<div>' + ttml + '</div>');
  $(ttml).find('p[begin]').each(function () {
    var nodeTimeRaw_begin = $(this).attr('begin');
    var nodeTimeRaw_end = $(this).attr('end');

     // Check if the time format is in seconds and convert to hh:mm:ss.mmm
     if (nodeTimeRaw_begin.includes('s')) {
      var seconds = parseFloat(nodeTimeRaw_begin.slice(0, -1));
      var time = new Date(seconds * 1000).toISOString().substr(11, 12);
      $(this).attr('begin', time);
      nodeTimeRaw_begin = time;
    }
    if (nodeTimeRaw_end.includes('s')) {
      var seconds = parseFloat(nodeTimeRaw_end.slice(0, -1));
      var time = new Date(seconds * 1000).toISOString().substr(11, 12);
      $(this).attr('end', time);
      nodeTimeRaw_end = time;
    }

    
    var a = nodeTimeRaw_begin.split(':');
    var b = nodeTimeRaw_end.split(':');
    $(this).attr('begin', (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]));
    $(this).attr('end', (+b[0]) * 60 * 60 + (+b[1]) * 60 + (+b[2]));
  });
  return ttml;
}

function sr_shuffleToggle(event = null, audioPlayer = $('.iron-audioplayer.sr_selected')) {
  let shuffleValue
  if (IRON.audioPlayer.stickyEnable) {
    if (IRON.sonaar.player.shuffle) {
      IRON.sonaar.player.shuffle = false;
    } else {
      IRON.sonaar.player.shuffle = true;
      IRON.sonaar.player.setRandomList();
    }
    if (IRON.sonaar.player.classes.continuousPlayer) {
      sr_setCookieSettings();
    }
    shuffleValue = IRON.sonaar.player.shuffle;
  } else {
    if (audioPlayer.shuffle) {
      audioPlayer.shuffle = false;
    } else {
      audioPlayer.shuffle = true;
    }
    shuffleValue = audioPlayer.shuffle;
  }
  audioPlayer.attr('data-shuffle', shuffleValue);
}

function sr_setSpeedRate(event = null, audioPlayer = $('.iron-audioplayer.sr_selected'), $audio_el = null) {
  var rateSpeed = [0.5, 1, 1.2, 1.5, 2]; // default speed rate
  if(typeof sonaar_music.option.playback_speed != 'undefined'){
    rateSpeed = sonaar_music.option.playback_speed.split(',').map(function (item) {
      item = parseFloat(item, 10); // convert to number
        return item;
    });
    rateSpeed = rateSpeed.filter(function (el) {
      return !isNaN(el);  // filter out NaN
    });
    rateSpeed = rateSpeed.sort(); // sort
  }
  if (IRON.audioPlayer.stickyEnable) {
    var currentRateSpeed = IRON.sonaar.player.classes.speedRate;
  } else {
    var currentRateSpeed = audioPlayer.attr('data-speedrate');
  }
  if (currentRateSpeed == rateSpeed[rateSpeed.length - 1]) {
    currentRateSpeed = rateSpeed[0]
  } else {
    $.each(rateSpeed, function () {
      if (this > currentRateSpeed) {
        currentRateSpeed = this
        return false
      }
    })
  }
  if (IRON.audioPlayer.stickyEnable) {
    document.getElementById("sonaar-audio").playbackRate = currentRateSpeed;
    IRON.sonaar.player.classes.speedRate = currentRateSpeed;
  } else {
    sr_setAudioElementInstance().playbackRate = currentRateSpeed;
  }
  audioPlayer.attr('data-speedrate', currentRateSpeed);
  audioPlayer.find('.sr_speedRate div').html(currentRateSpeed + 'x');
}

function sr_setVolume(value, audioPlayer = null, $audio_el = null) {

  if (value == '') {
    return;
  }
  
  value = parseFloat(value);

  if(value > 1){
    value = 1;
  }
  if(value < 0){
    value = 0;
  }

  if (audioPlayer) {
    audioPlayer.attr('data-volume', value)
  }
  if (IRON.audioPlayer.stickyEnable) {
    IRON.sonaar.player.volume = value;
    sr_setCookieVolume();
  }
  if ( audioPlayer || IRON.audioPlayer.stickyEnable ){
    sr_setAudioElementInstance(audioPlayer).volume = value;
  }
}

function sr_setMute(value, $audio_el = null) {
  sr_setAudioElementInstance().muted = value;
  
  if (IRON.audioPlayer.stickyEnable) {
    IRON.sonaar.player.mute = value;
    if (IRON.sonaar.player.classes.continuousPlayer) {
      sr_setCookieSettings();
    }
  }
}

function sr_muteTrigger(event = null, audioPlayer = $('.iron-audioplayer.sr_selected'), $audio_el = null) {
  if($('.slider-container:hover').length)
    return;

  if (IRON.audioPlayer.stickyEnable && IRON.sonaar.player.mute || !IRON.audioPlayer.stickyEnable && audioPlayer.attr('data-mute') == 'true') {
    sr_setMute(false, $audio_el);
    if (audioPlayer) {
      audioPlayer.attr('data-mute', 'false');
    }
  } else {
    sr_setMute(true, $audio_el);
    if (audioPlayer) {
      audioPlayer.attr('data-mute', 'true');
    }
  }

}

function sr_initSlider(el, audioPlayer = null, $audio_el = null) {
  el.slider({
    orientation: "vertical",
    range: "min",
    min: 0,
    max: 100,
    value: 100,
    slide: function (event, ui) {
      sr_setVolume(ui.value / 100, audioPlayer, $audio_el);
      sr_setMute(false, $audio_el);
    },
  });
}

function srp_js_dynamic_style(audioPlayer) {
  /*Add margin bottom to the DIV"audio-track" related to the text-size. Reomove unwanted avsolut behavior on Mobile*/
  const newMarge = $(audioPlayer).find('.srp_tracklist-item-date').css('font-size');
  $(audioPlayer).find('.sr-playlist-item[data-show-date="1"] .audio-track').css('margin-bottom', newMarge);
}

function sr_updateSlider(event = null, audioPlayer = $('#sonaar-player')) { //update Volume slider when the volume has been set to another slider(widget or sticky)
  let volume;
  if (IRON.audioPlayer.stickyEnable) {
    volume = IRON.sonaar.player.volume;
  } else {
    volume = (audioPlayer.attr('data-volume') == NaN) ? 100 : audioPlayer.attr('data-volume');
  }
  volume = Math.floor(volume * 100) + '%';
  audioPlayer.find('.ui-slider-range').height(volume);
  audioPlayer.find('.ui-slider-handle ').css('bottom', volume);
}

function sr_setAudioElementInstance(audioPlayer = null) {
  if (IRON.audioPlayer.stickyEnable) {
    return document.getElementById("sonaar-audio");
  } else {
    if( !$('.sr_selected .player audio').length && audioPlayer !==null ){
      return audioPlayer.find('audio')[0];
    }else{
      return document.querySelector('.sr_selected .player audio');
    }
  }
}


/*Function call from the shortcode [sonaar_ts] (Time Stamp)*/
function sonaar_ts_shortcode(params) { //eq: params = "{ id:'19', time: '0:10'}" 
  //params list: "id", "widget_id", "trackid", "time", "ts_id", "play_icon"

  const el = '#sonaar_ts-' + params.ts_id;
  let newSonaarTS_selected = true;
  srp_startingTime = params.time;
  if (typeof params.trackid == 'undefined') {
    params.trackid = 0;
  }

  $('.srmp3_sonaar_ts_shortcode:not(#sonaar_ts-' + params.ts_id).removeClass('sr_selected audio-playing'); //clear all other sonaar_ts

  if ($(el).hasClass('sr_selected')) {  // Add and remove "sr_selected" Class
    newSonaarTS_selected = false;
    if (params.play_icon == 'true' && $(el).hasClass('sr_selected')) {  // When PLAY icon is enable, Only skip to the time parameter on the first click
      delete params.time;
    }
  } else {
    $('.srmp3_sonaar_ts_shortcode ').removeClass('sr_selected');
    $(el).addClass('sr_selected');
    if (IRON.audioPlayer.stickyEnable) {
      IRON.sonaar.player.selectedTimeStamp = $(el);
    }
  }

  if ($(el).hasClass('audio-playing')) { // Add and remove "audio-playing" Class
    $(el).removeClass('audio-playing');
  } else {
    $(el).addClass('audio-playing');
  }

  if (params.play_icon == 'true') { // Special Behaviors with the PLAY/PAUSE Button
    if (IRON.audioPlayer.stickyEnable && !$(el).hasClass('audio-playing')) { // Sync with the sticky player
      IRON.sonaar.player.pause();
      return;
    }
    if (!IRON.audioPlayer.stickyEnable && typeof $(el).data('ts-sync') != 'undefined' && !newSonaarTS_selected) { // If Sync with a widget when sticky disable and it is a new selected sonaar_ts: toggle between play and pause
      IRON.players[$(el).data('ts-sync')].play();
      return;
    }
  }


  if (typeof params.id == 'undefined') { //if no playlist post ID is targeted

    /* WIDGET PLAYER INTERACTION  */
    if (typeof IRON.players != 'undefined' && IRON.players.length > 0) {

      /* Find the widget player linked to the sonaar_ts */
      let player = 0;
      if (typeof params.widget_id != 'undefined') { //if sonaar_ts has widget_id parameters
        let playerID;
        if ($('#' + params.widget_id + ' .iron-audioplayer').length) { //if widget_id is an CSS id from a parent (eq: custom css id from elementor https://d.pr/i/kybO21)
          playerID = $('#' + params.widget_id + ' .iron-audioplayer').data('id');
        }
        if ($('#' + params.widget_id + '.iron-audioplayer').length) { //if widget_id is an CSS id from the iron-audioplayer itself (this should not happen because its ID is always different(regenerated), but who knows...)
          playerID = $('#' + params.widget_id + '.iron-audioplayer').data('id');
        }
        if ($('[data-id="' + params.widget_id + '"] .iron-audioplayer').length) { //if widget_id is the data-id from a parent (eq: the default elementor widget ID)
          playerID = $('[data-id="' + params.widget_id + '"] .iron-audioplayer').data('id');
        }
        if ($('[data-id="' + params.widget_id + '"].iron-audioplayer').length) {//if widget_id is the data-id from  the iron-audioplayer itself (The id can be set through the sonaar_audioplayer shortcode "id" parameter. Eq:[sonaar_audioplayer id="player1"])
          playerID = $('[data-id="' + params.widget_id + '"].iron-audioplayer').data('id');
        }

        $(IRON.players).each(function (index) { // looking for the audioplayer ID
          if (IRON.players[index].audioPlayer.data('id') == playerID) {
            player = index;
            return;
          }
        })
      } else {
        $(IRON.players).each(function (index) { // looking for the audioplayer before the shortcode
          if (IRON.players[index].audioPlayer.offset().top > $(el).offset().top) {
            return;
          }
          player = index;
        })
      }


      IRON.players[player].audioPlayer.data('ts-sync', params.ts_id); // mark the sonaar_ts id to the player widget
      $(el).data('ts-sync', player); // mark the player id to the sonaar_ts button
      const trackIsPlaying = IRON.players[player].audioPlayer.hasClass('audio-playing') && IRON.players[player].audioPlayer.find('.sr-playlist-item').eq(params.trackid).hasClass('current')


      /* WIDGET PLAYER Behavior: Play, Pause or seektime */
      if (!trackIsPlaying) { //if the track is not currently playing
        IRON.players[player].audioPlayer.find('.srp_audio_trigger').eq(params.trackid).trigger('click'); //Play from widget
      } else {
        srp_startingTime = 0;
      }
      if (
        !IRON.audioPlayer.stickyEnable ||
        (IRON.audioPlayer.stickyEnable && trackIsPlaying) || // Always seekTime when the track already playing and the sonaar_ts play/pause icon feature is disable 
        (!IRON.players[player].audioPlayer.find('.sr-playlist-item').eq(params.trackid).hasClass('current') && newSonaarTS_selected) //always seekTime when we click on a new sonaar_ts and we targeted a new track
      ) {
        IRON.players[player].seekTime(params.time);
      }
      return;

    } else {
      /* If no widget and no ID has been set, play tracks from the current post. */
      params.id = srp_vars.sonaar_music.currentPostId;
    }
  }
  /* STICKY play playlist from POST ID*/
  IRON.sonaar.player.setPlayerAndPlay(params);
}


$(document.body).on('click', '.view-license-button', function (event) {
  sr_setPopUp();
  srp_wc_loadspinner($(event.target));

  var data = {
    'action': 'load_license_preview_ajax',
    'variationId': event.currentTarget.getAttribute('data-variation-id'),
    'licenseId': event.currentTarget.getAttribute('data-license-id'),
    'productName': event.currentTarget.getAttribute('data-product-name'),
    'nonce': sonaar_music.ajax.ajax_nonce
  };
  $.post(sonaar_music.ajax.ajax_url, data, function (response) {
    $('#sonaar-modal .sr_popup-body').html(response);
    sr_openPopUp();
    srp_wc_unloadspinner($(event.target));
  })
});

/*
*****************************************************
START OF SHARE POPUP
*****************************************************
*/
$(document).on('click', '.sr_store_force_share_bt', function () {
  const link = $(this).attr('href');
  let id = (typeof $(this).data('source-post-id') != 'undefined') ? $(this).data('source-post-id') : '';
  let track_title, image_src, track_pos, current_time;

  // Check if this is within sticky player
  if ($(this).closest('.player').length > 0) {
    track_title = IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack].track_title;
    image_src = IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack].poster;
    id = IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack].sourcePostID;
    track_pos = IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack].track_pos
  
  // if this is within the mini player
  } else if ($(this).parents('.album-player').length > 0) {
    const trackIndex = $(this).parents('.iron-audioplayer').attr('trackselected');
    const $track = $(this).parents('.iron-audioplayer').find('.sr-playlist-item').eq(trackIndex);
    track_pos = $track.data('track-pos');
    track_title = $track.find('.tracklist-item-title').text();
    image_src = $track.data('albumart');
    
  // Or if this is within .sr-playlist-item-flex
  } else if ($(this).closest('.sr-playlist-item').length > 0) {
    track_pos = $(this).closest('.sr-playlist-item').data('track-pos');
    track_title = $(this).closest('.sr-playlist-item').find('.tracklist-item-title').text();
    image_src = $(this).closest('.sr-playlist-item').data('albumart');

    // Or within .srp_swiper-album-art
  } else if ($(this).closest('.srp_swiper-album-art').length > 0) {
    track_title = $(this).closest('.srp_swiper-album-art').find('.srp_swiper-track-title').text();
    // Extract the image url from the 'background-image' CSS property
    const backgroundImage = $(this).closest('.srp_swiper-album-art').css('background-image');
    image_src = backgroundImage.slice(4, -1).replace(/"/g, "");
  }
  current_time = (IRON.sonaar.player.currentTime != '' && typeof IRON.sonaar.player.currentTime != 'undefined') ? IRON.sonaar.player.currentTime : '00:00';

  srp_share_popup(id, $(this), link, track_title, image_src, track_pos,current_time);

  return false;
});

function srp_share_popup(id, el, link, track_title, image_src, track_pos, current_time = '00:00') {
  track_pos = (typeof track_pos != 'undefined') ? track_pos + 1 : '';
  var separator = link.includes('?') ? '&' : '?';
  var link = (link + separator + 'ts_post_id=' + id + '&ts_track_num=' + track_pos).replace(/([^:]\/)\/+/g, "$1");
  link = link.replace('#!', ''); // remove #! from

  sr_setPopUp();
  var data = {
    'action': 'load_share_by_ajax',
    'id': id,
    'link': link,
    'track_title': track_title,
    'image_src': image_src,
    'current_time': current_time,
    'nonce': sonaar_music.ajax.ajax_nonce
  };
  
  $.post(sonaar_music.ajax.ajax_url, data, function (response) {
   
    response = JSON.parse(response);
    $('#sonaar-modal .sr_popup-body').html(response);
    
    // add more button on mobile
    function isSmallDevice() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    $('.srp-share-mobile-more').hide();
    if (navigator.share && isSmallDevice()) {
      $('.srp-share-mobile-more').show();
      $(document).on('click', '.srp-share-mobile-more', function (e) {
        navigator.share({
          url: link
        })
        .then(() => console.log('Successful share'))
        .catch((error) => console.log('Error sharing', error));
      }); 
    }

   
    $('.srp-modal-sticky-player--time').hide();
    sr_openPopUp();

    var input = $('#myInput');

    // Store the initial url value
    var initialUrl = input.val();
    const domain = window.location.hostname;
    if (sonaar_music.option.share_email_body.includes("{{website_domain}}")) {
        sonaar_music.option.share_email_body = sonaar_music.option.share_email_body.replace("{{website_domain}}", domain);
    }
    // Function to update the social media share links
    function updateShareLinks() {
      link = input.val();
      // Now update the share URLs for each of the social media buttons
      $('.fab.fa-facebook').attr('href', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(input.val()));
      $('.fab.fa-twitter').attr('href', 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(input.val()));
      $('.fab.fa-whatsapp').attr('href', 'https://api.whatsapp.com/send?text=' + encodeURIComponent(input.val()));
      
      var mailto_link = 'mailto:?subject=' + encodeURIComponent(sonaar_music.option.share_email_subject) + '&body=' + encodeURIComponent(sonaar_music.option.share_email_body) + '%0D%0A%0D%0A' + encodeURIComponent(input.val());
      $('.fas.fa-envelope').attr('href', mailto_link);

      var sms_link = 'sms:?body=' + encodeURIComponent(sonaar_music.option.share_email_body) + '%0D%0A%0D%0A' + encodeURIComponent(input.val());
      $('.fas.fa-sms').attr('href', sms_link);
    }

    // Add an event listener to the checkbox
    $('#stickyPlayerCheckbox').on('change', function () {
      if (this.checked) {
        $('.srp-modal-sticky-player--time').show();
        var separator = window.location.href.includes('?') ? '&' : '?';
        var updatedUrl = (window.location.href + separator + 'ts_post_id=' + id + '&ts_track_num=' + track_pos).replace(/([^:]\/)\/+/g, "$1");
        updatedUrl = updatedUrl.replace('#!', ''); // remove #! from the url

        var url = new URL(updatedUrl);

        if ($('#stickyPlayerTimeCheckbox').is(':checked')) {
            var newTime = $('#stickyPlayerCurrentTime').val();
            url.searchParams.set('ts_time', newTime);
        } else {
            url.searchParams.set('ts_time', '00:00');
        }

        input.val(url.toString().replace(/%3A/g, ':'));
      } else {
          $('.srp-modal-sticky-player--time').hide();
          input.val(initialUrl);
      }
      
      updateShareLinks();
    });
     // Add an event listener to the checkbox
     // Add an event listener to the checkbox
     $('#stickyPlayerCurrentTime').on('keypress', function (e) {
      var key = String.fromCharCode(!e.charCode ? e.which : e.charCode);
      if (!/^[0-9:]$/.test(key)) {
          e.preventDefault();
      }
      }).on('input', function () {
          var input = $(this);
          var newTime = input.val();
      
          // Check if newTime contains only numbers and ":" character
          if (!/^[0-9:]*$/.test(newTime)) {
              // Invalid input, revert to previous value
              input.val(input.data('oldValue') || '');
              return;
          }
      
          // Update old value
          input.data('oldValue', newTime);
      
          // Get the current URL from the myInput field
          var url = new URL($('#myInput').val());
      
          // Check if the stickyPlayerTimeCheckbox is checked
          if ($('#stickyPlayerTimeCheckbox').is(':checked')) {
              // Set the new ts_time value
              url.searchParams.set('ts_time', newTime);
          } else {
              // If the checkbox is not checked, reset ts_time to 00:00
              url.searchParams.set('ts_time', '00:00');
          }
      
          // Update the myInput field with the new URL, and replace the encoded ":" character
          $('#myInput').val(url.toString().replace(/%3A/g, ':'));
          updateShareLinks();
      });
  
    $('#stickyPlayerTimeCheckbox').on('change', function () {
      var url = new URL($('#myInput').val());
  
      if ($(this).is(':checked')) {
          // Checkbox is checked, grab the current time and update the ts_time value
          var newTime = $('#stickyPlayerCurrentTime').val();
  
          // Check if newTime contains only numbers and ":" character
          if (/^[0-9:]*$/.test(newTime)) {
              url.searchParams.set('ts_time', newTime);
          }
      } else {
          // Checkbox is unchecked, reset ts_time to 00:00
          url.searchParams.set('ts_time', '00:00');
      }
  
      // Update the myInput field with the new URL, and replace the encoded ":" character
      $('#myInput').val(url.toString().replace(/%3A/g, ':'));
      updateShareLinks();
  });

  })
 
}

async function srp_share_popup_CopyToClipboard() {
  const copyText = document.getElementById('myInput');
  const copyButton = document.getElementById('copyButton'); // You'll need to add an ID to your Copy button for this to work
  copyTxt = (typeof sonaar_music.option.share_label_copy != 'undefined') ? sonaar_music.option.share_label_copy : 'Copy';
  copiedTxt = (typeof sonaar_music.option.share_label_copied != 'undefined') ? sonaar_music.option.share_label_copied : 'Copied';
  try {
      await navigator.clipboard.writeText(copyText.value);
      // Change button text
      copyButton.innerText = copiedTxt;
      // Reset button text back to 'Copy' after some time
      setTimeout(() => copyButton.innerText = copyTxt, 3000);
  } catch (err) {
      console.error('Failed to copy text to clipboard', err);
      copyButton.innerText = 'Failed to copy';
  }
}

/*
*****************************************************
END OF SHARE POPUP
*****************************************************
*/

// Ensure to include this outside the object if jQuery is required globally
IRON.favorites = {
  /*
  *****************************************************
  ADD TO FAVORITE
  *****************************************************
  */
  init: function() {
    $ = jQuery;
    var self = this;

    if (srp_vars.is_logged_in === 'yes') {
      // If the user is logged in, fetch their playlists.

      self.initRightClick();

      IRON.favorites.dataType = 'user_meta';
      IRON.userPlaylists = sonaar_music.playlists || [];
      
      self.processPlaylists();

    } else if(sonaar_music.option.enable_favorites_for_anonymous ==='true'){
      // If the user is not logged in, use cookies

      self.initRightClick();

      IRON.favorites.dataType = 'cookies';      
      IRON.userPlaylists = sonaar_music.playlists || [];
      
      $('.srp_player_is_favorite').parent('.iron_widget_radio').css('opacity', 0); // Hide the player until the cookie is loaded by ajax     
      $('.iron-audioplayer').each(function(index) {
        if($(this).hasClass('srp_player_is_favorite')){
            IRON.favorites.reloadPlayerAjax(this, index, true);
        }
      });
      self.processPlaylists();
      $(IRON.favorites.favoriteTracks).each(function() {
        $('[data-post-id="' + this.postId + '"][data-track-pos="' + this.trackPos+ '"] .srp-fav-bt i').addClass(sonaar_music.option.srp_fav_remove_icon).removeClass(sonaar_music.option.srp_fav_add_icon);
      });
    }
  },

  processPlaylists: function() {
      IRON.favorites.favoritesEnabled = true;
      $('.srp_favorites_loading').removeClass('srp_favorites_loading');
      // Find 'Favorites' playlist
      for (var i = 0; i < IRON.userPlaylists.length; i++) {
          if (IRON.userPlaylists[i].playlistName === 'Favorites') {
              //console.log("you have a playlist named 'Favorites'",  IRON.userPlaylists[i].tracks);
              if (!IRON.userPlaylists[i].tracks) {
                IRON.userPlaylists[i].tracks = [];
              }
              IRON.favorites.favoriteTracks = IRON.userPlaylists[i].tracks;
              IRON.favorites.favoritePlaylistIndex = i;
              break;
          }
      }
      this.hideShowPlayer();
      if(IRON.audioPlayer.stickyEnable && IRON.sonaar.player.list.tracks){//Verify if the sticky player is enable and if the playlist is loaded
        this.setStickyFavButtons(); //reset the sticky player favorite buttons after the ajax call: Fix issue with the favorite button from the CONTINUOUS sticky player
      }
  },

  reloadPlayerAjax: function(currentplayer, num = null, transition = false){
    // transition means that the player is being loaded in a popup and we want a smooth fade in
    if(transition && $('.elementor-editor-active').length)
    return;

    var $currentplayer = $(currentplayer);
    var playerParent = $currentplayer.parent('.iron_widget_radio');
    if(num === null){ 
        num = 0;
        $('.iron-audioplayer').each(function(){
            if($(this).data('id')=== $currentplayer.data('id')){
                return;
            }
            num++;
        });
    }

    var maxDuration = 4000; 
    var interval = 100; 
    var elapsedTime = 0;
    if(transition){
        playerParent.css({ 'opacity': 0, 'transition': 'opacity 0.15s ease' });
    }
    
    var intervalId = setInterval(function() { //Set interval to wait for the player to be loaded: required for player inside a popup
        var playerIndex = srp_convertPlayerIdToPlayerNum($currentplayer.data('id'));
        if (playerIndex !== null) {
            var playerId = IRON.players[playerIndex].audioPlayer.id.split('-');
            playerId = playerId[playerId.length - 1];
            var srp_fav_player_param_args = window['srp_player_params_args_' + playerId];
            var srp_fav_player_param = window['srp_player_params_' + playerId];
            var data = {
                'action': 'load_ajax_player',
                'nonce': sonaar_music.ajax.ajax_nonce,
                'args': srp_fav_player_param_args,
                'parameters': srp_fav_player_param,
            };
    
            $.post(sonaar_music.ajax.ajax_url, data, function (response) {
                var parsedResponse = $(response);
                var newDiv = parsedResponse.find('.iron-audioplayer.srp_player_is_favorite');
                $currentplayer.replaceWith(newDiv);
                
                var player = Object.create(IRON.audioPlayer);
                player.init($($('.iron-audioplayer')[num]));
                IRON.players[num] = player;
    
                if($('.iron-audioplayer.srp_player_is_favorite .sr-playlist-item').length === 0) {  // If no items left, show the "not found" message
                    $('.srp-fav-removeall-bt').hide();
                }else{
                    $('.srp-fav-removeall-bt').show();
                }
                if(transition){
                    playerParent.css('opacity',1);
                }
            }).fail(function() {
                console.log('An error occurred during the post operation.');
            });

            clearInterval(intervalId);
        } else {
            if(transition){
                playerParent.css('opacity',1);
            }
            elapsedTime += interval;
            if (elapsedTime >= maxDuration) {
                clearInterval(intervalId);
            }
        }
    }, interval);
  },

  removeTrackFromFavorites: function(postId, trackPos) {
    const existingIndex = IRON.favorites.favoriteTracks.findIndex(track => Number(track.postId) === Number(postId) && Number(track.trackPos) === Number(trackPos));
    if (existingIndex !== -1) {
        IRON.favorites.favoriteTracks.splice(existingIndex, 1);
    }
    
    const $favoritePlayer = $('.iron-audioplayer.srp_player_is_favorite');
    if($favoritePlayer.length > 0) {
      $favoritePlayer.find('.sr-playlist-item').each(function() {
        const $track = $(this);
        const trackData = $track.data();
        if(trackData.postId === parseInt(postId, 10) && trackData.trackPos === parseInt(trackPos,10)) {
          if($track.hasClass('current')) {
            IRON.sonaar.player.next();
          }
          $track.fadeOut(400, function() {
            if($track.parents('.iron-audioplayer').hasClass('sr_selectedPlayer') && IRON.audioPlayer.stickyEnable && typeof IRON.sonaar.player.list.tracks[$track.index()] != 'undefined') {
              IRON.sonaar.player.list.tracks.splice($track.index(), 1) //Remove track from playlist
              if($track.index() <= IRON.sonaar.player.currentTrack) {
                IRON.sonaar.player.classes.preventHandleTrackChange = true; //Prevent to reinit the currentrack
                IRON.sonaar.player.currentTrack--; //Reduce currentTrack index if the track is before the currentTrack
              }
            }
            $track.remove();
            IRON.favorites.hideShowPlayer();
          });
        }
      });
    }
  },  

  clearFavoriteList: function(){
    IRON.favorites.favoriteTracks = []; // Clear the favoriteTracks array
    IRON.userPlaylists[IRON.favorites.favoritePlaylistIndex].tracks = [];
     // Clear the tracks from the 'Favorites' playlist

    if( IRON.favorites.dataType === 'cookies' ){
      document.cookie = "sonaar_mp3_playlists=; path=/;"; // Update the cookie with the modified playlists
    }else{
      $.ajax({
        url: sonaar_music.ajax.ajax_url,  // WordPress AJAX URL
        type: 'POST',
        dataType: 'json',
        data: {
            action: 'update_user_playlist',  // PHP function name
            nonce: sonaar_music.ajax.ajax_nonce,
            playlists: IRON.userPlaylists  // Playlist data
        },
        success: function(response) {
            //console.log(response);
        }
      });
    }
    $('.iron-audioplayer:not(.srp_player_is_favorite) .' + sonaar_music.option.srp_fav_remove_icon).addClass(sonaar_music.option.srp_fav_add_icon).removeClass(sonaar_music.option.srp_fav_remove_icon);
    
    var delay = 200;

    $('.iron-audioplayer.srp_player_is_favorite').each(function() {
        var favoriteList = $(this).find('.sr-playlist-item');
        favoriteList.each(function(index) {
            var track = this;
            setTimeout(function() {
                $(track).fadeOut(delay, function() {
                    $(track).remove();
                    if(index + 1 >= favoriteList.length){
                        IRON.favorites.hideShowPlayer();
                    }
                });
            }, index * delay);
        });
    });
  },

  hideShowPlayer: function(){
    if($('.iron-audioplayer.srp_player_is_favorite .sr-playlist-item').length === 0) {
      // If no items left, show the "not found" message
      $('.srp-fav-removeall-bt').hide();
      $('.srp-fav-notfound').show();
      $('.iron-audioplayer.srp_player_is_favorite').hide();
    }else{
      $('.srp-fav-removeall-bt').show();
    }
  },

  setStickyFavButtons: function(){
    if(!IRON.favorites.favoritesEnabled)
    return;
      
    var currentTrackIndex = IRON.sonaar.player.currentTrack;

    $('#sonaar-player').data('trackPos', IRON.sonaar.player.list.tracks[currentTrackIndex].track_pos);
    $('#sonaar-player').data('postId', IRON.sonaar.player.list.tracks[currentTrackIndex].sourcePostID);
    
    var isFavorite = IRON.favorites.favoriteTracks.some(function(track) {
      return track.postId == IRON.sonaar.player.list.tracks[currentTrackIndex].sourcePostID && track.trackPos == IRON.sonaar.player.list.tracks[currentTrackIndex].track_pos;
    });

    var favButtonIndex = -1;
    for (var i = 0; i < IRON.sonaar.player.albumStoreList.length; i++) {
      if (IRON.sonaar.player.albumStoreList[i]['cta-class'] === 'srp-fav-bt') {
        favButtonIndex = i;
        break; 
      }
    }
    if( favButtonIndex === -1 ) return;

    // Depending on isFavorite, set the appropriate icon class
    if (isFavorite) {
      IRON.sonaar.player.albumStoreList[favButtonIndex]['store-icon'] = sonaar_music.option.srp_fav_remove_icon;
    } else {
      IRON.sonaar.player.albumStoreList[favButtonIndex]['store-icon'] = sonaar_music.option.srp_fav_add_icon;
    }
  },

  clickStickyFavButton: function(favButtonIndex){
    if(!IRON.favorites.favoritesEnabled)
    return;

    event.preventDefault();

    const $sonaarPlayer = $('#sonaar-player');
    const postId = $sonaarPlayer.data('postId');
    const trackPos = $sonaarPlayer.data('trackPos');
    const action = IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack].optional_storelist_cta[favButtonIndex]['store-icon'] == sonaar_music.option.srp_fav_remove_icon ? 'remove' : 'add';
    this.addRemoveFavorite(postId, trackPos, action);
  },

  addRemoveFavorite: function(postId, trackPos, action){ //action = 'add' or 'remove'
    if(typeof postId === 'undefined' || typeof trackPos === 'undefined' || typeof action === 'undefined')
      return;

    if(IRON.audioPlayer.stickyEnable && $('#sonaar-player .srp-fav-bt').length){
      var favButtonIndex = -1;
      for (var i = 0; i < IRON.sonaar.player.albumStoreList.length; i++) {
        if (IRON.sonaar.player.albumStoreList[i]['cta-class'] === 'srp-fav-bt') {
          favButtonIndex = i;
          break; 
        }
      }
      
      //toggle Sticky favorite icon
      IRON.sonaar.player.albumStoreList[favButtonIndex]['store-icon'] = action === 'remove' ? sonaar_music.option.srp_fav_add_icon : sonaar_music.option.srp_fav_remove_icon;
      IRON.sonaar.player.albumStoreList[favButtonIndex]['store-name'] = action === 'remove' ? sonaar_music.option.fav_label_add_action : sonaar_music.option.fav_label_remove_action;

    }
    //toggle widget favorite icon
    const selector = `.srp-fav-bt[data-source-post-id="${postId}"][data-store-id^="${trackPos}-"]  i`;
    const selectorParent = `[data-post-id="${postId}"][data-track-pos="${trackPos}"] .srp-fav-bt`;
    const addClass = action === 'remove' ? sonaar_music.option.srp_fav_add_icon : sonaar_music.option.srp_fav_remove_icon;
    const removeClass = action === 'remove' ? sonaar_music.option.srp_fav_remove_icon : sonaar_music.option.srp_fav_add_icon;
    const title = action === 'remove' ? sonaar_music.option.fav_label_add_action : sonaar_music.option.fav_label_remove_action;

    $(selector).each(function() {
      if( ! $(this).parents('.srp_player_is_favorite').length){
        $(this).addClass(addClass).removeClass(removeClass);
        $(this).attr('title', title).attr('aria-label', title);
      }
    })
    

    //Update favoriteList
    let existingIndex = -1;
    if(Array.isArray(IRON.favorites.favoriteTracks)) {
      existingIndex = IRON.favorites.favoriteTracks.findIndex(function(track) {
        return Number(track.postId) === Number(postId) && Number(track.trackPos) === Number(trackPos);
      });
    }
    if(existingIndex === -1) {
      // If track doesn't exist in favorites, add it
      IRON.favorites.favoriteTracks.push({
        postId: postId.toString(),
        trackPos: trackPos.toString()
    });
    } else {
        IRON.favorites.removeTrackFromFavorites(postId, trackPos);
    }
    // Set the updated favorites list as a cookie
    if(IRON.favorites.favoritePlaylistIndex !== -1) {
      IRON.userPlaylists[IRON.favorites.favoritePlaylistIndex].tracks = IRON.favorites.favoriteTracks;
    }

    if( IRON.favorites.dataType === 'cookies' ){
      // Set the updated playlists as a cookie
      document.cookie = "sonaar_mp3_playlists=" + encodeURIComponent(JSON.stringify(IRON.userPlaylists)) + "; max-age=31536000; path=/;";
      IRON.favorites.showNotificationAndReloadPlayer(action);
    }else{
      $.ajax({
        url: sonaar_music.ajax.ajax_url,  // WordPress AJAX URL
        type: 'POST',
        dataType: 'json',
        data: {
            action: 'update_user_playlist',  // PHP function name
            nonce: sonaar_music.ajax.ajax_nonce,
            playlists: IRON.userPlaylists  // Playlist data
        },
        success: function(response) {
          //console.log(response);
          IRON.favorites.showNotificationAndReloadPlayer(action);
           
        }
      });
    }
    
  },

  showNotificationAndReloadPlayer: function(action){
    // Create and append the notification div to the body
    $('<div>')
      .addClass('srp-fav-notification')
      .text(sonaar_music.option[`fav_label_${action}`])
      .appendTo('body')
      .animate({ bottom: '100px', opacity: 1 }, 500)
      .delay(3000)
      .animate({ bottom: '80px', opacity: 0 }, 500, function() {
          $(this).remove();
      });

    if(action === "add") {
      $('.iron-audioplayer').each(function(index) {
          if($(this).hasClass('srp_player_is_favorite')){
              IRON.favorites.reloadPlayerAjax(this, index);
          }
      });
    }
  },
  setFavButtons: function(audioPlayer){
    if(srp_vars.is_logged_in === "no" && sonaar_music.option.cta_favorites_dv_enable_redirect_main_settings === "true"){
      return;
    }

    const $audioPlayer = $(audioPlayer);
    const $favRemoveAllBtn = $('.srp-fav-removeall-bt');
  
    $favRemoveAllBtn.each(function(){
      const $this = $(this);
      if(!$this.data('ready')) { 
        $this.data('ready', true).on('click', IRON.favorites.clearFavoriteList);
      }
    });

  
    if($audioPlayer.hasClass('srp_player_is_favorite')){
      $('.srp-fav-notfound').toggle(!$audioPlayer.find('.sr-playlist-item, .swiper-slide').length);
    }
  
    const $favBtn = $audioPlayer.find('.srp-fav-bt');
    if($favBtn.data('event') != 'click'){
      $favBtn.data('event', 'click'); 
      $audioPlayer.on('click', '.srp-fav-bt', function () { 
        event.preventDefault();
        const $this = $(this);
        if($this.parents('.srp_favorites_loading').length)
          return;

        const postId =  $(this).attr('data-source-post-id');
        if($audioPlayer.hasClass('srp_player_is_favorite')){
          var trackPos = $(this).parents('.sr-playlist-item').data('track-pos');
        }else{
          var trackPos = $(this).attr('data-store-id').split('-')[0];
        }
        const action = $this.find('i').hasClass(sonaar_music.option.srp_fav_remove_icon) ? 'remove' : 'add';
        IRON.favorites.addRemoveFavorite(postId, trackPos, action);
      });
    }
  
    $audioPlayer.find('.srp-fav-notfound').each(function() {
      const $this = $(this);
      $this.text($this.data('label'));
    });
  },
  initRightClick: function(){
    if(sonaar_music.option.fav_enable_contextual_menu !== "true")
    return;
    
    var lastSelectedTrack = null;

    var style = document.createElement('style');
    style.innerHTML = `
      #contextMenu {
        display: none;
        position: absolute;
        z-index: 1000;
        background: #343a40;
        border-radius: 5px;
        padding: 4px;
      }
      #contextMenu ul {
        padding-left: 0;
      }
      #deleteFromFavorite {
        color: #fff;
        border-radius: 5px;
        font-size: 14px;
        padding: 5px 10px;
        cursor: pointer;
        list-style: none;
      }
      #deleteFromFavorite:hover {
        background-color: #6c757d;
      }
    `;
    document.head.appendChild(style);

    // Create context menu
    $('<div>', { id: 'contextMenu' })
      .append($('<ul>').append($('<li>', { id: 'deleteFromFavorite', text: sonaar_music.option.fav_label_rightclick_remove })))
      .appendTo('body');



    $('.iron-audioplayer.srp_player_is_favorite .sr-playlist-item').css({
      '-webkit-user-select': 'none',  /* Safari 3.1+ */
      '-moz-user-select': 'none',     /* Firefox 2+ */
      '-ms-user-select': 'none',      /* IE 10+ */
      'user-select': 'none'           /* Standard syntax */
    });

    $('.iron-audioplayer.srp_player_is_favorite .sr-playlist-item').click(function(e) {
        if (e.shiftKey && lastSelectedTrack != null) {
            var start = $('.iron-audioplayer.srp_player_is_favorite .sr-playlist-item').index(this);
            var end = $('.iron-audioplayer.srp_player_is_favorite .sr-playlist-item').index(lastSelectedTrack);
            $('.iron-audioplayer.srp_player_is_favorite .sr-playlist-item').slice(Math.min(start, end), Math.max(start, end) + 1)
                .addClass('selected')
                .css('background-color', '#ccc');
        } else if (e.ctrlKey || e.metaKey) {
            $(this).toggleClass('selected')
                .css('background-color', function(index, value) {
                    return $(this).hasClass('selected') ? '#ccc' : '';
                });
        } else {
            $('.iron-audioplayer.srp_player_is_favorite .sr-playlist-item').removeClass('selected')
                .css('background-color', '');
            $(this).addClass('selected')
                .css('background-color', '#ccc');
        }

        lastSelectedTrack = $(this).hasClass('selected') ? this : null;
    }).contextmenu(function(e) {
      e.preventDefault();
        
      if ($(this).hasClass('selected')) {
          $('#contextMenu').css({
              display: 'block',
              left: e.pageX,
              top: e.pageY
          });
      }
  });

  $(document).click(function() {
      $('#contextMenu').hide();
  });

  $('#deleteFromFavorite').click(function() {
      $('.iron-audioplayer.srp_player_is_favorite .sr-playlist-item.selected').each(function() {
          var postId = $(this).data('post-id');
          var trackPos = $(this).data('track-pos');
          IRON.favorites.addRemoveFavorite(postId, trackPos, 'remove');
         //IRON.favorites.removeTrackFromFavorites(postId, trackPos);
          $(this).removeClass('selected')
              .css('background-color', '');
      });

      lastSelectedTrack = null;
  });

  },
}

function srp_variation_button(el, productId) {
  
  // can be a variation lightbox or a make an offer button
  if( $(el).find('a').length){
    el = $(el).find('a')[0];
  }
  // Check if this is within .sr-playlist-item-flex or .srp_swiper-album-art
  if ($(el).closest('.sr-playlist-item').find('.sr_track_cover img').length > 0) {
    image_src = $(el).closest('.sr-playlist-item').find('.sr_track_cover img').attr('src');
  } else if ($(el).closest('.sr-playlist-item').find('img.sr_track_cover').length > 0) {
    image_src = $(el).closest('.sr-playlist-item').find('img.sr_track_cover').attr('src');
  } else if ($(el).closest('.srp_swiper-album-art').length > 0) {
    // Extract the image url from the 'background-image' CSS property
    const backgroundImage = $(el).closest('.srp_swiper-album-art').css('background-image');
    image_src = backgroundImage.slice(4, -1).replace(/"/g, "");
  } else if ($(el).closest('.srmp3-product').length > 0){
    image_src = $(el).closest('.srmp3-product').find('img').attr('src');
  } else if ($(el).closest('#sonaar-player').find('.album-art img').length > 0) {
    // Check within #sonaar-player for the image inside .album-art
    image_src = $(el).closest('#sonaar-player').find('.album-art img').attr('src');
  } else if ($(el).closest('.srp_player_boxed').find('.sonaar-Artwort-box').find('img').length > 0) {
    image_src = $(el).closest('.srp_player_boxed').find('.sonaar-Artwort-box').find('img').attr('src');
  } else {
    // Fallback.
    image_src = '';
  }

  if(productId == undefined){
    productId = (typeof $(el).data('product_id') != 'undefined') ? $(el).data('product_id') : $(el).data('source-post-id');
  }else{
    productId = productId;
  }
  
  srp_wc_variation_popup(productId, $(el), image_src);
}

function srp_wc_variation_popup(productId, el, image_src) {
  el = $(el);
  IRON.bt_that_launched_the_popup =  el;
  srp_wc_loadspinner(el);
  sr_setPopUp();
  // Determine the action based on whether the element has the .srp-make-offer-bt class
  var action = $(el).hasClass('srp-make-offer-bt') ? 'load_make_offer_lightbox' : 'load_wc_variation_by_ajax';
  var variation_id = $('.srp-modal-variant-selector.srp_selected').data('variant_id');
  if (!variation_id) {
    if ($(el).hasClass('srp-make-offer-bt')) {
      variation_id = $(el).data('variation');
    }
  }

  var data = {
    'action': action,
    'image_src': image_src,
    'product-id': productId,
    'variation-id': variation_id,
    'nonce': sonaar_music.ajax.ajax_nonce
  };
  $.post(sonaar_music.ajax.ajax_url, data, function (response) {
    

    // Ensure that the response is in the correct format and check for success
    if (response.success) {
      $('#sonaar-modal .sr_popup-body').html(response.data.html);

      // Check if the image exists and add/remove the body class accordingly
      if (!response.data.has_image) {
        $('.sr_popup-body').addClass('srp_popup_no_image');
      } else {
        $('.sr_popup-body').removeClass('srp_popup_no_image');
      }

      srp_makeOfferForm(productId, variation_id);
      sr_openPopUp();
      srp_wc_unloadspinner(el);
    }
  });
}
function srp_makeOfferForm(product_id, variation_id) {
  $('#make-offer-form').on('submit', function(e) {
      e.preventDefault(); // Prevent the default form submission

      $('#srp-make-offer-error').hide().text('');

      // Get the selected variation's ID from the dropdown
      var selected_variation_id = $('#offer-variation').val();
      // Fallback: If no variation is selected, use the one provided in the function (variation_id)
      variation_id = selected_variation_id ? selected_variation_id : variation_id;

      // Serialize the form data
      var formData = $(this).serialize();

      // Add the action and nonce to the serialized form data
      formData += '&action=send_offer_to_admin';
      formData += '&nonce=' + sonaar_music.ajax.ajax_nonce;
      formData += '&product_id=' + product_id; // Add product_id to form data
      formData += '&variation_id=' + variation_id;

      // Send the AJAX request
      $.post(sonaar_music.ajax.ajax_url, formData, function(response) {
          if (response.success) {
              $('#make-offer-form')[0].reset(); // Reset the form
              sr_closePopUp();

              // Use the server-provided formatted notice
              var formatted_content = response.data.formatted_notice;
              $('#sonaar-modal .sr_popup-body').html(formatted_content);
              sr_openPopUp();
              
          } else {
            $('#srp-make-offer-error').text(response.data).css('color', 'red').show(); // Display error message from server
          }
      });
  });
}




function srp_askForEmailForm(post_id, track_pos, track_id, data_audio_path, scenario = null, playerID = 'allPlayers', element, trackIdToSave = null) {
  $('#ask-for-email-form').on('submit', function(e) {
      e.preventDefault(); // Prevent the default form submission
      //console.log("Form submitted, preparing AJAX request...");

      $('#srp-dialog-error').hide().text('');

      var form_title = (typeof sonaar_music.option.download_settings_afe_form_title !== 'undefined') ? sonaar_music.option.download_settings_afe_form_title : 'Free Download';

      // Serialize the form data
      var formData = $(this).serialize();

      // Add the action and nonce to the serialized form data
      formData += '&action=srp_ask_for_email_sender';
      formData += '&nonce=' + sonaar_music.ajax.ajax_nonce;
      formData += '&post_id=' + post_id; // Add product_id to form data
      formData += '&track_pos=' + track_pos;
      formData += '&track_id=' + track_id;
      formData += '&data_audio_path=' + data_audio_path;

      // If a scenario is provided, add the scenario ID to the data
      if (scenario) {
        formData += '&scenario_id=' + scenario.id;

        if(scenario.action_when.downloadButtonClicked){
          formData += '&scenario_action=download';
        }else{
          formData += '&scenario_action=play';
        }
      }

      //console.log("Form Data being sent:", formData);

      // Send the AJAX request
      $.post(sonaar_music.ajax.ajax_url, formData, function(response) {
          //console.log("AJAX response received:", response);

          if (response.success) {
              //console.log("Form submission successful:", response.data);
              $('#ask-for-email-form')[0].reset(); // Reset the form
              sr_closePopUp();

              // Use the server-provided formatted notice
              var formatted_content = response.data.formatted_notice;
              $('#sonaar-modal .sr_popup-body').html(formatted_content);
              sr_openPopUp();
              
              if (typeof IRON.advancedTriggers !== 'undefined') {
                IRON.advancedTriggers.markTrackAsActioned(scenario, playerID, `track_${trackIdToSave}`, 'popup');
              }
              // Update the element's href attribute with the provided download link
              if (response.data.download_link) {
                if (IRON.advancedTriggers) {
                  const player = $(element).closest('.iron-audioplayer');
                  const targetPlayer = player.length ? player[0] : IRON.audioPlayer.activePlayer?.[0];
              
                  if (targetPlayer) {
                      IRON.advancedTriggers.attachDownloadButtonListener(targetPlayer, scenario, true);
              
                      if (!player.length) {
                          $('#sonaar-player')
                              .find('.sr_store_force_dl_bt')
                              .attr('href', response.data.download_link);
                      }
                  }
              }
                //check if element has class sr_store_force_dl_bt
               /* if($(element).hasClass('sr_store_force_dl_bt')){
                  $(element).attr('href', response.data.download_link); // WIP: if Element is from widget, it wont get added to sticky player or vice versa.
                }else{
                  $(element).find('.sr_store_force_dl_bt').attr('href', response.data.download_link);
                }

                //check if sticky player is present on the page
                if($('#sonaar-player').length){
                  $('#sonaar-player').find('.sr_store_force_dl_bt').attr('href', response.data.download_link);
                }

                //check if closest has class sr_store_force_dl_bt
                if($(element).closest('#sonaar-player').length){
                  $(element).attr('href', response.data.download_link);
                  //check its active player widget
                  if(IRON.audioPlayer.activePlayer){
                    $(IRON.audioPlayer.activePlayer).find('li.current .sr_store_force_dl_bt').attr('href', response.data.download_link);
                  }
                }*/
              }
               
              if(srp_isPausedFromPopup && IRON.audioPlayer.activePlayer){
                // In some cases, the audio has been paused from the popup, we need to play it again to gain access
                const audioElement = sr_setAudioElementInstance(IRON.audioPlayer.activePlayer);
                audioElement.muted = false;
                srp_isPausedFromPopup = false;
                audioElement.play();
              }

          } else {
            console.error("Error in response:", response.data);
            $('#srp-dialog-error').text(response.data).show(); // Display error message from server
          }
      }).fail(function() {
        console.error("AJAX request failed.");
        var formatted_content = '<h3 style="font-size:18px;font-weight:600;">' + form_title + '</h3><p style="color: var(--srp-global-modal-btn-bg-color);">Failed to send. Please contact support with code 91053</p>';
        $('#sonaar-modal .sr_popup-body').html(formatted_content);
        sr_openPopUp();
      }).always(function() {
        //console.log("AJAX request completed.");
      });
  });
}


function srp_add_to_cart_loadspinner(el) { //Add spinner animation from sonaar on the Add to Cart button from the variation modal.
  srp_wc_loadspinner(el);
  setInterval(function () {
    if (!el.hasClass('loading')) {
      clearInterval();
      srp_wc_unloadspinner(el);
    }
  }, 5);
}

function srp_wc_loadspinner(el) {
  
  if (el.closest('#sonaar-player .track-store').length > 0 || el.parents('.srp_ext_featured_cta').length  || el.parents('.srp_ext_cta').length) { // Button is in the sticky player
    el = el.closest('a'); // Replace el with the <a> element or its closest ancestor <a>

    el.parent().addClass('sricon-spinner');
    el.parent().css({
      width: el.parent().css("width"),
      fontSize: '16px',
      textAlign: 'center',
    });
    el.css({
      display: "none",
    });
    return;
  }
  var trigger_html = el.html();
  var computedStyles = window.getComputedStyle(el.get(0));

  var trigger_bgcolor = computedStyles.backgroundColor;
  var trigger_color = computedStyles.color;
  var trigger_width = computedStyles.width;
  var trigger_height = computedStyles.height;
  el.data('html', trigger_html);
  el.css("pointer-events", "none");
  el.css({
    backgroundColor: trigger_bgcolor,
    color: trigger_color,
    width: trigger_width,
    height: trigger_height
  });
  if (el.attr('class') === 'sricon-info') {
    el.data('class', el.attr('class'));
    el.removeClass('sricon-info');
  }
  $spinnerWrap = $('<span class="sricon-spinner-wrap"></span>');
  $spinner = $('<span class="sricon-spinner"></span>');
  $spinnerWrap.html($spinner);
  el.html($spinnerWrap);

  startButtonLoaderTimeout = setTimeout(function () {
    $spinnerWrap.addClass('sricon-spinner-wrap-ready');
  }, 5);
}
function srp_wc_unloadspinner(el) {
  if (el.closest('#sonaar-player .track-store').length > 0 || el.parents('.srp_ext_featured_cta').length || el.parents('.srp_ext_cta').length ) { // Button is in the sticky player
    el = el.closest('a'); // Replace el with the <a> element or its closest ancestor <a>
    el.parent().removeClass('sricon-spinner');
    el.parent().css({
      width: "initial",
      fontSize: 'initial',
      textAlign: 'initial',
    });
    el.css("display", "");
    return;
  }

  if (el.data('class') === 'sricon-info') {
    el.addClass(el.data('class'));
  }

  el.html(el.data('html'));
  var resetStyles = {
    backgroundColor: '',
    color: '',
    width: '',
    height: ''
  };
  el.css("pointer-events", "auto");
  el.css(resetStyles);
};
function srp_selectVariation(el) {
    $('.srp-modal-product-variation .srp_selected').removeClass('srp_selected');
    $(el).addClass('srp_selected');
    $('.srp-modal-variation-details[data-variant_id="' + $(el).data('variant_id') + '"]').addClass('srp_selected');

    // Display Price from the selected variation
    $('.srp-modal-variant-main .srp-modal-variant-price .woocommerce-Price-amount').html($(el).find('.srp-modal-variant-price>.woocommerce-Price-amount').html());

    // Set the selected variation URL to the "Add to cart" button
    var variationId = $(el).data('variant_id');
    var productId = $('.srp-modal-product-variation').data('product_id');
    $('#srp-add-to-cart-btn').attr('href', '?add-to-cart=' + productId + '&variation_id=' + variationId);
    $('#srp-add-to-cart-btn').attr('data-product_id', variationId);

    // Toggle between "Make an Offer" button and "Add to Cart" button
    var makeOfferEnabled = $(el).data('make_offer_enabled');
    var hideAddToCart = $(el).data('make_offer_hide_addtocart');
    if (makeOfferEnabled === 'yes' && hideAddToCart === 'yes') {
        $('.srp-modal-product-variation #srp-add-to-cart-btn').hide(); // Hide Add to Cart button
        $('.srp-modal-product-variation #make-offer-btn').show(); // Show Make an Offer button
        $('.srp-modal-product-variation #srp-total-price').hide(); // Hide the total price
    } else if (makeOfferEnabled === 'yes' && hideAddToCart !== 'yes') {
        $('.srp-modal-product-variation #srp-add-to-cart-btn').show(); // Show Add to Cart button
        $('.srp-modal-product-variation #make-offer-btn').show(); // Show Make an Offer button
        $('.srp-modal-product-variation #srp-total-price').show(); // Show the total price
    } else {
        $('.srp-modal-product-variation #make-offer-btn').hide(); // Hide Make an Offer button
        $('.srp-modal-product-variation #srp-add-to-cart-btn').show(); // Show Add to Cart button
        $('.srp-modal-product-variation #srp-total-price').show(); // Show the total price
    }
  }




function srp_setTrackListColumns(player, fromResize = false){
  if( !$(player).hasClass('srp_has_customfields') || $(player).hasClass('srp_tracklist_grid'))
    return

  if($(player).find('.playlist').width() < 500 && ! $(player).hasClass('srp_responsive') ){
    $(player).addClass('srp_responsive');
    $(player).find('.sr-playlist-item').each(function () {
      setColumnCta(this)
    }) 
  }else if( $(player).find('.playlist').width() >= 500 && $(player).hasClass('srp_responsive') ){
    $(player).removeClass('srp_responsive'); 
    $(player).find('.sr-playlist-item').each(function () {
      setColumnCta(this)
    })  
  }

  const gabBetweenItem = 10; //Flex Gab value
  let responsiveHiddenSection = [];

  const track = $(player).find('.sr-playlist-item:not([data-relatedtrack="1"])').eq(0);
  const ifSoundwaveWidthNotSet = Boolean(track.find('.srp_soundwave_wrapper').length && track.find('.srp_soundwave_wrapper').css('flex-basis') == '100%');
  var playlistItemElementsWidth = 0;
  if(!fromResize){
    /*Insert Spacer if doesnt have info button*/
    const noteButtonWidth = ($(player).find('.sr-playlist-item:not([data-relatedtrack="1"]) .srp_noteButton').length)? $(player).find('.sr-playlist-item:not([data-relatedtrack="1"]) .srp_noteButton').width() : 0;
    $(player).find('.srp_info_spacer').remove();
    $(player).find('.sr-playlist-item:not([data-relatedtrack="1"])').each(function(){
      if(noteButtonWidth && ! $(this).find('.srp_noteButton').length){
        let spacer = $('<div/>', { class: 'srp_info_spacer' }).css('min-width', noteButtonWidth);
        $(this).find('.store-list').after(spacer);
      }
    });
    

    track.find('.audio-track > *').each(function () { 

      playlistItemElementsWidth += this.getBoundingClientRect().width
    });
    if(track.find('.sr_track_cover').length){
      playlistItemElementsWidth += track.find('.sr_track_cover').width() - 12;//12px gap
    }
    if(track.find('.store-list').length){
      playlistItemElementsWidth += track.find('.store-list').width() - 12;//12px gap
    }
    $(player).data('playlistItemElementsWidth' , playlistItemElementsWidth);
  }else if(typeof $(player).data('playlistItemElementsWidth') != 'undefined' && ! ifSoundwaveWidthNotSet){
    playlistItemElementsWidth = $(player).data('playlistItemElementsWidth');
  }
  
  if(playlistItemElementsWidth !== 0 && $(player).find('.srp_soundwave_wrapper').length){
    if( typeof track.data('track-width') == 'undefined'){
      columnTotalWidth = track.width() - playlistItemElementsWidth;
      track.data('track-width', columnTotalWidth)
    }else{
      columnTotalWidth = track.data('track-width');     
    }
    $(player).find('.sr-playlist-cf-container').css('flex', '0 1 ' + columnTotalWidth + 'px');///When soundwave width is set, the CF column container width is based on the available space.
  }
  
  var biggestColumnContainer = 0
  track.find('.sr-playlist-cf-child').each(function(index){
    const sectionClass = $(this).data('id');
    let cfWidth = 0;
    for (let i = index; i < track.find('.sr-playlist-cf-child').length; i++) {
      let ii = track.find('.sr-playlist-cf-child').length - i -1;
      if( track.find('.sr-playlist-cf-child').eq(ii).attr('data-width')){
        cfWidth += parseInt(track.find('.sr-playlist-cf-child').eq(ii).attr('data-width'), 10) + gabBetweenItem;
      }else{
        track.find('.sr-playlist-cf-child').eq(ii).attr('data-width', track.find('.sr-playlist-cf-child').eq(ii).width() )
        cfWidth += track.find('.sr-playlist-cf-child').eq(ii).width() + gabBetweenItem;
      }
      if(ifSoundwaveWidthNotSet && i == track.find('.sr-playlist-cf-child').length - 1 && cfWidth > biggestColumnContainer){
        biggestColumnContainer = cfWidth;
        $(player).find('.sr-playlist-cf-container').css('flex', '0 1 ' + cfWidth + 'px') //When no soundwave width is set (100% by default), set the width of the columns container based on its requirements.
      }
    }
    if( track.find('.sr-playlist-cf-container').width() < cfWidth ){ //If no enough space for the custom heading
      responsiveHiddenSection.push(sectionClass);
    }
    
  });

  responsiveHiddenSection = responsiveHiddenSection.filter(function(item, pos) { // Remove duplicated item from array
    return responsiveHiddenSection.indexOf(item) == pos;
  })

  $(player).find('.sr-cf-heading .sr-playlist-heading-child').each(function(){
    const sectionClass = $(this).data('sort');
    
    if( $(this).index() > $(player).find('.sr-cf-heading .sr-playlist-heading-child').length - responsiveHiddenSection.length ){
      $(this).addClass('srp_hidden');
      $(player).find('.'+sectionClass).addClass('srp_hidden');
      srp_setTrackListColumns_headerPosition(player);
    }else{
      $(this).removeClass('srp_hidden');
      $(player).find('.'+sectionClass).removeClass('srp_hidden');
    }
  });

  /*Set Header Custom field Position*/
  srp_setTrackListColumns_headerPosition(player);
}

function setColumnCta(trackListItem) {
  if( !$(trackListItem).find('.store-list').length || $(trackListItem).parents('.srp_tracklist_grid').length )
    return;
  
  const storeListCurrentWidth = parseInt($(trackListItem).find('.store-list').css('flex').split(' ')[2], 10);
  const storeList = $(trackListItem).find('.store-list');
  let storeListWidth = 0;
  const dataWidth = ($(trackListItem).parents('.srp_responsive').length)? 'mobile-width' : 'width'; 
  if( typeof storeList.find('.song-store-list-menu').data( dataWidth ) == 'undefined' || $('.elementor-editor-active').length ){ 
    let storeListMinusWidth = 0;
    let extendable = false;
    let dotsPosition = 'right: 10px;'
    $(trackListItem).find('.song-store:not(.srp_hidden)').each(function () {
      if( $(this).offset().left < storeList.offset().left ){
        extendable = true;
      }else if( storeListMinusWidth == 0 && extendable){
        storeListMinusWidth = $(this).offset().left - storeList.offset().left 
        storeListWidth = Math.ceil(storeListCurrentWidth - storeListMinusWidth);
        dotsPosition = 'left:'+ ( storeListMinusWidth - 25 ) + 'px;'
      }
    })
    if( extendable ){
      $(trackListItem).addClass('srp_extendable');
      storeList.find('.song-store-list-menu').width( storeListWidth );
      storeList.find('.song-store-list-menu').data( dataWidth, storeListWidth + '');
      const dots = $('<i/>', { class: 'fas fa-ellipsis-h srp_ellipsis', style: 'position: absolute; ' + dotsPosition  });
      if(storeList.find('.srp_ellipsis').length){
        storeList.find('.srp_ellipsis').replaceWith(dots);
      }else{
        storeList.append(dots);
      }
    }else{
      storeList.find('.song-store-list-menu').data( dataWidth, 'none' )
    }
  }else{
    if( storeList.find('.song-store-list-menu').data( dataWidth ) == 'none' ){
      $(trackListItem).removeClass('srp_extendable');
      storeList.find('.song-store-list-menu').width( 'inherit' );
    }else{
      $(trackListItem).addClass('srp_extendable');
      storeListWidth = parseInt(storeList.find('.song-store-list-menu').data( dataWidth ), 10);
      dotsPosition = (storeListWidth == 0 )? (storeListWidth + 10) + 'px' : (storeListWidth + 10) + 'px';
      storeList.find('.song-store-list-menu').width( storeListWidth );
      storeList.find('.srp_ellipsis').css({'left':'unset','right': dotsPosition })
    }
  }
}

function srp_setTrackListColumns_headerPosition(player){
  /*Set Header Custom field Position*/
  setTimeout(function(){
    $(player).find('.sr-playlist-item:not([data-relatedtrack="1"])').each(function(){
      $(this).find('.sr-playlist-cf-child').each(function(){
        const sectionClass = $(this).data('id');
        const sectionPosition = $(this)[0].offsetLeft;
        const sectionWidth = $(this).width();
        const elIndex = $(this).parents('.sr-playlist-cf-container').find('.'+sectionClass).index(this);//Use elIndex to select the right heading when many columns have the same data-id.
        $(player).find('[data-sort="'+ sectionClass +'"]').eq(elIndex).css({'position':'absolute','left': sectionPosition+'px', 'width': sectionWidth + 'px'});
      });
     });
  }, 60);//Requried a delai when we have many CTA
}



/*------------------------------
Search & filter Parameters
------------------------------*/
function srp_getPlayerId(player){
    if( $(player).parents('.elementor-widget-music-player').length && typeof $(player).parents('.elementor-widget-music-player').attr('id') != 'undefined'){ //if mp3 player has id from elementor 
      playerId = ( $(player).parents('.elementor-widget-music-player').attr('id') )
    }else if( ! $(player).parents('.iron_widget_radio').attr('id').startsWith('arbitrary-instance-') ){ //if mp3 player has id from shortcode parameter 
      playerId = $(player).parents('.iron_widget_radio').attr('id');
    }else{
      playerId = $(player).parents('.iron-audioplayer').attr('id');
    }
    if(typeof playerId == 'undefined'){
      playerId = player.id;
    }
    return playerId;
  
}
function srp_scrollTo(player, offset){
  var element = player[0].querySelector('.playlist');
  var rect = element.getBoundingClientRect();
  var viewportTopPosition = rect.top;
  window.scroll({
      top: window.scrollY + viewportTopPosition - offset,
      left: 0,
      behavior: 'smooth'
  });
}
function srp_updatePage(pageNumber, player){

  if(player.pagination_offset >= 0){
    srp_scrollTo(player, player.pagination_offset);
  }


  player.params.page = pageNumber;
  srp_updateURLParameter( 'srp_player_id', srp_getPlayerId(player) );
  srp_updateURLParameter('srp_page', pageNumber);
}
function srp_updateOrder(sortValue, player){
  player.params.order = sortValue;
  srp_updateURLParameter( 'srp_player_id', srp_getPlayerId(player) );
  srp_updateURLParameter('srp_order', sortValue);
}
//Add parameter to the URL
function srp_updateURLParameter(param, paramVal = null){
  if(paramVal === null)
   return

  const url = window.location.href;
  let newAdditionalURL = '';
  let tempArray = url.split('?');
  const baseURL = tempArray[0];
  const additionalURL = (typeof tempArray[1] != 'undefined')? tempArray[1] : '';
  let temp = '';
  if (additionalURL != '') {
      tempArray = additionalURL.split('&');
      for (var i=0; i<tempArray.length; i++){
          if(tempArray[i].split('=')[0] != param){
              newAdditionalURL += temp + tempArray[i];
              temp = '&';
          }
      }
  }
  const newParam =  (paramVal != '')? encodeURIComponent(param) + '=' + encodeURIComponent(paramVal) : '';
  const rows_txt = temp + '' + newParam;
  newAdditionalURL += rows_txt;
  newAdditionalURL = (newAdditionalURL != '')? '?' + newAdditionalURL : '';
  if( newAdditionalURL.charAt(0) == '&'){
    newAdditionalURL = newAdditionalURL.substring(1);
  }
  if( newAdditionalURL.charAt(newAdditionalURL.length - 1) == '&'){
    newAdditionalURL = newAdditionalURL.slice(0, -1)
  }
  if( newAdditionalURL.replace('?','') != additionalURL){
      window.history.pushState(null, '', baseURL + newAdditionalURL )
  }
}

function srp_removeMeta(metaName, metaValue = null, playerId, selecttype = 'singleselect') {
  if (selecttype == 'multiselect_or') {
      metaName = metaName + '_or';
  }
  if (selecttype == 'range') {
      metaName = metaName + '_minmax';
  }
  const playerNum = srp_convertPlayerIdToPlayerNum(playerId) !== null ? srp_convertPlayerIdToPlayerNum(playerId) : 0;

  if (typeof IRON.players[playerNum].audioPlayer.params === 'undefined') {
      return;
  }

  const clearSearch = () => {
      const searchBoxSelector = playerId != null ? `.srp_search_container[data-player-id="${playerId}"]` : '.srp_search_container:not([data-player-id])';
      $(searchBoxSelector).find('.srp_reset_search').css('display', 'none');
      $(searchBoxSelector).each(function() {
          $(this).find('.srp_search')[0].value = '';
      });
      IRON.players[playerNum].audioPlayer.params.search = '';
  };

  const clearMetaFilter = (key) => {
      if(typeof IRON.players[playerNum].audioPlayer.params.meta != 'undefined'){
        IRON.players[playerNum].audioPlayer.params.meta[key] = '';
      }
      const activeButtons = $(document).find(`.srp_filter_button.srp_filter_button--active[data-metakey="${key}"]`);
      activeButtons.removeClass('srp_filter_button--active').removeAttr('style');
  };

  if (metaName === 'all') {
    //usage : srp_removeMeta('all', null, 'myplayer01');
      clearSearch();
      if (typeof IRON.players[playerNum].audioPlayer.params.meta !== 'undefined') {
          Object.keys(IRON.players[playerNum].audioPlayer.params.meta).forEach(clearMetaFilter);
      }
  } else if (metaName === 'search') {
      clearSearch();
  } else {
      if (metaValue == null) {
          clearMetaFilter(metaName);
      } else if (typeof IRON.players[playerNum].audioPlayer.params.meta !== 'undefined' && typeof IRON.players[playerNum].audioPlayer.params.meta[metaName] !== 'undefined') {
          const metaString = IRON.players[playerNum].audioPlayer.params.meta[metaName].split(',');
          const index = metaString.indexOf(metaValue);
          if (index > -1) {
              metaString.splice(index, 1);
              IRON.players[playerNum].audioPlayer.params.meta[metaName] = metaString.join(',');
              const dataPlayerId = playerId ? `[data-playerid="${playerId}"]` : '';
              const activeButtons = $(document).find(`.srp_filter_button--active[data-value="${metaValue}"]${dataPlayerId}`);
              activeButtons.removeClass('srp_filter_button--active').removeAttr('style');
          }
      }
  }

  srp_updatePage(1, IRON.players[playerNum].audioPlayer);
  srp_updateList(playerNum);
}


function srp_addMeta( playerId, metaName, metaValue, selecttype = null ){
  if(selecttype == 'multiselect_or' ){
    metaName = metaName + '_or';
  }
  if(selecttype == 'range'){
    metaName = metaName + '_minmax';
  }else{
    metaValue = metaValue.replace(',', 'ii44');

  }
  const playerNum = ( srp_convertPlayerIdToPlayerNum(playerId) !== null)? srp_convertPlayerIdToPlayerNum(playerId) : 0 ;
  
  if( typeof IRON.players[playerNum].audioPlayer.params == 'undefined'){
    IRON.players[playerNum].audioPlayer.params = {};
  }
  if( typeof IRON.players[playerNum].audioPlayer.params.meta == 'undefined'){
    IRON.players[playerNum].audioPlayer.params.meta = false;
  }
 if( IRON.players[playerNum].audioPlayer.params.meta === false){
    let newValue = [];
    newValue[metaName] = metaValue;
    IRON.players[playerNum].audioPlayer.params.meta = newValue;
 }else if( metaName in IRON.players[playerNum].audioPlayer.params.meta ){
    const paramArray = IRON.players[playerNum].audioPlayer.params.meta[metaName].split(',')
    if( ! paramArray.includes(metaValue) ){
      IRON.players[playerNum].audioPlayer.params.meta[metaName] += ','+ metaValue;
    }
 }else{
  IRON.players[playerNum].audioPlayer.params.meta[metaName] = metaValue
 }
  IRON.players[playerNum].audioPlayer.params.playerId = playerId;
  srp_updatePage(1, IRON.players[playerNum].audioPlayer);
  //srp_updateURLParameter( 'srp_page', 1 );
  srp_updateList( playerNum );
}


/*Listener on the URL change*/
//Source: https://itsopensource.com/how-to-call-a-function-on-URL-change-in-javascript/
/*
(function(history){
  var pushState = history.pushState;
  history.pushState = function() {
    pushState.apply(history, arguments);
    srp_updateList()
  };
})(window.history);
*/

function srp_setSearchFiltersFromUrl(){
  
  const urlParams = new URLSearchParams(document.location.search);
  const playerId = srp_getPlayerIdParamFromUrl();
  const playerNum = ( srp_convertPlayerIdToPlayerNum(playerId) !== null)? srp_convertPlayerIdToPlayerNum(playerId) : 0 ;
  var verifyParams = false;
  for (const key of urlParams.keys()) {
    if (key.startsWith('srp_')) {
      verifyParams = true;
    }
  }




  IRON.players[playerNum].audioPlayer.params = { //Save parameter
    playerId: playerId,
    search: urlParams.get('srp_search'),
    meta: srp_getAllMetaParams(),
    page: urlParams.get('srp_page'),
    order: urlParams.get('srp_order'),
  }
  for (let i = 0; i < IRON.players.length; i++) {
    if(i == playerNum){
      if(verifyParams || IRON.players[playerNum].audioPlayer.lazy_load){ //If no srp_ param in the URL
        srp_updateList( playerNum )
      }
    }else{
      IRON.audioPlayer.reloadAjax(IRON.players[i].audioPlayer, true);
    }
  }
}

function srp_getPlayerIdParamFromUrl(){
  const urlParams = new URLSearchParams(document.location.search);
  let playerId = urlParams.get('srp_player_id');
  if( playerId != null && playerId.startsWith('playernum-') ){ //eq: playernum-1 target the first player even without ID. Used by the search field from the mp3 player. 
    const playerNum = playerId.split('playernum-')[1]-1;
    playerId = $('.iron-audioplayer').eq(playerNum).attr('id');
  }
  return playerId;
}

function srp_getAllMetaParams(){
  const urlParams = new URLSearchParams(document.location.search);
  let metaParams = urlParams.get('srp_meta');
  if( metaParams ){
    metaParams = metaParams.split(';');
    metaParams = metaParams.filter((_, index) => index != metaParams.indexOf('')); //Remove Empty array element
    let newmetaParamsArray = [];
    metaParams.map(function(el){
      const metaName = el.split(':', 1)[0];
      const metaValue = el.replace(metaName + ':', '');
      newmetaParamsArray[decodeURIComponent(metaName)] = decodeURIComponent(metaValue);
    })
    return newmetaParamsArray;
  }
  return false;
}

function srp_getMetaParams(metaName){
  let meta = srp_getAllMetaParams();
  meta = meta[metaName];
  if(typeof meta == 'string'){
    meta = meta.split(',');
    meta = meta.map( el => { return el.replace('ii44',','); });
    return meta;
  }else{
    return null;
  }
}

function srp_insertChips( playerNum = 0){

  const metaParams = (typeof IRON.players[playerNum].audioPlayer.params.meta == 'object')? IRON.players[playerNum].audioPlayer.params.meta : [];
  let chipsSelector = '.srp_chips:not([data-player-id])';
  let chipsSelectorToRemove = chipsSelector;
  let playerId = ( typeof IRON.players[playerNum].audioPlayer.params.playerId !== 'undefined' )? IRON.players[playerNum].audioPlayer.params.playerId : null;
  if( playerId !== null ){
    if( $('.srp_chips[data-player-id="' + IRON.players[playerNum].audioPlayer.params.playerId + '"]').length ){
      chipsSelector = '.srp_chips[data-player-id="' + IRON.players[playerNum].audioPlayer.params.playerId + '"]'
      chipsSelectorToRemove = chipsSelector;
      if( playerNum == 0 ){
        chipsSelectorToRemove += ', .srp_chips:not([data-player-id])'   
      }
    }
  }
  
  $( chipsSelectorToRemove ).find('.srp_chip').remove();
  if( IRON.players[playerNum].audioPlayer.params.search != null){
    metaParams['search'] = IRON.players[playerNum].audioPlayer.params.search;
  }
  updateFilterSelector(metaParams, playerId);
  for (const property in metaParams) {
    const metaMultiParams = metaParams[property].split(',');

    if(property.endsWith('_or')){
      var title = $('[data-metakey="' + property.slice(0, -3) + '"]').data('label');
    }else if(property.endsWith('_minmax')){
      var title = $('[data-metakey="' + property.slice(0, -7) + '"]').data('label');
    }else{
      var title = $('[data-metakey="' + property + '"]').data('label');
    }
   
    const playerWidgetId = (typeof IRON.players[playerNum] != 'undefined')? IRON.players[playerNum].audioPlayer.id : null ;
    const valueForHuman = [];
    for (let i = 0; i < metaMultiParams.length; i++) {
      valueForHuman[i] = metaMultiParams[i];
      if(metaMultiParams[i] != ''){
        // if metamultiparams[i] contains _ then it's a range so rename the param min > max
        if(metaMultiParams[i].includes('_')){
         // metaMultiParams[i] = metaMultiParams[i].replace('_', ' > ');
        }
        if(property == 'track_length_minmax'){
          const times = metaMultiParams[0].split('_');
          const startTime = secondsToTime(parseInt(times[0]));
          const endTime = secondsToTime(parseInt(times[1]));
          valueForHuman[i] = startTime + ' - ' + endTime;
        }
        
        metaMultiParams[i] = metaMultiParams[i].replace('ii44', ',');
        chip = $('<div/>', {
          class: 'srp_chip',
          data: { meta: property, playerid: playerWidgetId },
          html: title + ': ' + valueForHuman[i].replace('_', ' - ') + '<i class="sricon-close-circle"></i>'
        });

        function compareSliderValue(array1, array2) {
          if (array1.length !== array2.length) {
            return false;
          }
          for (let i = 0; i < array1.length; i++) {
            const element1 = array1[i];
            const element2 = array2[i];
            if (element1 != element2) {
              return false;
            }
          }
          return true;
        }

        function resetSliderValue(currentMinMaxValue){
          IRON.rangeSelector.forEach(function (slider) {
            if(compareSliderValue(slider.sliderValue, currentMinMaxValue)){
              slider.sliderValue = slider.sliderValue = [ Number(slider.computedMin), Number(slider.computedMax) ];
            }
          })
        }
        
        $(chip).on('click', function(){
          if(property.includes('_minmax')){
            resetSliderValue(metaMultiParams[0].split('_'));
          }
          const metaName = $(this).data('meta');
          srp_removeMeta( metaName, metaMultiParams[i], playerId);
        })
        $(chip).appendTo( chipsSelector );
      }
    }
  }
  if ($(chipsSelector).find('.srp_chip').length > 1 && !$(chipsSelector).data('hideclear')){
    // Retrieve the value of the data-clearall attribute
    const clearAllText = $(chipsSelector).data('clearall') || 'Clear All';
  
    const clearAllChip = $('<div/>', {
      class: 'srp_chip srp_chip_clear_all',
      data: { playerid: playerId },
      html: clearAllText + '<i class="sricon-close-circle"></i>',
    });
  
    $(clearAllChip).on('click', function() {


      for (const property in metaParams) {
        if(property.includes('_minmax')){
          resetSliderValue(metaParams[property].split('_'));
        }
      }


      srp_removeMeta('all', null, playerId);
    });
  
    $(clearAllChip).appendTo(chipsSelector);
  }
}

function srp_updateList( playerNum ){
  if(  typeof IRON.players[playerNum].audioPlayer.params != 'undefined' ) {
    let playerId = IRON.players[playerNum].audioPlayer.params.playerId;
    /* Playerid Param*/
    if( typeof IRON.players[playerNum].audioPlayer.params.playerId != 'undefined' ) {

      target_playerId = IRON.players[playerNum].audioPlayer.params.playerId;
      if(playerId != null && playerId.startsWith('arbitrary-instance-')){ //ID is provide the embed search
        playerId = 'playernum-' + ( parseInt(playerNum, 10) + 1);
      }
      srp_updateURLParameter( 'srp_player_id', playerId );

    }else{
      target_playerId = null;
      srp_updateURLParameter( 'srp_player_id', '');
    }

    /* Search Param*/
    if( 
      typeof IRON.players[playerNum].audioPlayer.params.search != 'undefined' &&
      (typeof IRON.players[playerNum].audioPlayer.orderedList != 'undefined' || IRON.players[playerNum].audioPlayer.lazy_load)
    ) {
      srp_updateURLParameter( 'srp_search', IRON.players[playerNum].audioPlayer.params.search );
      if( target_playerId ){
        if(target_playerId.startsWith('arbitrary-instance-')){ //ID is provide the embed search
          searchDiv = $(document).find('#' + target_playerId + ' .srp_search');
        }else{
          searchDiv = $(document).find('.srp_search_container[data-player-id=' + target_playerId + '] .srp_search');
        }
      }else{  
        searchDiv = $(document).find('.srp_search_container:not([data-player-id]) .srp_search');
      }
      searchDiv.val(IRON.players[playerNum].audioPlayer.params.search);
      if(typeof IRON.players[playerNum].audioPlayer.orderedList != 'undefined'){ 
        IRON.players[playerNum].audioPlayer.orderedList.search(IRON.players[playerNum].audioPlayer.params.search);
      }
      
    }else{
      srp_updateURLParameter( 'srp_search', '');
    }
    /* Meta Param*/
    if( typeof IRON.players[playerNum].audioPlayer.params.meta == 'object' ) {
      const metaParamsArray = IRON.players[playerNum].audioPlayer.params.meta;
      let metaParamsString = '';
      for (const property in metaParamsArray) {
        if(metaParamsArray[property] != ''){
          metaParamsString += property + ':' + metaParamsArray[property] + ';'

          // Set active filter buttons from URL strings
          metaValues = metaParamsArray[property].split(',');
          for(value in metaValues){
            activeBt = document.querySelectorAll('.srp_filter_button[data-metakey="' + property + '"][data-value="' + metaValues[value] + '"][data-playerid="' + target_playerId + '"]');
            activeBt.forEach( function(el) {
              el.classList.add('srp_filter_button--active');
              el.style.backgroundColor = el.dataset.color;
              el.style.borderColor = el.dataset.color;
            })
          }
        }else{
          delete IRON.players[playerNum].audioPlayer.params.meta[property];
        }
      }
      srp_updateURLParameter( 'srp_meta', metaParamsString );

      if( typeof IRON.players[playerNum].audioPlayer.orderedList != 'undefined' ){
        let paramName = '';
        let newMetaParamsArray = [];
        for (const property in metaParamsArray) {
          paramName = srp_addPrefixToParams(property);
          newMetaParamsArray[paramName] = metaParamsArray[property];
        }
        IRON.players[playerNum].audioPlayer.orderedList.filter(function (item) {
          var queryCondition = true;
          for (const property in newMetaParamsArray) { 
            if( typeof item.values()[property] != 'undefined'){
              let valueToSearch = newMetaParamsArray[property].split(',');
              valueToSearch = valueToSearch.map( el => { return el.toLowerCase().replace('ii44',','); });
              let itemValue = item.values()[property].toLowerCase().split(', ');
              let alreadyMatched = false;
              for (const i in itemValue) {
                if( valueToSearch.includes( srp_decodeHTMLEntities(itemValue[i])) && !alreadyMatched ){
                  alreadyMatched = true;
                }
              }
              if(!alreadyMatched){
                queryCondition = false;
              }
            }
          }
          return queryCondition;
        });
      }
    } 

    srp_insertChips(playerNum);
    IRON.audioPlayer.reloadAjax(IRON.players[playerNum].audioPlayer, true);
    
  } 

}

function srp_addPrefixToParams(param){ 
  switch(param) {
    case 'title':
      return 'tracklist-item-title';
    case 'description':
      return 'srp_track_description';
    case 'time':
      return 'tracklist-item-time';
    default:
      return 'sr-playlist-cf--' + param;
  }
}

function srp_scrollToTrackListTop(id){
  if ($('#' + id).closest('.srp-scrolltotracklisttop-disable').length) { //Avoid scrolling to top when the class is present. Add the srp-scrolltotracklisttop-disable class to the player or to a parent to disable the scroll to top feature)
    return;
  }
  const yOffset = -30; 
  const element = document.getElementById(id);
  const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

  window.scrollTo({top: y, behavior: 'smooth'});

  // $('#'+id)[0].scrollIntoView();
    $('#'+id).find('.srp_list').addClass('srp_contentLoading'); //prevent transiton width animation on Cta when a new content appears.
    setTimeout(function(){
      $('#'+id).find('.srp_list').removeClass('srp_contentLoading');
    }, 1000);
}

/*------------------------------
END: Search & filter Parameters
------------------------------*/

IRON.repeatButtonToggle = function(){
  const nextRepeatStatus = IRON.repeatNextStatus();
  IRON.repeatStatus = nextRepeatStatus;
  document.cookie = "sonaar_mp3_player_repeat" + "=" + nextRepeatStatus + ";default;path=/";
  $('.iron-audioplayer .srp_repeat').attr('data-repeat-status', nextRepeatStatus);
  $('.iron-audioplayer .srp_repeat').attr('title', IRON.repeatToolTipLabel());
  if( IRON.audioPlayer.stickyEnable ){
    IRON.sonaar.player.repeatStatus = nextRepeatStatus; //Update sticky player vue js variable
  }
}

IRON.repeatNextStatus = function(){
  const repeatStatusList = ['playlist', 'track', 'null'];
  const currentRepeatIndex = repeatStatusList.indexOf(IRON.repeatStatus);
  const nextRepeatIndex = (currentRepeatIndex + 1) % repeatStatusList.length;
  const nextRepeatStatus = repeatStatusList[nextRepeatIndex];
  return nextRepeatStatus;
}

IRON.repeatToolTipLabel = function(){
  const nextRepeatStatus = IRON.repeatNextStatus();
  switch (nextRepeatStatus) {
    case 'playlist':
      return sonaar_music.option.tooltip_repeat_playlist_btn;
      break;
    case 'track':
      return sonaar_music.option.tooltip_repeat_track_btn;
      break;
    case 'null':
      return sonaar_music.option.tooltip_repeat_disable_btn;
      break;
    default:
      return '';
  }
}

function srp_decodeHTMLEntities(str) {
  return str.replace('&amp;', '&').replace('&gt;','>').replace('&lt;','<').replace('&quot;','"');
}

/* Get PlayeNum */
function srp_convertPlayerIdToPlayerNum(playerID, playerToCheck = null) {
  let player = null
  let playerNum = null;
  if( playerID !== null && playerID !== ''){
    if( $('#' + playerID + '.iron-audioplayer').length ){
      player = $('#' + playerID + '.iron-audioplayer');
    }else if($('#' + playerID + ' .iron-audioplayer').length){
      player = $('#' + playerID + ' .iron-audioplayer');
    }
  }
  if(player !== null){
    if(playerToCheck === null ){
      for(const i in IRON.players){
        if( player.data('id') == IRON.players[i].audioPlayer.data('id')){
          playerNum = i;
        }
      }
    }else{
      if( player.data('id') == IRON.players[playerToCheck].audioPlayer.data('id')){
        playerNum = playerToCheck;
      }
    }
  }
  return playerNum;
}

function srp_getParamFromUrl(){
    //params list: "id", "widget_id", "trackid", "time", "ts_id", "play_icon"

  const urlParams = new URLSearchParams(document.location.search);
  let params = {};
  if(urlParams.get('ts_post_id')){ params.id = urlParams.get('ts_post_id') ; }
  if(urlParams.get('ts_time')){ params.time = urlParams.get('ts_time') ; }
  if(urlParams.get('ts_track_num')){ params.trackid = urlParams.get('ts_track_num') - 1 ; }
  if(urlParams.get('ts_player_index')){  //Seclect player
    setTimeout(function(){
      IRON.sonaar.player.selectedPlayer = $('.iron-audioplayer').eq( parseInt( urlParams.get('ts_player_index') ) - 1);
      IRON.sonaar.player.selectedPlayer.addClass('sr_selectedPlayer')
    }, 1000);
  }

  if(Object.keys(params).length && typeof params.id != 'undefined' ){
    sonaar_ts_shortcode( params ); 
  }

}


function srp_setPlayerParamUrl(){

  if(typeof IRON.sonaar.player.currentTime == 'undefined' || IRON.sonaar.player.currentTime == ''){
    return false;
  }

  const params = new URLSearchParams({
    ts_post_id: IRON.sonaar.player.elWidgetId ? IRON.sonaar.player.postId : IRON.sonaar.player.playlistID.toString().split(", "),
    ts_track_num: IRON.sonaar.player.currentTrack + 1,
    ts_player_index: (typeof IRON.sonaar.player.selectedPlayer != 'undefined')? parseInt( srp_convertPlayerIdToPlayerNum(IRON.sonaar.player.selectedPlayer.id) ) + 1 : null,
    ts_time: IRON.sonaar.player.currentTime
  });

  const queryString = params.toString();
  let urlParams = window.location.origin + window.location.pathname + '?' + queryString;

  return urlParams;
}

IRON.swiper = {}; //Directory of custom functions for the swiper/slider

IRON.swiper.isTransitionEnd = true;

IRON.swiper.update = function(audioplayer, currentTrack) {
  if(typeof audioplayer == 'undefined')
    return;

  if( audioplayer == null )
    return;
    
  if( typeof audioplayer.swiper == 'undefined' )
    return;
  
  if( audioplayer.find('.srp_swiper').data('swiper-source') == 'track' ){
    var slideIndex = currentTrack;
    var slidePostId = slideIndex;
  }else{
    var slidePostId = $(audioplayer).find('.sr-playlist-item').eq(currentTrack).data('post-id');
    var slideIndex = -1;
    var trackPostId = '';
    $(audioplayer).find('.sr-playlist-item').each( function(){
        if( trackPostId != $(this).data('post-id')){
          trackPostId = $(this).data('post-id'); 
          slideIndex++;
        }
        if(trackPostId == slidePostId){
          return false;
        }
    })
  }
  if( typeof audioplayer.swiper.params.centeredSlides != 'undefined' && audioplayer.swiper.params.centeredSlides === true ){
    audioplayer.swiper.slideToLoop(slideIndex); //If "centeredSlides", always "slideTo"
  }else{
    var visibleSlidesStartIndex = audioplayer.find('.swiper-slide-active').data('slide-index');
    var visibleSlidesEndIndex = visibleSlidesStartIndex + audioplayer.swiper.params.slidesPerView - 1;
    if (slideIndex < visibleSlidesStartIndex || slideIndex > visibleSlidesEndIndex) {
      audioplayer.swiper.slideToLoop(slideIndex); //If not "centeredSlides", "slideTo" only when the slide is not visible
    }
  }
  
  $(audioplayer).find('.swiper-slide.srp_current').removeClass('srp_current');
  $(audioplayer).find('.swiper-slide[data-slide-id="' + slidePostId + '"]').addClass('srp_current');
  if( $(audioplayer).find('.srp_swiper').data('swiper-source') == 'post' ){ //Only update track info when the swiper is from post.
    const titleAndArtistName = $(audioplayer).find('.sr-playlist-item').eq(currentTrack).data("tracktitle").split('<span class="srp_trackartist">');
    $(audioplayer).find('.swiper-slide[data-slide-id="' + slidePostId + '"] .srp_swiper-track-title').html(titleAndArtistName[0]);
    if( $(audioplayer).find('.srp_swiper-track-artist').length && titleAndArtistName.length > 1){
      var artistName = titleAndArtistName[1].split('</span>')[0];
      $(audioplayer).find('.swiper-slide[data-slide-id="' + slidePostId + '"] .srp_swiper-track-artist').html(artistName);
    }
  }
  IRON.swiper.isTransitionEnd = false;
}


IRON.swiper.play = function(el, audioPlayer){
  const playlistID = $(el).parents('.swiper-slide').data('slide-id');
  if( audioPlayer.find('.srp_swiper').data('swiper-source') == 'track' ){
    audioPlayer.find('.sr-playlist-item').eq(playlistID).find('.srp_audio_trigger').trigger('click');
  }else{
    const currentTrackIndex = (IRON.audioPlayer.stickyEnable)? IRON.sonaar.player.currentTrack : $('.sr-playlist-item.current').index();
    if(  audioPlayer.find('.sr-playlist-item').eq(currentTrackIndex).data('post-id') == playlistID ){
      audioPlayer.find('.sr-playlist-item .srp_audio_trigger').eq(currentTrackIndex).trigger('click');
    }else{
      audioPlayer.find('.sr-playlist-item[data-post-id="' + playlistID + '"] .srp_audio_trigger').eq(0).trigger('click');
    }
  }
}

IRON.swiper.showHiddenSlide = function(audioPlayer){ //Do slideNext and slidePrev to make appearing the missing slide when we slideto the slider end and loop is enable.
  if(typeof audioPlayer.swiper.params != 'undefined' && audioPlayer.swiper.params.loop && typeof audioPlayer.swiper.params.centeredSlides != 'undefined' && audioPlayer.swiper.params.centeredSlides === true ){
    if(typeof IRON.players[0] != 'undefined'){
      audioPlayer.swiper.slideNext(0);
      audioPlayer.swiper.slidePrev(0);
    }
  }
}
IRON.searchField = {}; //Directory of custom functions for the search field
IRON.searchField.wait = false; //Prevent multiple search when user type fast
IRON.searchField.search = function(field, e){ //Search field listener. field = input field, e = event
  if (e.ctrlKey || e.altKey || e.metaKey ) {
    return;
  }

      let playerId = $(field).parents('.srp_search_container').data('player-id');

      if($(field).parents('.iron-audioplayer').length){
        if( $(field).parents('.elementor-widget-music-player').length && typeof $(field).parents('.elementor-widget-music-player').attr('id') != 'undefined'){ //if mp3 player has id from elementor 
          playerId = ( $(field).parents('.elementor-widget-music-player').attr('id') )
        }else if( ! $(field).parents('.iron_widget_radio').attr('id').startsWith('arbitrary-instance-') ){ //if mp3 player has id from shortcode parameter 
          playerId = $(field).parents('.iron_widget_radio').attr('id');
        }else{
          playerId = $(field).parents('.iron-audioplayer').attr('id');
        }
        $(field).parents('.srp_search_container').attr('data-player-id', playerId);
      }
      if (e.keyCode === 13) {
        if($(field).parents('.srp_search_container').data('url')){
          var url = $(field).parents('.srp_search_container').data('url') + "?srp_search=" + $(field).val();
          if( playerId != undefined){
            url = url+'&srp_player_id='+playerId;
          }
          $(location).prop('href', url)
        }
        $('.srp_search').blur();
				e.preventDefault();
			}
      let searchBox = '.srp_search_container:not([data-player-id]) .srp_reset_search';
      if( playerId != undefined){
        searchBox = '.srp_search_container[data-player-id="' + playerId + '"] .srp_reset_search';
      }
      $(searchBox).css('display', 'initial');
      if($(field).val() ==''){
        $(field).parents('.srp_search_container').find('.srp_reset_search').css('display', 'none');
      }
      const el = field;
      if( IRON.searchField.wait === false ){
        IRON.searchField.wait = true;
        setTimeout(function(){
          const playerNum = ( srp_convertPlayerIdToPlayerNum(playerId) !== null)? srp_convertPlayerIdToPlayerNum(playerId) : 0 ;
          if( playerNum == 0 && playerId != undefined && $('.srp_search_container:not([data-player-id]) .srp_search').length && ! $(el).parents('.iron-audioplayer').length ){
            document.querySelector('.srp_search_container:not([data-player-id]) .srp_search').value = '';
          }
          if(typeof IRON.players[playerNum] != 'undefined'){
            if( typeof IRON.players[playerNum].audioPlayer.params == 'undefined'){
              IRON.players[playerNum].audioPlayer.params = { playerId: playerId, search: $(el).val() };
            }else{
              IRON.players[playerNum].audioPlayer.params.playerId = playerId;
              IRON.players[playerNum].audioPlayer.params.search = $(el).val();  
            }
            srp_updateURLParameter( 'srp_page', 1 );
            IRON.players[playerNum].audioPlayer.params['page'] = 1;
            srp_updateList(playerNum);
          }
          IRON.searchField.wait = false;
        }, 700);
      }
}

if(IRON.audioPlayer.stickyEnable && sonaar_music.option.sticky_show_repeat_bt === 'true' || $('.iron-audioplayer .srp_repeat').length){//If a repeat button is visible use the cookie to set the repeat status
  IRON.repeatStatus = ($('.srp_noLoopTracklist').length)? 'null' : 'playlist'; //Set the default repeat status
  IRON.repeatStatus = ( getCookieValue("sonaar_mp3_player_repeat") )? getCookieValue("sonaar_mp3_player_repeat") : IRON.repeatStatus; //Get the repeat status from cookie if exist
}else{
  IRON.repeatStatus = false;
}

IRON.getTrackMemoryKeyFormat = function($mp3Url){ //Reformat the mp3 url to be used as a key in the track memory
  return $mp3Url.replace(/[^a-zA-Z0-9]|https|http|/g, '');
}