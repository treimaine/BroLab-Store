<?php

/**
* Provide a admin area view for the plugin
*
* This file is used to markup the admin-facing aspects of the plugin.
*
* @link       sonaar.io
* @since      1.0.0
*
* @package    Sonaar_Music_Pro
* @subpackage Sonaar_Music_Pro/admin/partials
*/
?>
  <?php $validUrl = ( isset( $_GET['url']) && url_to_postid( $_GET['url'] ) )? url_to_postid( $_GET['url'] ): false;  ?>

    <div id="sonaar_pro" :class="{ready:ready}">
      <b-jumbotron class="text-center" bg-variant="dark" text-variant="white">
        <div class="logo"><img src="<?php echo plugin_dir_url( __FILE__ ) . '../img/sonaar-music-logo-white.png'?>"></div>
        <div class="headertxt">
          <h1>statistic reports</h1>
          <p class="text-right">pro version</p>
          <div>
            <p class="text-center tagline">Tracks and playlists performance insights</p>
          </div>
        </div>

      </b-jumbotron>


      <b-container>


      <div v-if="licenceValidated">
        <b-breadcrumb>
          <b-breadcrumb-item text="Sonaar Music Pro" href="<?php echo esc_url(get_admin_url( null, 'edit.php?post_type=' . SR_PLAYLIST_CPT . '&page=sonaar_music_pro' )) ?>"></b-breadcrumb-item>
          <?php if( $validUrl ) :?>
            <b-breadcrumb-item text="<?php echo esc_html(get_the_title( $validUrl ))?>" href="" active></b-breadcrumb-item>
            <?php endif ?>
        </b-breadcrumb>



        <b-card-group deck class="mb-3 stats-box">
          <b-card col bg-variant="secondary"
                text-variant="white">
            <h2 class="text-center">{{totalPlay}}</h2>
            <p class="text-center">Total Plays<br>
              <small>during selected period</small>
            </p>
          </b-card>
          <b-card col bg-variant="secondary"
                text-variant="white">
            <h2 class="text-center">{{totalDownload}}</h2>
            <p class="text-center">Total Downloads <br>
              <small>during selected period</small>
            </p>
            
          </b-card>
          <b-card col bg-variant="secondary"
                text-variant="white">
            <h2 class="text-center">{{totalTrack}}</h2>
            <p class="text-center">Total Tracks <br>
              <small>available on your website</small>
            </p>

          </b-card>
        </b-card-group>



        <b-card style="max-width: 100%;">
          <div slot="header">Numbers of Plays<?php echo ($validUrl)? ': '. esc_html(get_the_title($validUrl)): '' ?>    <input id="sonaar-daterange" type="text" name="daterange" /></div>
          <div class="chart-container">
            <canvas id="chart"></canvas>
          </div>
        </b-card>
        <b-card-group deck class="stats-table">


          <b-card col header="Top Played Tracks">
            <b-table striped hover :items="get_play_count_per_track" :fields="['track_title', 'play_count']">
              <template slot="track_title" slot-scope="data">

                <a v-if="data.item.target_url" target="_blank" :href="`${data.item.target_url}`">
                <span v-html="data.value"></span>
                </a>
                <span v-else v-html="data.value"></span>
              </template>
            </b-table>
          </b-card>


          <?php if( !$validUrl ) :?>
            <b-card col header="Top Page Performance">
              <b-table striped hover :items="play_count_by_page" :fields="['page_title', 'play_count']">
                <template slot="page_title" slot-scope="data">
                  <a v-if="data.item.id > 0" :href="`<?php echo esc_url(get_admin_url( null, 'edit.php?post_type=' . SR_PLAYLIST_CPT .'&page=sonaar_music_pro&url=' )) ?>${data.item.page_url}`">
                    <span v-html="data.value"></span>
                  </a>
                  <span v-else v-html="data.value"></span>
                </template>
              </b-table>
            </b-card>
            <?php endif ?>

            <b-card col header="Top Downloaded Tracks">
            <b-table striped hover :items="get_download_count_per_track" :fields="['track_title', 'download_count']">
              <template slot="track_title" slot-scope="data">

                <a v-if="data.item.target_url" target="_blank" :href="`${data.item.target_url}`">
                <span v-html="data.value"></span>
                </a>
                <span v-else v-html="data.value"></span>
              </template>
            </b-table>
          </b-card>


        </b-card-group>
        </div>
      </b-container>
    </div>