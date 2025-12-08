

var srp_isPausedFromPopup = false;

IRON.advancedTriggers = {

    listenersAttached: {},
    trackTimesRunned: {},
    playerScenarioMap: {},
    activeState: {
        playerID: null,
        scenarioID: null
    },
    downloadUrls: new Map(), // Store download URLs across calls

    applyScenario(scenario, player = null) {
        // Check if the scenario should be applied based on user authentication status and roles
        if (!this.shouldApplyScenario(scenario)) {
            //console.log(`Skipping scenario ${scenario.name} due to user authentication or role restrictions.`);
            return;
        }

        // Get the players affected by this specific scenario
        IRON.advancedTriggers.players = this.getPlayers(scenario, player);
        //console.log(`Affected Players for ${scenario.name}:`, IRON.advancedTriggers.players);
        // Attach scenario to the players but do not add play listener here
        IRON.advancedTriggers.players.forEach(player => {
            this.attachScenarioToPlayer(player, scenario);
        });
    },

    shouldApplyScenario(scenario) {
        // Check user authentication status and roles
        const isLoggedIn = this.isUserLoggedIn();
        const userRoles = this.getUserRoles();

        // If `loggedOut` is specified, ensure the user is logged out
        if (scenario.applyFor.loggedOut === true && isLoggedIn) {
        return false;
        }

        // If `loggedIn` is specified, ensure the user is logged in
        if (scenario.applyFor.loggedIn === true && !isLoggedIn) {
        return false;
        }

        // If `roles` is specified, check if the user has at least one of the roles in the array
        if (scenario.applyFor.roles && !scenario.applyFor.roles.some(role => userRoles.includes(role)) && isLoggedIn) {
        return false;
        }

        // Otherwise, apply the scenario
        return true;
    },

    isUserLoggedIn() {
        // This function should return true if the user is logged in, and false otherwise
        if (srp_vars.is_logged_in === 'yes') {
        return true;
        }
        return false;
    },

    getUserRoles() {
        // This function should return an array of user roles
        return srp_vars.user_role;
    },

    getPlayers(scenario, playerSelector = '.iron-audioplayer') {
        playerSelector = playerSelector ?? '.iron-audioplayer'; // If no playerSelector is NULL, default to all players
        let players = [];
        // If allPlayers is true, apply to all players
        if (scenario.applyOn.allPlayers) {
            players = Array.from(document.querySelectorAll(playerSelector));
            this.attachStickyPlayer(scenario, players);
        } else if (scenario.applyOn.players) {
            // Apply only to the players specified in `applyOn.players`
            scenario.applyOn.players.forEach(selector => {
                const container = document.querySelector(selector);
                if (container) {
                    const foundPlayers = Array.from(container.querySelectorAll(playerSelector));
                    players = players.concat(foundPlayers);
                }
            });
        }
        // If specificTracks is defined but allPlayers and players are not defined, get all players
        if (scenario.applyOn.specificTracks && !scenario.applyOn.allPlayers && !scenario.applyOn.players) {
            players = Array.from(document.querySelectorAll(playerSelector));
            this.attachStickyPlayer(scenario, players);
        }
        // Exclude players that are descendants of excluded selectors
        if (scenario.excludeOn && scenario.excludeOn.css_selector) {
            scenario.excludeOn.css_selector.forEach(selector => {
                const excludedContainers = document.querySelectorAll(selector);
                excludedContainers.forEach(container => {
                    const excludedPlayers = container.querySelectorAll(playerSelector);
                    players = players.filter(player => !Array.from(excludedPlayers).includes(player));
                    this.attachStickyPlayer(scenario, players);
                });
            });
        }
        return players;
    },
    
    attachStickyPlayer(scenario, players){
        //we attach the sticky player for case where sticky player is loaded from the page settings.
        const stickyPlayer = document.querySelector('#sonaar-player');
        
        if(!players.includes(stickyPlayer)){ //check if its already part of players and do it only once per scenario
            players.push(stickyPlayer); 
        }

    },
    isPlayerExcluded(player, scenario) {
        // Ensure `player` is a DOM element, not a jQuery object.
        const playerElement = player instanceof jQuery ? player[0] : player;
    
        if (scenario.excludeOn && scenario.excludeOn.css_selector) {
    
            const result = scenario.excludeOn.css_selector.some(selector => {
                const closestElement = playerElement.closest(selector);
                return closestElement !== null; // Check if we found a valid element.
            });
    
            return result;
        }
    
        return false;
    },
    attachScenarioToPlayer(player, scenario) {
        const playerID = player.id;
        const scenarioID = scenario.id;

        // Determine the correct audio element to attach listeners
        var audioElement = $(".iron-audioplayer").filter(function () {
            return $(this).data("sticky-player");
        }).length ? $('#sonaar-player audio')[0] : sr_setAudioElementInstance($(player));

        if (typeof elementorFrontend !== 'undefined' && elementorFrontend.isEditMode()) {
            var audioElement = sr_setAudioElementInstance($(player));
        }
        // Ensure the scenario mapping is initialized before using it
        if (!this.playerScenarioMap) {
            this.playerScenarioMap = {};
        }

        // Ensure the scenarioID exists in the mapping before accessing its properties
        if (!this.playerScenarioMap[scenarioID]) {
            this.playerScenarioMap[scenarioID] = {
                players: {}, // Use an object to store players and their listeners
                scenarioData: scenario // Optionally, store scenario data for reference
            };
        }


        if (scenario.action_when.downloadButtonClicked) {
            //Applying download button listener
            this.attachDownloadButtonListener(player, scenario);
            return;
        }


        if (scenario.trigger[0].type === 'trim') {
    
            // Only proceed if either audio_duration or start_time is available
            if (scenario.audio.audio_duration || scenario.audio.start_time) {
                
                let formattedDuration;
                if (scenario.audio.audio_duration) {
                    // Set the duration of the tracks in the player widgets
                    const customTimeDuration = moment.duration(scenario.audio.audio_duration, "seconds");
                    formattedDuration = moment(customTimeDuration.minutes() + ":" + customTimeDuration.seconds(), "m:s").format("mm:ss");
                } else if (scenario.audio.start_time) {
                    // If duration is missing or 0, but start time is available
                    formattedDuration = (currentText) => {
                        const timeParts = currentText.trim().split(':');
                        const currentMinutes = parseInt(timeParts[0], 10);
                        const currentSeconds = parseInt(timeParts[1], 10);
                        const totalSeconds = currentMinutes * 60 + currentSeconds - scenario.audio.start_time;
                        const adjustedTime = moment.duration(totalSeconds, "seconds");
                        return moment(adjustedTime.minutes() + ":" + adjustedTime.seconds(), "m:s").format("mm:ss");
                    };
                }
        
                const updateTrackDuration = (element) => {
                    const targetElement = $(element).find('.sr-playlist-cf--srmp3_cf_length');
                    let timeNodeFound = false;
        
                    // Iterate through the child nodes to check if a time value exists
                    targetElement.contents().each(function () {
                        if (this.nodeType === 3) {
                            const textValue = this.nodeValue.trim();
                            if (/\d{1,2}:\d{2}/.test(textValue)) {
                                if (formattedDuration instanceof Function) {
                                    this.nodeValue = ` ${formattedDuration(textValue)}`;
                                } else {
                                    this.nodeValue = ` ${formattedDuration}`;
                                }
                                timeNodeFound = true;
                            }
                        }
                    });
        
                    if (!timeNodeFound) {
                        // Ensure the time is added if no time node was found, e.g., for radio stream. WIP
                    }
                };
        
                if (Array.isArray(scenario.applyOn?.specificTracks)) {
                    // Iterate through all the tracks in the player
                    $(player).find('.sr-playlist-item').each((index, trackElement) => {
                        const trackID = $(trackElement).data('post-id'); // Assuming track ID is stored in a data attribute
        
                        // Update only if the track matches the specificTracks list
                        if (scenario.applyOn.specificTracks.includes(parseInt(trackID, 10))) {
                            $(trackElement).data('tracktime', typeof formattedDuration === 'string' ? formattedDuration : formattedDuration($(trackElement).text())); // for waveform in tracklist
                            updateTrackDuration(trackElement);
                        }
                    });
                } else {
                    // Update all tracks if no specificTracks are defined
                    $(player).find('.sr-playlist-item').data('tracktime', typeof formattedDuration === 'string' ? formattedDuration : formattedDuration($(player).text())); // for waveform in tracklist
                    updateTrackDuration(player);
                }
        
            }
        }
        
        
        
        

        // Check if the player is already attached to this scenario to prevent duplicates
        if (!this.playerScenarioMap[scenarioID].players[playerID]) {
            
            // Create a unique listener function for this player and scenario
            const onAudioPlay = () => {
                const playerListeners = this.playerScenarioMap[scenarioID].players[playerID];
                const { timeUpdateListener, playListener } = playerListeners;
                const specificTracks = scenario.applyOn?.specificTracks;

                let currentTrack = player.querySelector('.sr-playlist-item.current');
                    currentTrack = currentTrack ? currentTrack : null;
                let clickedTrackID = null;    
                    clickedTrackID = this.getCurrentTrackID_Helper(player);

                const sourcePostID = this.getCurrentSourcePostID_Helper(player);
                const sourcePostIDNumber = parseInt(sourcePostID, 10); // Convert sourcePostID to a number

                scenario.wait = false;
                //console.log(scenario.name, "clickedTrackID", clickedTrackID, "sourcePostID", sourcePostID, "sourcePostIDNumber", sourcePostIDNumber);

                // Initialize track times run for this scenario and player
                if (!this.trackTimesRunned[scenarioID]) {
                    this.trackTimesRunned[scenarioID] = {};
                }
                if (!this.trackTimesRunned[scenarioID][playerID]) {
                    this.trackTimesRunned[scenarioID][playerID] = {};
                }
                if (!this.trackTimesRunned[scenarioID][playerID][clickedTrackID]) {
                    this.trackTimesRunned[scenarioID][playerID][clickedTrackID] = 0;
                }

                if ((scenario.trigger[0].type !== 'watermark') && audioElement.currentTime === 0 && scenario.action_when.reached_value === '0' && scenario.trigger[0].stopPlayer) {
                    const playerNotPlayed = !this.trackTimesRunned[scenarioID][playerID].played;
                    const trackNotPlayed = !(this.trackTimesRunned[scenarioID][playerID][clickedTrackID] >= 1);
                    
                    const rememberPlayer = scenario.onceActionFilled.rememberAndDontShowAgainForThisPlayerUntilPageRefresh;
                    const rememberTrack = scenario.onceActionFilled.rememberAndDontShowAgainForThisTrackUntilPageRefresh;
                    
                    if (
                        (rememberPlayer && playerNotPlayed) || 
                        (rememberTrack && trackNotPlayed) || 
                        (!rememberPlayer && !rememberTrack)
                    ) {
                        // prevent a 0.1s glitch when starting the ads
                        if(!this.isWithinRangeLimitOfAdvancedRules(scenario)){
                            audioElement.muted = true; 
                            audioElement.currentTime = 0;
                        }
                       
                    }
                }

                scenario.lastPlayedTrackIDs = scenario.lastPlayedTrackIDs || {};

                scenario.lastPlayedTrackIDs[playerID] = scenario.lastPlayedTrackIDs?.[playerID] ? String(scenario.lastPlayedTrackIDs[playerID]) : null;
                if (scenario.lastPlayedTrackIDs?.[playerID] && scenario.lastPlayedTrackIDs[playerID] !== clickedTrackID) {
                    //console.log("Track changed! Resetting ad flag for all scenarios.");
                    this.detachTimeUpdateListener(audioElement, scenario);
                    this.clearWaterMarkInterval(audioElement);
                    
                }

                if (this.playerScenarioMap[scenarioID].players[playerID].player.id !== this.activeState.playerID) {
                    //console.log("PLAYER changed! Resetting ad flag for all scenarios.");
                    audioElement.muted = false;
                    this.clearWaterMarkInterval(audioElement);
                    this.detachTimeUpdateListener(audioElement, scenario);
                    audioElement.removeEventListener('play', playListener);
                    audioElement.removeEventListener('timeupdate', timeUpdateListener);
                    scenario.lastPlayedTrackIDs[playerID] = null;
                    return;
                }

                if(scenario.trigger[0].type !== 'watermark' ){
                    this.detachTimeUpdateListener(audioElement, scenario);
                }
                
                audioElement.removeEventListener('timeupdate', timeUpdateListener);

                if (scenario.lastPlayedTrackIDs?.[playerID] !== clickedTrackID) {
                    //This fire only once per current track even if I pause or unpause.
                    scenario.currentTrackAdPlayed = false;

                    if(scenario.trigger[0].type === 'trim'){
                        const shouldMarkActioned = !Array.isArray(specificTracks) || 
                                specificTracks.includes(sourcePostIDNumber);

                        if (shouldMarkActioned) {
                            this.markTrackAsActioned(scenario, playerID, `track_${clickedTrackID}`, scenario.trigger[0].type, true);
                
                            if (this.hasTrackBeenActioned(scenario, playerID, `track_${clickedTrackID}`, scenario.trigger[0].type, true)) {
                                //console.log("returned by hasTrackBeenActioned onAudioPlay");
                                return;
                            }
                        }

                        if (IRON.audioPlayer.stickyEnable) {
                            scenario.targetVolume = IRON.sonaar.player.volume;
                        }else{
                            scenario.targetVolume =  ($(player).attr('data-volume') == NaN) ? 1 : $(player).attr('data-volume');
                        }
                        audioElement.volume = scenario.targetVolume ; //reset the volume to the original volume
                        
                        scenario.fadeInDuration = 2; // Fade in duration in seconds
                        scenario.fadeOutDuration = 2; // Fade out duration in seconds
                        scenario.volumeIncrement = scenario.targetVolume / (scenario.fadeInDuration * 3); // Adjust volume every 100ms
                        
                        if(scenario.audio.fade_in === 'true'){
                            audioElement.volume = 0;
                        }

                        if(scenario.audio.start_time){
                            audioElement.muted = true;
                            audioElement.currentTime = scenario.audio.start_time;
                        }
                       
                    }
                    
                }

                // Ensure early return if track is not included in the scenario
                if (Array.isArray(specificTracks) && sourcePostIDNumber) {
                    if (!specificTracks.includes(sourcePostIDNumber)) {
                        audioElement.muted = false;

                        if (scenario.audio.start_time && scenario.lastPlayedTrackIDs?.[playerID] !== clickedTrackID) {
                            audioElement.currentTime = 0;
                        }

                        scenario.lastPlayedTrackIDs[playerID] = clickedTrackID;
                        return; // Early exit to maintain original logic
                    }
                }


                scenario.lastPlayedTrackIDs[playerID] = clickedTrackID;
               
                this.activeState.playerID = player.id;
                this.activeState.scenarioID = scenarioID;
                this.activeState.currentTrackID = clickedTrackID;

                this.attachDownloadButtonListener(player, scenario); // looks it attach for the sticky.

                audioElement.addEventListener('timeupdate', timeUpdateListener);
                

            };
            // Define a flag outside of the listener or in the relevant scope
            const onTimeUpdate = () => {

                // Check if scenario requires a time to be tracked
                if (!scenario.action_when.reached_value && scenario.action_when.reached_value !== 0) {
                   //console.log(`Scenario ${scenarioID} does not require timeupdate listener.`);
                   return;
                }
                
                // Missing code integrated here
                const playerID      = player.id;
                const scenarioID    = scenario.id;
                const trackID       = this.activeState.currentTrackID;
                //let handleCalled    = false;

                if(scenario.trigger[0].type === 'trim'){
                    this.trimmedWaveClick(audioElement, scenario);
                }

                if (!trackID) {
                    //console.log("No track ID found for the clicked track. = ", trackID);
                    return;
                }

                const shouldMeetAt = this.getWhenItShouldMeet(audioElement, scenario.action_when.reached_value, scenario.action_when.reached_unit || 'percent');
                const currentTime = Math.round((audioElement.currentTime));
                
                let timeConditionMet = scenario.trigger[0].required
                    ? currentTime >= shouldMeetAt
                    : currentTime == Math.floor(shouldMeetAt);

                /*console.log(
                    "currentTime =", currentTime,
                    "shouldMeetAt =", shouldMeetAt
                );*/

                if (audioElement.paused) { // mostly for continuous player when its paused on page load.
                    return;
                }

                if (timeConditionMet) {
                        
                    if(audioElement.currentTime === 0){
                        return;
                    }

                    if (scenario.currentTrackAdPlayed) {
                            // We dont want to play trigger again when we seek back to the trigger time...

                            if (scenario.trigger[0].type === 'watermark') {
                                return;
                            }
                        
                            if (scenario.trigger[0].type === 'playAd') {
                                return;
                            }

                            if (!scenario.trigger[0].required && scenario.hasTriggered) {
                                return; // Exits if 'required' is false
                            }
                    }
                    
                    if(this.trackTimesRunned[scenarioID][playerID].played && scenario.onceActionFilled.rememberAndDontShowAgainForThisPlayerUntilPageRefresh){
                        //console.log('Returned by rememberAndDontShowAgainForThisPlayerUntilPageRefresh ');
                        return;
                    }
                    
                    if(this.trackTimesRunned[scenarioID][playerID][trackID] >= 1 && scenario.onceActionFilled.rememberAndDontShowAgainForThisTrackUntilPageRefresh){
                        //console.log('Returned by rememberAndDontShowAgainForThisTrackUntilPageRefresh');
                        return;
                    }
                    scenario.hasTriggered = true;
                    this.trackTimesRunned[scenarioID][playerID].played = true;
                    this.trackTimesRunned[scenarioID][playerID][trackID]++;
                    scenario.currentTrackAdPlayed = true; // Mark the ad as played for this track

                    trackElement = player.querySelector('.sr-playlist-item.current');
                    this.handleActions(scenario, player, trackElement);
                    
                }else{
                    scenario.hasTriggered = false;
                }
            };

            // Store the player and its listener in the scenario mapping
            this.playerScenarioMap[scenarioID].players[playerID] = {
                player: player,
                scenarioData: scenario,
                playListener: onAudioPlay,
                timeUpdateListener: onTimeUpdate
            };

            if(sonaar_music.option.enable_continuous_player === "true"){
                $("#sonaar-audio").on("loadeddata.continuous", function () {
                    if(playerID !== 'sonaar-player'){
                        $('#sonaar-audio').off('loadeddata.continuous');
                        return;
                    }
                    if(IRON.sonaar.player?.selectedPlayer){
                        $('#sonaar-audio').off('loadeddata.continuous');
                        return;
                    }

                    if (!IRON.advancedTriggers.playerScenarioMap[scenarioID].players[playerID].scenarioData.action_when.downloadButtonClicked) {
                        const playerListeners = IRON.advancedTriggers.playerScenarioMap[scenarioID].players[playerID];
                        if (playerListeners) {
                            IRON.advancedTriggers.activeState.scenarioID = scenarioID;
                            IRON.advancedTriggers.activeState.playerID = playerID;
        
                            const { timeUpdateListener, playListener } = playerListeners;
        
                            if (playListener) {
                                // recheck the audioElement. perhaps sticky was not loaded yet.
                                audioElement = sr_setAudioElementInstance($(player));
                                audioElement.removeEventListener('play', playListener);
                                audioElement.addEventListener('play', playListener);
                                if(scenario.trigger[0].type === 'trim'){
                                    onAudioPlay(); //when the sticky load in the page we want to trim it right now, not onPlay
                                }
                            }
                        }
                    }

                });
            }

        }

        // Add a click listener to manage the scenario and active player ID
        const clickListener = (el) => {

            if(IRON.sonaar.player?.selectedPlayer){ // sticky player has been launched by a player widget. so its not a standalone sticky player loaded from page/plugin settings
                $('#sonaar-player').off('click', clickListener);
                if(player.id === 'sonaar-player'){
                    return;
                }
            }

            if (!this.playerScenarioMap[scenarioID].players[playerID].scenarioData.action_when.downloadButtonClicked) {

                const playerListeners = this.playerScenarioMap[scenarioID].players[playerID];

                if (playerListeners) {
                    this.activeState.scenarioID = scenarioID;
                    this.activeState.playerID = playerID;

                    const { timeUpdateListener, playListener } = playerListeners;

                    if (playListener) {
                        // recheck the audioElement. perhaps sticky was not loaded yet.
                        audioElement = sr_setAudioElementInstance($(player));
                        audioElement.removeEventListener('play', playListener);
                        audioElement.addEventListener('play', playListener);
                    }
                }
            }
        };

        // Attach the click listener to the player
        player.addEventListener('click', clickListener);
        this.listenersAttached[playerID] = true;
    },

    trimmedWaveClick(audioElement, scenario) {
        $(".sr_selectedPlayer .sonaar_fake_wave, #sonaar-player .sonaar_fake_wave, .mobileProgress").off("click.trimmed");
        $(".sr_selectedPlayer .sonaar_fake_wave, #sonaar-player .sonaar_fake_wave, .mobileProgress").on("click.trimmed", function (event) {
            // Retrieve start time and audio duration from the scenario
            const startTime = scenario.audio.start_time || 0;
            const audioDuration = scenario.audio.audio_duration || (audioElement.duration - startTime);
           
            // Calculate the clicked position's ratio within the wave
            const clickPosition = event.offsetX / $(this).width();
            audioElement.volume = scenario.targetVolume; // make sure we have a volume because fadein/fadeout will reduce it.

            function waitUntilNewTrackIsLoaded() {
                if (!isNaN(audioElement.duration)) {
                    const effectiveDuration = (audioDuration === 'Infinity')
                    ? audioElement.buffered.end(audioElement.buffered.length - 1)
                    : audioDuration;

                    // Calculate the correct seek time within the trimmed segment
                    const seekTime = startTime + (clickPosition * effectiveDuration);

                    // Set the audio element's current time, ensuring it stays within the segment bounds
                    audioElement.currentTime = Math.min(seekTime, startTime + effectiveDuration);

                    event.preventDefault();
                    clearInterval(intervalId);
                }
            }

            const intervalId = setInterval(waitUntilNewTrackIsLoaded, 50);
            setTimeout(() => clearInterval(intervalId), 3000);
        });



        audioDuration = scenario.audio.audio_duration || audioElement.duration;

        if(scenario.audio.start_time){
            audioElement.muted = false;

            if(!scenario.audio.audio_duration){
                audioDuration = audioDuration - scenario.audio.start_time;
            }

            if((audioElement.currentTime < scenario.audio.start_time) && (audioElement.duration > scenario.audio.start_time)){
                audioElement.currentTime = scenario.audio.start_time;
            }
        }

        
        if(audioDuration){
            let timeToStop = audioDuration;

            if(scenario.audio.start_time){
                timeToStop = scenario.audio.start_time + audioDuration;
            }
    
            const currentPreviewTime = Math.max(0, audioElement.currentTime - scenario.audio.start_time);
            const duration = audioDuration; // Ensure correct duration (not timeToStop)
        
            // Ensure barLength accurately reflects progress within the specified segment
            let barLength = (currentPreviewTime / duration) * 100;
            barLength = Math.min(barLength, 100); // Cap the value at 100%
        
            // Update the preview progress bar
            $("#sonaar-player .sonaar_wave_cut, .sr_selectedPlayer .album-player .sonaar_wave_cut, .sr_selectedPlayer .current .sonaar_wave_cut").width(barLength + "%");
            $("#sonaar-player .progressDot").css("left", barLength + "%");
        
            let timeProgress = moment.duration(currentPreviewTime, "seconds");
            timeProgress = moment(timeProgress.minutes() + ":" + timeProgress.seconds(), "m:s").format("mm:ss");
            $(".sr_selectedPlayer .currentTime").html(timeProgress);
            IRON.sonaar.player.currentTime = timeProgress;

            const timeLeft = moment.duration(duration - currentPreviewTime, "seconds");
            timeleft = "-" + moment(timeLeft.minutes() + ":" + timeLeft.seconds(), "m:s").format("mm:ss");
            $(".sr_selectedPlayer .totalTime").html(timeleft);
            IRON.sonaar.player.totalTime = timeleft;

            // Fade In effect
            if(scenario.audio.fade_in === 'true'){
                if (currentPreviewTime <= scenario.fadeInDuration) {
                    audioElement.volume = Math.min(scenario.targetVolume, audioElement.volume + scenario.volumeIncrement);
                }
            }
            // Fade Out effect
            if(scenario.audio.fade_out === 'true'){
                const fadeOutStart = timeToStop - scenario.fadeOutDuration;
                if (audioElement.currentTime >= fadeOutStart && audioElement.currentTime < timeToStop) {
                    audioElement.volume = Math.max(0, audioElement.volume - scenario.volumeIncrement);
                }
            }

            if(audioElement.currentTime >= timeToStop){
                if(scenario.wait){
                    return;
                }
                if (isFinite(audioElement.duration)) {
                    audioElement.currentTime = Math.floor(audioElement.duration); // Seek to the end of the track. sometimes we may have actions at 100%
                } else {
                    IRON.audioPlayer.next($('.sr_selectedPlayer'), audioElement, $('.sr_selectedPlayer').find('.playlist .srp_list'));
                }
                scenario.wait = true;
            }
        }


    },


    getCurrentTrackID_Helper(currentPlayer, buttonEl = null) {
        let currentTrackElement = null;
    
        if (buttonEl) {
            // Ensure you safely get the first element if needed
            currentTrackElement = buttonEl.closest('.sr-playlist-item')[0] || 
                                  buttonEl.closest('.swiper-slide')[0];

        } else {
            if(currentPlayer.classList.contains('srp_slider_enable')){
                currentTrackElement = currentPlayer.querySelector('.swiper-slide.srp_current');
            }else{
                currentTrackElement = currentPlayer.querySelector('.sr-playlist-item.current');
            }

        }
        let currentTrackID = null;
        if (currentTrackElement) {
            const postId = currentTrackElement.dataset.postId;
            const trackId = currentTrackElement.dataset.trackid;
            const trackPos = currentTrackElement.dataset.trackPos || 
                             currentTrackElement.dataset.slideIndex;
    
            if (trackId) {
                currentTrackID = trackId;
            } else if (postId) {
                currentTrackID = postId;
            } else {
                currentTrackID = trackPos;
            }
        } else {
            const currentTrack = IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack];
            if(!currentTrack){
                return;
            }
            const postId = currentTrack.sourcePostID;
            const trackId = currentTrack.id;
            const trackPos = currentTrack.trackPos;
    
            if (trackId) {
                currentTrackID = trackId;
            } else if (postId) {
                currentTrackID = postId;
            } else {
                currentTrackID = trackPos;
            }
        }
        //convert to string
        currentTrackID = String(currentTrackID);
        return currentTrackID;
    },

    getCurrentSourcePostID_Helper(currentPlayer){
        let currentTrackElement = currentPlayer.querySelector('.sr-playlist-item.current');
        currentTrackElement = currentTrackElement ? currentTrackElement : null;
        if (currentTrackElement) {
            currentTrackID = currentTrackElement.getAttribute('data-post-id');
        } else if (IRON && IRON.sonaar && IRON.sonaar.player && IRON.sonaar.player.list) {
            currentTrackID = IRON.sonaar.player.list.tracks[IRON.sonaar.player.currentTrack]?.sourcePostID || null;
        }
        return currentTrackID;
    },
    
    isTrackIsSpecific_Helper(scenario, buttonEl) {
        const specificTracks = scenario.applyOn?.specificTracks;
        if (!Array.isArray(specificTracks)) return false;
    
        let trackID = $(buttonEl).closest('li').data('post-id') 
                     ?? IRON.sonaar?.player?.list?.tracks[IRON.sonaar.player.currentTrack]?.sourcePostID;
    
        if (!trackID) return false;
    
        const isTrackSpecific = specificTracks.includes(parseInt(trackID, 10));
    
        return isTrackSpecific;
    },

    attachDownloadButtonListener(player, scenario, resetAll = false) {
       
        let downloadScenario = null;
       
        for (const scenarioID in this.playerScenarioMap) {
            if (this.playerScenarioMap?.[scenarioID]?.scenarioData?.action_when?.downloadButtonClicked) {
                downloadScenario = scenarioID;
                //scenario = this.playerScenarioMap[downloadScenario].scenarioData;
            }
        }
        if (!downloadScenario) return; // No scenario handle the downloads so exit the function


        const playerID = scenario.applyOn.allPlayers || !scenario.applyOn.players
            ? 'allPlayers'
            : scenario.applyOn.players;

        const targetPlayers = scenario.applyOn.players
            ? scenario.applyOn.players.map(id => `${id} .sr_store_force_dl_bt`)
            : [`#${player.id} .sr_store_force_dl_bt`];
            
        let playerSelector = targetPlayers.join(', ');

        let skip = false;

        if(scenario.onceActionFilled.rememberAndDontShowAgainIfAlreadySubmitted){
            skip = this.hasTrackBeenActioned_anywhereOnScenario();
        }

        if(resetAll && skip){ //resetAll comes from when we reload attachDownloadButtonListener from the askforemail function 
            playerSelector = '.iron-audioplayer .sr_store_force_dl_bt';
        }
       
       // Use a Map to store download URLs in memory
        $(playerSelector).each((_, downloadButton) => {
            const buttonKey = downloadButton; // Use the element as the key

            // Store the original href in the Map if not already stored
            if (!this.downloadUrls.has(buttonKey)) {
                this.downloadUrls.set(buttonKey, downloadButton.getAttribute('href'));
            }

            // Ensure the button belongs to the player or #sonaar-player
            if (!resetAll && !player.contains(downloadButton) &&
                !document.querySelector('#sonaar-player')?.contains(downloadButton)) {
                return;
            }

            const clickedTrackID = this.getCurrentTrackID_Helper(player, $(downloadButton));
            const isTrackSpecific = this.isTrackIsSpecific_Helper(scenario, $(downloadButton));


            if (
                (isTrackSpecific || !scenario.applyOn.specificTracks) &&
                !this.hasTrackBeenActioned(scenario, playerID, `track_${clickedTrackID}`, 'popup')
            ) {
                if (!this.hasTrackBeenActioned(scenario, playerID, `track_${clickedTrackID}`, 'popup', true)) {
                    //console.log("1");
                    if (skip) {
                        //console.log("2");
                        downloadButton.setAttribute('href', this.downloadUrls.get(buttonKey)); // Set the href from the stored value in memory (Map)
                    } else {
                        //console.log("3");
                        downloadButton.removeAttribute('href');
                    }
                }
            }else{
                //console.log("4");
                downloadButton.setAttribute('href', this.downloadUrls.get(buttonKey));
               
            }

        });

        // Common click event handler function
        const handleClick = (event) => {
            const downloadButton = event.currentTarget;
            const buttonKey = downloadButton; // Use the element as the key
            const clickedTrackID = this.getCurrentTrackID_Helper(player, $(downloadButton));
            const isFromStickyPlayer = downloadButton.closest('#sonaar-player');
            const playerToCheck = (IRON.audioPlayer?.activePlayer) ? IRON.audioPlayer.activePlayer : player;


            // Store the original href in the Map if not already stored
            if (!this.downloadUrls.has(buttonKey)) {
                this.downloadUrls.set(buttonKey, downloadButton.getAttribute('href'));
            }

            if(this.isPlayerExcluded(playerToCheck, scenario)){
                return;
            }

            if (playerID !== 'allPlayers') { // A css selector is used to target specific players
                if (IRON.sonaar.player.selectedPlayer && isFromStickyPlayer) { 
                    if (!$(playerID[0]).find(IRON.sonaar.player.selectedPlayer).length) {  // Check if the sticky player is part of the playerID
                        //console.log("sticky player is not part of the playerID");
                        return;  //it means the sticky player is not part of the playerID
                    }
                }
            }

            this.markTrackAsActioned(scenario, playerID, `track_${clickedTrackID}`, 'popup', true);

            const isTrackSpecific = this.isTrackIsSpecific_Helper(scenario, $(downloadButton));

            if(scenario.onceActionFilled.rememberAndDontShowAgainIfAlreadySubmitted){
                skip = this.hasTrackBeenActioned_anywhereOnScenario();
            

            }
            
            if (
                (isTrackSpecific || !scenario.applyOn.specificTracks) &&
                !this.hasTrackBeenActioned(scenario, playerID, `track_${clickedTrackID}`, 'popup')
            ) {
                if (!this.hasTrackBeenActioned(scenario, playerID, `track_${clickedTrackID}`, 'popup', true)) {
                    if (skip) {
                        //console.log("a");
                        //if (isFromStickyPlayer) return;
                
                        // Set the href from the stored value in memory (Map)
                        downloadButton.setAttribute('href', this.downloadUrls.get(buttonKey));
                    } else {
                        //console.log("b");
                        event.preventDefault();
                        this.handleActions(scenario, player, downloadButton);
                    }
                }else{
                    //console.log("c");
                    downloadButton.setAttribute('href', this.downloadUrls.get(buttonKey));
                }
            } else if (!skip && !downloadButton.closest('#sonaar-player')) {
                // If the scenario was already triggered, set the href.
                //console.log("d");
                downloadButton.setAttribute('href', this.downloadUrls.get(buttonKey));
            }else{
                //console.log("e");
                downloadButton.setAttribute('href', this.downloadUrls.get(buttonKey));
            }
        };
        
        if(!scenario.action_when.downloadButtonClicked) return;
        
        // Attach event listeners
        $(document).off('click', playerSelector).on('click', playerSelector, handleClick);

        if(playerSelector == "#sonaar-player .sr_store_force_dl_bt"){  // if player is sticky player, we dont want to attach it again
            return;
        }

        $(document).off('click', '#sonaar-player').on('click', '#sonaar-player .sr_store_force_dl_bt', handleClick);
    },

    clearWaterMarkInterval(audioElement){
        const watermarkAudio = document.getElementById('watermark-audio-element');

        if (watermarkAudio) {
            watermarkAudio.pause();
            watermarkAudio.currentTime = 0;
        }
        audioElement.removeEventListener('play', this.watermark_startPlayback);
        audioElement.removeEventListener('ended', this.watermark_stopPlayback);
        
        if (window.WaterMarkInterval){
            clearInterval(window.WaterMarkInterval);
            window.WaterMarkInterval = null;
        }
    },

    detachTimeUpdateListener(audioElement, scenario = null) {
        $(".sr_selectedPlayer .sonaar_fake_wave, #sonaar-player .sonaar_fake_wave, .mobileProgress").off("click.trimmed");
        // we detach the ad if it exists so it stops when we switch tracks.
        const adAudio = document.getElementById('ad-audio-element');
        if (adAudio) {
            adAudio.pause();
            adAudio.currentTime = 0;
            adAudio.removeEventListener('canplay', this.playad_startPlayback);
            adAudio.removeEventListener('ended', this.playad_adHasEnded)
            adAudio.removeAttribute('src'); // Remove the source to stop loading
        }

        if (scenario && scenario.trigger[0].type === 'watermark') {
            
            const watermarkAudio = document.getElementById('watermark-audio-element');
            if (watermarkAudio) {
                watermarkAudio.pause();
                watermarkAudio.currentTime = 0;
            }
        }

        if (window.WaterMarkInterval && scenario && scenario.trigger[0].type === 'watermark') {
            audioElement.removeEventListener('play', this.watermark_startPlayback);
            audioElement.removeEventListener('ended', this.watermark_stopPlayback);
            clearInterval(window.WaterMarkInterval);
            window.WaterMarkInterval = null;
        }
        this.hideGlobalMessageOverlay();

        // Set back the controls to original states if they were locked by the ads
        this.togglePointerEvents([...$('.iron-audioplayer').get(), document.querySelector('#sonaar-player .player')], false);

    },

    // Function to hide the message overlay globally
    hideGlobalMessageOverlay() {
        //remove ALL .srp-ads-message-overlay
        $('.srp-ads-message-overlay').remove();
    },


    detachTimeUpdateOnNoScenario(player) {
        //console.log("detachTimeUpdateOnNoScenario");
        const audioElement = sr_setAudioElementInstance($(player));
        this.activeState.playerID = null;
        this.activeState.scenarioID = null;
        audioElement.removeEventListener('pause', this.pauseAdPlayback);
        this.detachTimeUpdateListener(audioElement);
    },

    getWhenItShouldMeet(audioElement, scenarioValue, unit = 'percent') {
        const duration = isFinite(audioElement.duration) ? audioElement.duration : 0;

        if (duration > 0) {
            switch (unit) {
                case 'percent':
                    // Convert the percentage to required time in seconds
                    return (scenarioValue / 100) * duration;
                case 'seconds':
                    // Directly use the scenario value as seconds
                    return scenarioValue;
                default:
                    return 0;
            }
        }
        return 0;
    },
    handleActions(scenario, player, clickedElement = null) {
        //console.log("HANDLE ===================================> ", scenario.trigger[0].type);

        let trackID = null;
        if ($(clickedElement).hasClass('sr-playlist-item')) {
            trackID = this.getCurrentTrackID_Helper(player);
        }else{
            trackID = this.getCurrentTrackID_Helper(player, $(clickedElement));
        }
       
        const playerID = scenario.applyOn.allPlayers || !scenario.applyOn.players ? 'allPlayers' : scenario.applyOn.players;
        
        selectedPlayer = (IRON.audioPlayer?.activePlayer) ? IRON.audioPlayer.activePlayer : $(player);
        const audioElement = sr_setAudioElementInstance(selectedPlayer);
        audioElement.muted = false;

      


        scenario.trigger.forEach(action => {

            if(scenario.onceActionFilled.rememberAndDontShowAgainIfAlreadySubmitted){
                skip = this.hasTrackBeenActioned_anywhereOnScenario();
                if(skip){
                    return;
                }
            }

            if (trackID && this.hasTrackBeenActioned(scenario, playerID, `track_${trackID}`, action.type)) {
                return;
            }

            if (scenario.trigger[0].type !== 'trim' 
                && !scenario.action_when.downloadButtonClicked 
                && this.trackTimesRunned[scenario.id][player.id][trackID] <= 1) {
                // If track is played for the first time, count it!
                this.markTrackAsActioned(scenario, playerID, `track_${trackID}`, scenario.trigger[0].type, true);
            }
           
            if(this.hasTrackBeenActioned(scenario, playerID, `track_${trackID}`, action.type, true)){
                //console.log("returned by hasTrackBeenActioned");
                return;
            }

            /*let chanceToTrigger = '70'; // Can be '25', '50', '75', '33.3', etc.
            let percentage = parseFloat(chanceToTrigger) / 100;
            
            const timesRunned = this.getScenarioTimesRunned(scenario);
            
            // Calculate if this run should trigger based on random chance
            let uniqueNum = Math.random();
            console.log(uniqueNum, percentage);
            const shouldTrigger = uniqueNum < percentage;
            
            if (!shouldTrigger) {
                console.log("Returned by shouldTrigger", timesRunned);
                return;
            }
            
            // Continue with your logic if shouldTrigger is true
            console.log("Triggered at", timesRunned);*/
            
            switch (action.type) {
                case 'trim' :
                    break;
                case 'popup':
                    this.showPopupForm(player, clickedElement, scenario, playerID, trackID);
                    break;
                case 'redirect':
                    if(scenario.trigger[0].stopPlayer){
                        $(player).find('.sr-playlist-item.current .srp_audio_trigger').trigger('click');
                    }
                
                    if (scenario.trigger[0].target === '_blank') {
                        window.open(action.url, '_blank');
                    } else {
                        window.location.href = action.url;
                    }
                    break;
                case 'triggerFunction': //not used
                    break;
                case 'playAd':
                    this.playAd(scenario, action.url, player);
                    break;
                case 'watermark':
                    this.watermark(scenario, player, playerID);
                    break;
                case 'scrollToId':
                    const element = document.querySelector(action.cssId);
                    if (element) {
                        if(scenario.trigger[0].stopPlayer){
                            $(player).find('.sr-playlist-item.current .srp_audio_trigger').trigger('click');
                        }
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    }
                    break;
                default:
            }

            if(scenario.onceActionFilled.rememberAndDontShowAgainUntilLocalStorageCleared){
                this.markTrackAsActioned(scenario, playerID, `track_${trackID}`, action.type);
            }
        });
    },

    setAdVolume(audioElement){
        return audioElement.volume * 0.50; //reduce volume by 50%
    },

    playAd(scenario, url, player = null) {
        const audioElement = sr_setAudioElementInstance($(player));
        var adAudio = document.getElementById('ad-audio-element');

        
        let initialVolume = audioElement.volume;
        const fadeDuration = 300;
        const fadeInterval = 50; 
        let fadeStep = audioElement.volume / (fadeDuration / fadeInterval);
    
        // Function to fade out and pause the audio
        const fadeOutAndPause = () => {
            return new Promise((resolve) => {
                let fadeIntervalId = setInterval(() => {
                    if (audioElement.volume > 0) {
                        audioElement.volume = Math.max(0, audioElement.volume - fadeStep);
                    } else {
                        clearInterval(fadeIntervalId);
                        
                        resolve(); // Notify that the fade-out and pause are done
                    }
                }, fadeInterval);
            });
        };

        this.playad_adHasEnded = () => {
            if (scenario.trigger[0].lockControl) {
                this.togglePointerEvents([player, document.querySelector('#sonaar-player .player')], false);
            }
            this.hideGlobalMessageOverlay();
    
            if (scenario.trigger[0].stopPlayer) {

                if(scenario.action_when.reached_value == '100'){
                    // prevent hearing 0.1 seconds of the end of the track
                    audioElement.currentTime = audioElement.duration;
                }

                audioElement.muted = false;
                audioElement.play();
            }
        };

        this.playad_startPlayback = async () => {
            
            try {
                await adAudio.play();
                adAudio.volume = audioElement.volume;
                if (scenario.trigger[0].lockControl === 'true') {
                    this.togglePointerEvents([player, document.querySelector('#sonaar-player .player')], true);
                }
    
                if (scenario.trigger[0].message) {
                    this.displayMessageOverlay(scenario.trigger[0].message, player);
                }
            } catch (error) {
                console.error("Failed to play ad audio:", error);
            }
        };

        const initializeAdAudio = async () => {
            if (scenario.trigger[0].stopPlayer) {
                const value = scenario.action_when.reached_value;
                if (value !== '0' && value !== '100') {
                    await fadeOutAndPause();
                }

                audioElement.pause();
                audioElement.volume = initialVolume; // Reset volume
            }

           

            if (!adAudio) {
                adAudio = document.createElement('audio');
                adAudio.id = 'ad-audio-element';
                adAudio.volume = audioElement.volume;
                document.body.appendChild(adAudio);
            }
    
            adAudio.src = url;
            adAudio.preload = 'auto';
            
            adAudio.addEventListener('ended', this.playad_adHasEnded);
            adAudio.addEventListener('canplay', this.playad_startPlayback);
            audioElement.addEventListener('pause', this.pauseAdPlayback);
        };

        // Initialize and play ad audio
        initializeAdAudio();
    
      
    },

    displayMessageOverlay(message, player) {
        let overlay = document.createElement('div');
        overlay.classList.add('srp-ads-message-overlay');
        overlay.textContent = message;
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0, 0, 0, 0.7)';
        overlay.style.color = '#fff';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '3';

        player.appendChild(overlay);
    },
    watermark(scenario, player = null) {
        const audioElement = sr_setAudioElementInstance($(player));
        let watermarkAudio = document.getElementById('watermark-audio-element');

        // Create or get the ad audio element
        if (!watermarkAudio) {
            watermarkAudio = document.createElement('audio');
            watermarkAudio.id = 'watermark-audio-element';
            document.body.appendChild(watermarkAudio);
            watermarkAudio.volume = this.setAdVolume(audioElement);
        }

        // Set up the ad audio properties
        const loopGap = scenario.trigger[0].loopGap * 1000;
        

        watermarkAudio.src = scenario.trigger[0].url;
        watermarkAudio.volume = this.setAdVolume(audioElement);
        watermarkAudio.autoplay = true;
        watermarkAudio.loop = false; // Disable native looping

        // Clear any existing interval before setting a new one
        if (window.WaterMarkInterval) {
            clearInterval(window.WaterMarkInterval);
            window.WaterMarkInterval = null;
        }

        // Function to play ad audio every 10 seconds
        this.watermark_startPlayback = () => {
            if (window.WaterMarkInterval) {
                //console.log("i will return the starAdPlayback function");
                return;
            }
            // Start a new interval for the watermark audio
            window.WaterMarkInterval = setInterval(() => {
                
                if (!this.activeState.scenarioID) return;

                watermarkAudio.currentTime = 0;
                
                //console.log('Interval called. play!');

                watermarkAudio.volume = this.setAdVolume(audioElement);
                watermarkAudio.play().catch(error => console.error("Failed to play ad audio in interval:", error));
              
                
            }, loopGap);
        };

        this.watermark_stopPlayback = () => {
            watermarkAudio.pause();
            watermarkAudio.currentTime = 0;
            if (window.WaterMarkInterval) {
                clearInterval(window.WaterMarkInterval);
                window.WaterMarkInterval = null;
            }
        };

        // Attach event listeners to the new audio element
        audioElement.addEventListener('play', this.watermark_startPlayback);
        audioElement.addEventListener('pause', this.pauseAdPlayback);
        audioElement.addEventListener('ended', this.watermark_stopPlayback);

        // If the adAudio ends naturally, reset the ad audio position to the start
        watermarkAudio.onended = () => {
            watermarkAudio.currentTime = 0;
        };

        // Start playing the ad audio immediately if the main audio is already playing
        if (!audioElement.paused) {
            this.watermark_startPlayback();
        } 
    },


    // Function to stop ad playback
    pauseAdPlayback(){
        const adAudio = document.getElementById('ad-audio-element');
        const watermarkAudio = document.getElementById('watermark-audio-element');
        if (adAudio) {
            adAudio.pause();
            
        }
        if (watermarkAudio) {
            watermarkAudio.pause();
        }
        //console.log("pauseAdPlayback --> Music Paused so we should pause the Ad as well. ");
        if (window.WaterMarkInterval) {
            clearInterval(window.WaterMarkInterval);
            window.WaterMarkInterval = null;
        }
    },

    showPopupForm(player, clickedElement, scenario, playerID = null, trackIdToSave = null) {
        // console.log(`Showing popup form for Scenario: '${scenario.name}', Player ID: '${playerID}'`);
        srp_isPausedFromPopup = false;
        const audioElement = sr_setAudioElementInstance($(player));
        clickedElement = $(clickedElement);

        if(scenario.trigger[0].popupHook == 'askForEmail'){
            //console.log("Calling PopupAskForEmail...");
            handleAskEmailClick(clickedElement, scenario, playerID, trackIdToSave);
        }else if(scenario.trigger[0].popupHook == 'elementorPopup'){
            elementorProFrontend.modules.popup.showPopup( { id: scenario.trigger[0].popupID } );
        }else{
            let content = scenario.trigger[0].popupContent;
            content = this.replacePlaceholders(content);
            $('#sonaar-modal .sr_popup-body').html(content);
            sr_openPopUp();
        }
        if(scenario.trigger[0].stopPlayer || scenario.trigger[0].required){
            srp_isPausedFromPopup = true;
            audioElement.pause(); //for sticky only
        }
    },
    replacePlaceholders(content) {
        // Access track data from IRON.audioPlayer.trackData
        const trackData = IRON.audioPlayer.currentTrackData || {};
        const trackTitle = trackData.trackTitle || '';
        const albumTitle = trackData.albumTitle || '';
        const artistName = trackData.artistName || '';
        const imgCover = trackData.albumArt || '';

        return content
            .replace(/{{track_title}}/g, trackTitle)
            .replace(/{{album_title}}/g, albumTitle)
            .replace(/{{artist_name}}/g, artistName)
            .replace(/{{cover_img}}/g, `<img class="srp-trigger-popup-img" style="max-width:70px;" src="${imgCover}" alt="Cover Image">`);
    },
    initializeTrackActions() {
        if (!localStorage.getItem('srmp3_advanced_triggers')) {
            localStorage.setItem('srmp3_advanced_triggers', JSON.stringify({}));
        }
    },
    getExpirationTimestamp(applyTimeSpan) {
        const now = new Date();
    
        switch (applyTimeSpan) {
            case 'minute':
                //console.log('Adding 1 minute.');
                return now.setMinutes(now.getMinutes() + 1);
            case 'hour':
                //console.log('Adding 1 hour.');
                return now.setHours(now.getHours() + 1);
            case 'day':
                //console.log('Adding 1 day.');
                return now.setDate(now.getDate() + 1);
            case 'week':
                //console.log('Adding 1 week.');
                return now.setDate(now.getDate() + 7);
            case 'month':
                //console.log('Adding 1 month.');
                return now.setMonth(now.getMonth() + 1);
            default:
                return null;
        }
    },
    
    isScenarioExpired(scenarioID) {
        const advancedActions = JSON.parse(localStorage.getItem('srmp3_advanced_triggers_overall')) || {};
        const expiration = advancedActions?.[`${scenarioID}_expiration`];
        const now = new Date().getTime();
        return expiration && now > expiration;
    },
    
    hasTrackBeenActioned_anywhereOnScenario() {
    
        // Retrieve stored track actions
        const trackActions = JSON.parse(localStorage.getItem('srmp3_advanced_triggers')) || {};

        // Iterate over all scenarios in the stored actions
        for (const scenarioID in trackActions) {
            // Iterate over all players and tracks for each scenario
            for (const playerID in trackActions[scenarioID]) {
                for (const trackID in trackActions[scenarioID][playerID]) {
                    for (const actionType in trackActions[scenarioID][playerID][trackID]) {
                        // If any action is marked as true, return true immediately
                        if (trackActions[scenarioID][playerID][trackID][actionType] === true) {
                            return true;
                        }
                    }
                }
            }
        }
    
        // If no actions were found, return false
        return false;
    },
    
    // Function to check if a specific action has been triggered for a given scenario, player, and track
    hasTrackBeenActioned(scenario, playerID, trackID, actionType, advancedCondition = null) {
        const scenarioID = scenario.id;
        const scenarioModifiedDate = scenario.modified_date.toString();
        const storedDateKey = `${scenarioID}_modified_date`;
        const storedDate = localStorage.getItem(storedDateKey);
        // Check if the modification date has changed
        if (storedDate !== scenarioModifiedDate) {
            // Clear specific scenario data in both local storage objects
            let advancedActionsOverall = JSON.parse(localStorage.getItem('srmp3_advanced_triggers_overall')) || {};
            delete advancedActionsOverall[`${scenarioID}_times`];
            delete advancedActionsOverall[`${scenarioID}_expiration`];
            localStorage.setItem('srmp3_advanced_triggers_overall', JSON.stringify(advancedActionsOverall));

            let trackActions = JSON.parse(localStorage.getItem('srmp3_advanced_triggers')) || {};
            if (trackActions[scenarioID]) {
                delete trackActions[scenarioID]; // Clear only the specific scenario data
            }
            localStorage.setItem('srmp3_advanced_triggers', JSON.stringify(trackActions));

            // Update local storage with the new modified date
            localStorage.setItem(storedDateKey, scenarioModifiedDate);

            // Optional: Log reset for debugging
            //console.log(`Reset local storage for scenario ID: ${scenarioID} due to date change.`);
        }
        if (advancedCondition) {

            let advancedActions = JSON.parse(localStorage.getItem('srmp3_advanced_triggers_overall')) || {};
            // Check expiration
            //const expiration = advancedActions?.[`${scenarioID}_expiration`];
            //console.log(`Expiration: ${expiration ? new Date(expiration).toUTCString() : 'None'}`);
            //console.log('Is expired?', this.isScenarioExpired(expiration));
            //const timeLeft = Math.floor((expiration - new Date().getTime()) / 1000);
            //console.log(`Time left until expiration: ${timeLeft} seconds`);
    
            if (this.isScenarioExpired(scenarioID)) {
                //console.log('Data expired. Removing from localStorage.');
                delete advancedActions[`${scenario.id}_times`];
                delete advancedActions[`${scenario.id}_expiration`];
                localStorage.setItem('srmp3_advanced_triggers_overall', JSON.stringify(advancedActions));
                this.markTrackAsActioned(scenario, playerID, `track_${trackID}`, scenario.trigger[0].type, true);  
            }

            if(this.isWithinRangeLimitOfAdvancedRules(scenario)){
                return true;
            }else{
                return false;
            }

        } else {
            const trackActions = JSON.parse(localStorage.getItem('srmp3_advanced_triggers')) || {};
            return trackActions?.[scenarioID]?.[playerID]?.[trackID]?.[actionType] === true;
        }
    },

    isWithinRangeLimitOfAdvancedRules(scenario){
        let advancedActions = JSON.parse(localStorage.getItem('srmp3_advanced_triggers_overall')) || {};

        const timesMarked = advancedActions?.[`${scenario.id}_times`] || 0;
        const { applyAfter = null, applyMaxTimes = null } = scenario.advancedRules;

        // Check applyAfter rule
        if (applyAfter) {
            const withinApplyAfter = timesMarked <= applyAfter;
            return withinApplyAfter;
        }
    
        // Check applyMaxTimes rule
        if (applyMaxTimes) {
            const withinMaxTimes = timesMarked > applyMaxTimes;
            return withinMaxTimes;
        }
        
        return false;
    },

    getScenarioTimesRunned(scenario) {
        const scenarioID = scenario.id;
        const trackActions = JSON.parse(localStorage.getItem('srmp3_advanced_triggers_overall')) || {};
        return trackActions[`${scenarioID}_times`] || 0;
    },
    
    // Function to mark a specific action as triggered
    markTrackAsActioned(scenario, playerID, trackID, actionType, advancedCondition = null) {
        console.log(`Marking track as actioned. ScenarioID: ${scenario.id}, PlayerID: ${playerID}, TrackID: ${trackID}, ActionType: ${actionType}`);
    
        if (advancedCondition) {
            let advancedActions = JSON.parse(localStorage.getItem('srmp3_advanced_triggers_overall')) || {};
    
            if (!advancedActions[`${scenario.id}_times`]) {
                advancedActions[`${scenario.id}_times`] = 0;
            }
    
            advancedActions[`${scenario.id}_times`]++;
    
            // Check if expiration already exists
            const existingExpiration = advancedActions[`${scenario.id}_expiration`];
            if (!existingExpiration) {
                const { applyTimeSpan = 'persistent' } = scenario.advancedRules;
                const expirationTimestamp = this.getExpirationTimestamp(applyTimeSpan);
    
                if (expirationTimestamp) {
                    advancedActions[`${scenario.id}_expiration`] = expirationTimestamp;
                }
            }
    
            // Save the updated actions to localStorage
            localStorage.setItem('srmp3_advanced_triggers_overall', JSON.stringify(advancedActions));
        } else {
            let trackActions = JSON.parse(localStorage.getItem('srmp3_advanced_triggers')) || {};
    
            if (!trackActions[scenario.id]) {
                trackActions[scenario.id] = {};
            }
    
            if (!trackActions[scenario.id][playerID]) {
                trackActions[scenario.id][playerID] = {};
            }
    
            if (!trackActions[scenario.id]["name"]) {
                trackActions[scenario.id]["name"] = scenario.name;
            }
    
            if (!trackActions[scenario.id][playerID][trackID]) {
                trackActions[scenario.id][playerID][trackID] = {};
            }
    
            trackActions[scenario.id][playerID][trackID][actionType] = true;
    
            // Save the updated track actions back to localStorage
            localStorage.setItem('srmp3_advanced_triggers', JSON.stringify(trackActions));
        }
    },

    applyAllScenarios(player = null) {
        if(srp_advanced_triggers.length){
            this.initializeTrackActions();
            srp_advanced_triggers.forEach(scenario => {
                this.applyScenario(scenario, player);
            });

            if(IRON.advancedTriggers?.players?.length){
                // attach listeners to non-targeted players only if players are defined in the page
                this.attachListenerToPlayersWithoutScenario();
            }
        }
    },

    attachListenerToPlayersWithoutScenario() {
        const allPlayers = document.querySelectorAll('.iron-audioplayer');
        allPlayers.forEach(player => {

            const playerID = player.id;
            const hasScenario = this.listenersAttached[playerID];
            if (hasScenario) return;
            // Attach a click listener on the parent player using event delegation
            player.addEventListener('click', () => {
                    //console.log(`Player ${playerID} clicked with no active scenario.`);
                    this.detachTimeUpdateOnNoScenario(player);
            });
        });
    },
    // Reusable function to toggle pointer events
    togglePointerEvents(elements, disable) {
        //console.log("togglePointerEvents disable = ", elements, disable);
        elements.forEach((element, index) => {
            if (element) {
                // Ensure the element is visible before applying pointer-events
                if (getComputedStyle(element).display === 'none') {
                    //element.style.display = 'block'; // Temporarily make it visible if required
                }

                element.style.pointerEvents = disable ? 'none' : 'auto';
            }
        });
    },
};

document.addEventListener('DOMContentLoaded', function () {
    if (typeof elementorFrontend !== 'undefined' && elementorFrontend.isEditMode()) {
        $(window).on("elementor/frontend/init", function () {
            elementorFrontend.hooks.addAction("frontend/element_ready/music-player.default", function ($scope) {
                if (typeof setIronAudioplayers == "function") {
                    var elementorWidgetID = $scope[0].dataset.id;
                    IRON.advancedTriggers.applyAllScenarios('.elementor-widget-music-player[data-id="' + elementorWidgetID + '"] .iron-audioplayer');
                }
            });
        });
    }else{
        IRON.advancedTriggers.applyAllScenarios();
    }
});

