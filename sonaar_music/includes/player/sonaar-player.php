<div v-cloak id="sonaar-player" :class="[{enable: !minimize , 'show-list': showList, sr_hide: classes.emptyPlayer, 'srp_mobile': isSmallDevice,'srp_has_spectrum': classes.spectrum, srp_ext_opened: extendedPlayerOpened && isSmallDevice, 'audio-playing': isPlaying, 'srp_no_artwork': !hasArtwork, 'srp_sticky_has_ext': list.tracks.length >= 1 && outputTrackDescription }, classType, templateType, floatPos ]" style="display:none;" :data-ui-items="sr_countUIitems">
<audio id="sonaar-audio"></audio>
  <transition name="sonaar-player-slidefade" v-on:after-enter="playlistAfterEnter">
    <div class="playlist" v-if="showList">
      <div class="scroll">
        <div class="container">
          <div class="boxed">
            <div class="sricon-close close"  @click="setshowList" v-if="isSmallDevice"></div>
            <div class="title"  v-if="(playListTitle.length >= 1)">{{playListTitle}}</div>
            <button class="play" @click="play">{{ playLabelButton }}</button>
            <div class="trackscroll">
              <ul class="tracklist">
                <li v-for="(track, index) in list.tracks" :key="track.id" @click="clickTrackList(index)" :class="index == currentTrack ? 'active' : '' ">
                  <div class="srp_track_control">
                    <span class="sricon-play"></span>
                    <span class="track-status">{{ index + 1 }}</span>
                  </div>
                  <span class="track-title"><span class="content" @mouseover="scroll">{{ track.track_title }}</span></span>
                  <span class="track-artist"  v-if="classes.author"><span class="content" v-if="track.track_artist">{{ track.track_artist }}</span></span>
                  <span class="track-album"><span class="content">{{ track.album_title }}</span></span>
                  <span class="track-lenght" v-if="track.length"><span class="content">{{ track.length }}</span></span>
                  <span class="track-store" v-if="(track.song_store_list.length || (typeof track.album_store_list != 'undefined' && track.album_store_list.length) )">
                    <a v-for="(store, storeIndex) in track.song_store_list" :href="store['link-option'] == 'popup' ? '#!': store['store-link']" :target="store['store-target'] || store['link-option'] == 'popup' ? '_self': '_blank'" :download="ifDownloadAttribute(store)" @click="ctaClick(store, $(event.target))"><i class="track-store-item" :class="store['store-icon']"></i></a>
                    <a v-for="(store, storeIndex) in track.album_store_list"
                      :href="store['link-option'] == 'popup' || (store['has-variation'] == true && classes.wc_variation_lb) ? '#!': store['store-link']"
                      v-bind:class="[
                          store['make-offer-bt'] ? 'srp-make-offer-bt' : 
                          (classes.wc_ajax_add_to_cart && store['has-variation'] == false) ? 'add_to_cart_button ajax_add_to_cart' : ''
                      ]"
                      :target="store['store-target'] || store['link-option'] == 'popup' ? '_self': '_blank'"
                      :download="ifDownloadAttribute(store)"
                      :data-product_id="(store['product-id'] !== undefined) ? store['product-id'] : false"
                      @click="ctaClick(store, $(event.target))">
                      <i class="track-store-item" :class="store['store-icon']"></i>
                    </a>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

  </transition>

  <div aria-label="Close Playlist" class="sricon-close btn_playlist" v-if="showList" @click="setshowList"></div>
  <div :class="[(list.tracks.length >= 2)?'player':'player no-list', showControlsHover, isDraggable]">
    <div class="close btn-player"  :class="{
        'sricon-down-arrow': !minimize || minimize === undefined,
        'enable': !minimize,
        'storePanel': list.tracks.length >= 1 && albumStoreList.length >= 1
    }" @click="closePlayer" v-if="list.tracks.length >= 1 && !showList">
    <svg class="audioBar" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0px" y="0px" viewBox="0 0 17 17" enable-background="new 0 0 17 17" xml:space="preserve">
        <rect x="0" width="2" height="16" transform="translate(0)">
          <animate attributeName="height" attributeType="XML" dur="1s" values="2;16;2" repeatCount="indefinite" />
        </rect>
        <rect x="5" width="2" height="16" transform="translate(0)">
          <animate attributeName="height" attributeType="XML" dur="1s" values="2;16;2" repeatCount="indefinite" begin="0.3s" />
        </rect>
        <rect x="10" width="2" height="16" transform="translate(0)">
          <animate attributeName="height" attributeType="XML" dur="1s" values="2;16;2" repeatCount="indefinite" begin="0.5s" />
        </rect>
        <rect x="15" width="2" height="16" transform="translate(0)">
          <animate attributeName="height" attributeType="XML" dur="1s" values="2;16;2" repeatCount="indefinite" begin="0.3s" />
        </rect>
      </svg>
    </div>
    <div class="mobilePanel">
      <div class="mobileProgress" v-if="stickyProgressBar">
        <div class="skip" @touchmove="scrollingProgressBar"></div>
        <div class="mobileProgressing"></div>
        <div class="progressDot"></div>
      </div>
    </div>
    <div class="player-row" @click="clickPlayer">
      <div :class="(hasArtwork)?'playerNowPlaying ':'playerNowPlaying no-image '" v-if="list.tracks.length >= 1">
        <div class="album-art" :class="{'loading-enable': !classes.waveEnable, 'loading': loading < 100 }" v-if="hasArtwork">
          <i class="fas fa-circle-notch fa-spin fa-2x fa-fw loading-icon"></i>
          <img class="hover" :src="list.tracks[currentTrack].poster" />
          <img :src="list.tracks[currentTrack].poster" />
        </div>
        <div class="metadata">
          <div class="metadata-inner">
            <div class="track-name" @mouseover="scroll">{{list.tracks[currentTrack].track_title}}{{list.tracks[currentTrack].track_artist && typeof sonaar_music.option.show_artist_name != 'undefined' ? ' ' + sonaar_music.option.artist_separator + ' ' + list.tracks[currentTrack].track_artist:''}}</div>
            <div class="track-album" @mouseover="scroll" v-if="classes.show_album_title && list.tracks[currentTrack].album_title">{{list.tracks[currentTrack].album_title}}</div>
            <div class="track-artist" @mouseover="scroll" v-html="'by ' + list.tracks[currentTrack].album_artist" v-if="!classes.author && list.tracks[currentTrack].album_artist"></div>
          </div>
        </div>
      </div>
      <div class="playerNowPlaying" v-else></div>
      <control :player="this"></control>
      <waveform :player="this" v-if="! isSmallDevice"></waveform>



      <sonaar-extend-button :player="this" v-if="! isSmallDevice"></sonaar-extend-button>
      <store :player="this"></store>
      <div aria-label="Volume Control" class="volume control--item">
          <div class="sricon-volume" :title="sonaar_music.option.tooltip_volume_btn" :class="mute ? 'active' : '' " @mouseenter="sr_updateSlider" @click="sr_muteTrigger">
            <div class="slider-container">
              <div class="slide"></div>
          </div>
          </div>
        </div>
      </div>
  </div>
  <div class="srp_extendedPlayer_container" :class="[{srp_opened: extendedPlayerOpened}]"  v-if="isSmallDevice">  
    <div class="srp_extendedPlayer_scrolling_box">
      <div class="srp_extendedPlayer" :class="[{srp_opened_cta: extendedPlayerOverlayOpened}]" @click="extendedPlayerClickOutside">
        <div class="srp_ext_primary">
          <div class="srp_ext_header" v-if="list.tracks.length >= 1">
            <i class="sricon-down-arrow srp_collapse_btn" @click="closeExtendedPlayer"></i>
            <div class="srp_playlist_title" @click="closeExtendedPlayer">{{ list.tracks[currentTrack].album_title }}</div>
            <i class="sricon-3-dots-v srp_ellipsis_btn" @click="openExtendedPlayerOverlay" v-if="list.tracks[currentTrack].song_store_list.length || IRON.sonaar.player.albumStoreList.length"></i>
            <div v-if="!list.tracks[currentTrack].song_store_list.length && !IRON.sonaar.player.albumStoreList.length"></div>
          </div>
          <div class="srp_ext_artwork" v-if="list.tracks.length >= 1 && hasArtwork">
            <img :src="list.tracks[currentTrack].poster" />
          </div>  
          <div class="srp_ext_content">
            <div class="srp_ext_track" v-if="list.tracks.length >= 1">
              <div class="srp_ext_track_info">
                <div class="srp_track_title">{{list.tracks[currentTrack].track_title}}</div>
                <div class="srp_artist">{{list.tracks[currentTrack].track_artist }}</div>
              </div>
              <cta :player="this" :storeid="'srp-fav-bt'" :label=false></cta>
            </div>
            <waveform :player="this"></waveform>
            <div class="srp_ext_control" v-if="list.tracks.length >= 1">
              <div class="srp_control_left">
                <div aria-label="Shuffle Track" :title="sonaar_music.option.tooltip_shuffle_btn" class="shuffle control--item sricon-shuffle" :class="shuffle ? 'active' : '' " @click="sr_shuffleToggle" v-if="list.tracks.length > 1 && classes.show_shuffle_bt"></div>
              </div>
              <div class="control" :class="[{srp_ctrl_advanced: classes.show_skip_bt}]">
                <div aria-label="Rewind 15 seconds" :title="sonaar_music.option.tooltip_rwd_btn" class="sr_skipBackward sricon-15s" @click="sr_audioSkipTo(-1 * classes.skipBackward)" v-if="classes.show_skip_bt"></div>
                <div aria-label="Previous Track" :title="sonaar_music.option.tooltip_prev_btn" class="previous control--item sricon-back" @click="previous" v-if="list.tracks.length > 1 && classes.show_nextprevious_bt"></div>
                <div aria-label="Play / Pause" :title="sonaar_music.option.tooltip_play_btn" class="play control--item sricon-play" @click="play"></div>
                <div aria-label="Next Track" :title="sonaar_music.option.tooltip_next_btn" class="next control--item sricon-forward" @click="next" v-if="list.tracks.length > 1 && classes.show_nextprevious_bt"></div>
                <div aria-label="Forward 30 seconds" :title="sonaar_music.option.tooltip_fwrd_btn" class="sr_skipForward sricon-30s" @click="sr_audioSkipTo(classes.skipForward)" v-if="classes.show_skip_bt"></div>
              </div>
              <div class="srp_control_right">
                <div aria-label="Speed Rates" :title="sonaar_music.option.tooltip_speed_btn" class="sr_speedRate" :class="classes.speedRate != 1 ? 'active' : '' " @click="sr_setSpeedRate" v-if="classes.show_speed_bt"><div>{{classes.speedRate}}X</div></div>
                <div aria-label="Repeat" :title="sonaar_music.option.tooltip_repeat_btn" class="srp_repeat sricon-repeat control--item" @click="IRON.repeatButtonToggle" :data-repeat-status="repeatStatus" v-if="repeatButton && !classes.notrackskip"></div>
              </div>
            </div>
            <div class="srp_ext_featured_cta" v-if="list.tracks.length >= 1">
              <div class="srp_ext_featured_cta_left">
                <div aria-label="View Tracklist" :title="sonaar_music.option.tooltip_tracklist_btn" class="list control--item sricon-list" @click="setshowList" v-if="list.tracks.length > 1 && classes.show_tracklist_bt"></div>
              </div>
              <div class="srp_ext_featured_cta_center" @click="closeExtendedPlayer"></div>
              <div class="srp_ext_featured_cta_right">
                  <cta class="srp_ext_cta_share" :player="this" :storeid="'sr_store_force_share_bt'" :label=false></cta>
                  <cta class="srp_ext_cta_addtocart" :player="this" :storeid="'fas fa-cart-plus'" :label=true></cta>
                  <cta class="srp_ext_cta_buynow" :player="this" :storeid="'fas fa-shopping-cart'" :label=true></cta>
              </div>
            </div>
          </div>
        </div>
        <div class="srp_ext_secondary" v-if="list.tracks.length >= 1 && outputTrackDescription" @click="extendedScrolldown">
          <div v-html="outputTrackDescription" class="srp_ext_section"></div>
        </div>
        
      </div>
    </div>

    <div class="srp_ext_overlay_panel_outside" v-if="list.tracks.length >= 1 && extendedPlayerOverlayOpened" @click="closeExtendedPlayerOverlay"></div>
    <div class="srp_ext_overlay_panel" :class="[{srp_opened: extendedPlayerOverlayOpened}]" v-if="list.tracks.length >= 1">
      <div class="sricon-close close"  @click="closeExtendedPlayerOverlay"></div>
        <div class="srp_ext_cta">
          <div class="srp_ext_track_info_wrapper">
            <div class="srp_ext_artwork" v-if="list.tracks.length >= 1 && hasArtwork">
              <img :src="list.tracks[currentTrack].poster" />
            </div>
            <div class="srp_ext_track_info">
              <div class="srp_track_title">{{list.tracks[currentTrack].track_title}}</div>
              <div class="srp_artist">{{list.tracks[currentTrack].track_artist }}</div>
            </div>
          </div>
         
          <cta :player="this" :storeid="'fas fa-cart-plus'" :label=true></cta>
          <cta :player="this" :storeid="'fas fa-shopping-cart'" :label=true></cta>
          <cta :player="this" :storeid="'sr_store_force_dl_bt'" :label=true></cta>
          <cta :player="this" :storeid="'sr_store_force_share_bt'" :label=true></cta>
          <cta :player="this" :storeid="'srp-fav-bt'" :label=true></cta>
          <cta :player="this" :storeid="'sr_store_force_pl_bt'" :label=true></cta>
          <span v-for="(cta) in list.tracks[currentTrack].song_store_list">
            <a :href="cta['store-link']" target="_blank">
              <i :class="cta['store-icon']"></i>
              {{ cta['store-name'] }}
            </a>
          </span>
      </div>
    </div>
  </div>
</div>