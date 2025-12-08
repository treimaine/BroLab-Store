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
          <h1>Activate<br>MP3 Audio Player</h1>
          <p class="text-right">PRO VERSION</p>          
        </div>

        <div>
          <div v-show="currentPlan !== false" class="srmp3_currrent_plan">⭐️ {{ currentPlan }} plan</div>
          <p class="lead" v-if="!licenceValidated">Enter your license key provided with your purchase.</p>
          <div id="validate_licence">
            <div class="form-group mx-sm-3">
            <transition name="button">
              <div class="message" v-if="message.display" v-html="message.data" :class="{'display': message.display, 'type': message.type }"></div>
            </transition>
              <input type="password" :disabled="licenceValidated" value="" class="form-control" id="licenceKey" v-model="licenceKey" placeholder="License key">
            </div>
              <transition name="button" mode="out-in">
                <button v-if="!licenceValidated" @click="validate_licence" class="btn btn-primary">Activate my license</button>
                <div v-if="licenceValidated">
                  <button @click="clearCache('option', $event)" class="btn">Remove my licence</button>
                  <button @click="validate_licence" class="btn">Revalidate my license</button>
                </div>
              </transition>
            
          </div>
        </div>

      </b-jumbotron>
    </div>