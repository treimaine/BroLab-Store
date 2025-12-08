var app = new Vue({
  el: '#sonaar_music',
})
var optionsChart = {
  maintainAspectRatio: false,
  scales: {
    yAxes: [{
      stacked: false,
      gridLines: {
        display: true,
        color: "rgba(255,99,132,0.2)"
      },
      ticks: {
        beginAtZero:false,
        min: 0,
        stepSize: 5
      }
    }],
    xAxes: [{
      gridLines: {
        display: false
      }
    }]
  }
};

var data = sonaar_music_pro.get_play_count_by_day

var app = new Vue({
  el: '#sonaar_pro',
  data: {
    ready:false,
    totalPlay: sonaar_music_pro.totalPlay || 0,
    totalDownload: sonaar_music_pro.totalDownload || 0,
    totalTrack: sonaar_music_pro.totalTrack ||0,
    play_count_by_page: sonaar_music_pro.get_play_count_per_page,
    get_play_count_per_track: sonaar_music_pro.get_play_count_per_track,
    get_download_count_per_track: sonaar_music_pro.get_download_count_per_track,
    message: {
      display:false,
      type:'',
      data:''
    },
    currentPlan: sonaar_music_pro.SRMP3_purchased_plan || false,
    licenceKey: sonaar_music_pro.licence || '',
    licenceValidated: sonaar_music_pro.licence || false
  },
  methods: {
    'getQueryVariable': function (variable) {
      var query = window.location.search.substring(1);
      var vars = query.split("&");
      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) { return pair[1]; }
      }
      return (false);
    },
    'validate_licence': function(e){
      e.preventDefault()
      
      //save the current text of the button
      var currentText = jQuery(e.target).text();
      jQuery(e.target).addClass('disabled').html('<i class="fa fa-spinner fa-spin"></i> Validating...');

      if( !this.licenceKey ){
        this.outputMessage()
        jQuery(e.target).html(currentText)
        jQuery(e.target).removeClass('disabled');
        return
      }
        this.licenceKey = this.licenceKey.trim();
        jQuery.post(
    			sonaar_admin_ajax.ajax.ajax_url,
    			{
    				action: 'sonaar_music_activateRemoteLicence',
    				data: {
              siteUrl: window.location.protocol + '//' + window.location.hostname,
              licenceKey: this.licenceKey,
              nonce: sonaar_admin_ajax.ajax.ajax_nonce
            }
    			},
    			function(data, textStatus, xhr) {
              jQuery(e.target).html(currentText)
              jQuery(e.target).removeClass('disabled');
              
    		  		if ( 'success' == textStatus ) {

    		  		  var response = JSON.parse(data.body)
    		  		  // console.dir(response)
    		  			switch (response.success) {
    		  			  case true:
    		  			    this.register_licence( response )
    		  			    break;
                  case false:
                    this.errorMessage(response.error, response)
                    break;
    		  			  default:
    		  			    this.outputMessage("error","<h3 class='error'>Sorry</h3>The key does not seem to match with a valid license key for Sonaar Music Pro.")
    		  			}
    		  		};
    		}.bind(this));


    },
    register_licence: function( response ){
      this.licenceKey = this.licenceKey.trim();
      jQuery.post(
        sonaar_admin_ajax.ajax.ajax_url,
        {
          action: 'sonaar_music_registerLicence',
          data: {
            'licenceKey': this.licenceKey,
            'response': response,
            'nonce': sonaar_admin_ajax.ajax.ajax_nonce
          }
        },
        function( data, textStatus){
          var plan = data.price_id;
          this.outputMessage("succes","<h3 class='success'>Yeppi 🎉<br><br>" + plan + " Plan Activated!</h3> Put your headphones on, it's time to get things done!");
          jQuery('.srmp3_currrent_plan').text('⭐️ ' + plan + ' plan');
          this.licenceValidated = true
        }.bind(this))
    },
    clearCache: function(type, e ){
      e.preventDefault()
      jQuery.post(
        sonaar_admin_ajax.ajax.ajax_url,
        {
          action: 'sonaar_music_clearCache',
          data: {
            'type': type,
            'nonce': sonaar_admin_ajax.ajax.ajax_nonce
          }
        },
        function( data, textStatus){
          this.outputMessage("succes","<h3 class='success'>Done</h3> The "+ type +"s has been cleared.")
          this.licenceValidated = false;
        }.bind(this))
    },
    invalidateLicense: function(){
     
      jQuery.post(
        sonaar_admin_ajax.ajax.ajax_url,
        {
          action: 'sonaar_music_invalidateLicense',
          data: {
            'nonce': sonaar_admin_ajax.ajax.ajax_nonce
          }
        },
       )
    },
    errorMessage: function(error){
      switch (error) {
        case 'expired':
          this.outputMessage("error","<h3 class='error'>Sorry</h3>Your license key has <span style='color:red;'>expired</span>. Login to your account at <a href='https://sonaar.io/login' target='_blank'>https://sonaar.io/login</a> and renew your subscription.")
          this.invalidateLicense();
          break;

        case 'revoked':
          this.outputMessage("error","<h3 class='error'>Sorry</h3>Your license key has been <span style='color:red;'>revoked</span>.")
          this.invalidateLicense();
          break;

        case 'no_activations_left':
          this.outputMessage("error","<h3 class='error'>Sorry</h3>Your license key is valid but you’ve <span style='color:red;'>activated it too many times</span> on another domain(s).  Login to your account at <a href='https://sonaar.io/login' target='_blank'>https://sonaar.io/login</a> and manage your activation domains.")
          this.invalidateLicense();
          break;
        default:
          this.outputMessage("error","<h3 class='error'>Sorry</h3>The key does not seem to match with a valid license key for Sonaar.")
          this.invalidateLicense();
      }

    },
    outputMessage: function(type, message){
      this.message.display = true
      this.message.data = message
      this.message.type = type
    },
    closeMessage:function(){
      this.message.display = false
    }
  },
  mounted: function () {
    this.ready = true;
    if(typeof Chart !== 'undefined'){
      Chart.Bar('chart', {
        options: optionsChart,
        data: data
      })
    }
    var that = this;

    if(typeof moment !== 'undefined'){
    jQuery('input[name="daterange"]').daterangepicker({
      ranges: {
        'Today': [moment(), moment()],
        'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
        'Last 7 Days': [moment().subtract(6, 'days'), moment()],
        'Last 30 Days': [moment().subtract(29, 'days'), moment()],
        'This Month': [moment().startOf('month'), moment().endOf('month')],
        'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
      },
      "alwaysShowCalendars": true,
      "startDate": sonaar_music_pro.interval.start,
      "endDate": sonaar_music_pro.interval.end,
      "opens": "left"
    }, function (start, end, label) {

      var query = window.location.search.substring(1);
      var vars = query.split("&");
      var searchObject = {};
      var searchString = '';

      for (var i = 0; i < vars.length; i++) {
        pair = vars[i].split("=");
        Object.defineProperty(searchObject, pair[0], {
          value: pair[1],
          writable: true
        })

      }

      if (searchObject.hasOwnProperty('date_start')) {
        searchObject.date_start = start.format('YYYY-MM-DD');
      } else {
        Object.defineProperty(searchObject, 'date_start', {
          value: start.format('YYYY-MM-DD'),
          writable: true
        })
      }
      if (searchObject.hasOwnProperty('date_end')) {
        searchObject.date_end = end.format('YYYY-MM-DD');
      } else {
        Object.defineProperty(searchObject, 'date_end', {
          value: end.format('YYYY-MM-DD'),
          writable: true
        })
      }




      var searchKey = Object.getOwnPropertyNames(searchObject);
      for (var index = 0; index < searchKey.length; index++) {
        searchString += (index !== (searchKey.length - 1)) ? searchKey[index] + '=' + searchObject[searchKey[index]] + '&' : searchKey[index] + '=' + searchObject[searchKey[index]];
      }
      window.location.assign(window.location.origin + window.location.pathname + '?' + searchString);
    });
  }


  }

})