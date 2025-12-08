<?php

class Sonaar_Music_Get extends Sonaar_Music_DB {
    
    /**
    * Set the interval.
    *
    * @since 1.0.0
    *
    * @param  integer $interval Interval in days.
    * @return $this
    */
    public function set_interval( $interval ) {
        $this->interval   = absint( $interval );
        // $this->start_date = date( self::MYSQL_DATETIME_FORMAT, strtotime( sprintf( '-%d days', $this->interval ) ) );
        
        return $this;
    }
    
    
    public function set_date( $start, $end ){
        $this->start_date = date( self::MYSQL_DATETIME_FORMAT,  strtotime($start) );
        $this->end_date = date( self::MYSQL_DATETIME_FORMAT,  strtotime($end . ' + 1439 minutes') );
        
        return $this;
    }
    
    public function get_date(){
        return array($this->start_date, $this->end_date);
    }
    
    /**
    * Retrieve the total number of plays during the specified interval.
    *
    * @since 1.0.0
    *
    * @return integer
    */
    public function get_play_count($url = false) {
        if ( $url ) {
            $sql = $this->db->prepare(
                "SELECT COUNT( * ),
                page_url
                FROM {$this->db_name}
                WHERE
                action = 'play' AND
                page_url = %s AND
                target_time = 0 AND
                created BETWEEN %s AND %s",
                $url,
                $this->start_date,
                $this->end_date
            );
        }else{
            $sql = $this->db->prepare(
                "SELECT COUNT( * )
                FROM {$this->db_name}
                WHERE
                action = 'play' AND
                target_time = 0 AND
                created BETWEEN %s AND %s",
                $this->start_date,
                $this->end_date
            );
        }
        
        return (int) $this->db->get_var( $sql );
    }

    public function get_download_count($url = false) {
        if ( $url ) {
            $sql = $this->db->prepare(
                "SELECT COUNT( * ),
                page_url
                FROM {$this->db_name}
                WHERE
                action = 'download' AND
                page_url = %s AND
                target_time = 0 AND
                created BETWEEN %s AND %s",
                $url,
                $this->start_date,
                $this->end_date
            );
        }else{
            $sql = $this->db->prepare(
                "SELECT COUNT( * )
                FROM {$this->db_name}
                WHERE
                action = 'download' AND
                target_time = 0 AND
                created BETWEEN %s AND %s",
                $this->start_date,
                $this->end_date
            );
        }
        
        return (int) $this->db->get_var( $sql );
    }
    
    /**
    * Retrieve the total number of listeners during the specified interval.
    *
    * @since 1.0.0
    *
    * @return integer
    */
    public function get_listener_count() {
        $sql = $this->db->prepare(
        "SELECT COUNT( DISTINCT client_uid )
        FROM {$this->db_name}
        WHERE
        action = 'play' AND
        target_time = 0 AND
        created BETWEEN %s AND %s",
        $this->start_date,
        $this->end_date
        );
        
        return (int) $this->db->get_var( $sql );
    }
    
    /**
    * Retrieve the number of tracks played during the specified interval.
    *
    * @since 1.0.0
    *
    * @return integer
    */
    public function get_track_count() {
        $sql = $this->db->prepare(
        "SELECT COUNT( DISTINCT target_url )
        FROM {$this->db_name}
        WHERE
        action = 'play' AND
        target_time = 0 AND
        created BETWEEN %s AND %s",
        $this->start_date,
        $this->end_date
        );
        
        return (int) $this->db->get_var( $sql );
    }
    
    /**
    * Retrieve the total plays per day within the specified interval.
    *
    * @since 1.0.0
    *
    * @return array
    */
    public function get_play_count_by_day($url = false) {
        if ( $url ) {
            $sql = $this->db->prepare(
				"SELECT
				DATE_FORMAT( DATE_ADD( created, INTERVAL %d HOUR ), '%%c/%%e' ) AS date,
				page_url,
				target_title,
				target_url
				FROM {$this->db_name}
				WHERE
				( action = 'play' AND target_time = 0 ) AND
				page_url = %s AND
				created BETWEEN %s AND %s
				ORDER BY created ASC",
				array(
					$this->offset,
					$url,
					$this->start_date,
					$this->end_date,
					//$this->offset
				)
            );
        }else{
            
            $sql = $this->db->prepare(
				"SELECT
				DATE_FORMAT( DATE_ADD( created, INTERVAL %d HOUR ), '%%c/%%e' ) AS date,
				target_title,
				target_url
				FROM {$this->db_name}
				WHERE
				( action = 'play' AND target_time = 0 ) AND
				created BETWEEN %s AND %s
				ORDER BY created ASC",
				array(
					$this->offset,
					$this->start_date,
					$this->end_date
					//$this->offset
				)
            );			
        }
        
        $results = $this->db->get_results( $sql );
        $data         = array();

        $current_time = strtotime( $this->end_date );
        $emptyDate = array();
        // Create an array with an entry for every date in the period, including
        // days when there weren't any listens.
        
        for ( $i = $this->interval - 1; $i >= 0; $i-- ) {
            $date = date( 'n/j', $current_time - $i * DAY_IN_SECONDS );
            
            $emptyDate[ $date ] = (object) array(
                'date'           => $date,
                'complete_count' => 0,
                'play_count'     => 0,
            );
        }

        foreach ($results as $res) {
            $res->play_count = 1;
            
            $label = (get_the_title( $res->target_url ) )? get_the_title( $res->target_url ): $res->target_title;
            if (!array_key_exists($label, $data)) {
                $data[$label] = array();
            }
        }
        
        foreach ($data as $key => $dataputDate ) {
            $data[$key] = $emptyDate;
        }

        foreach ($results as $res ) {
            $label = (get_the_title( $res->target_url ) )? get_the_title( $res->target_url ): $res->target_title;
            if (!array_key_exists($res->date , $data[$label])) {
                $data[$label][$res->date] = $res;
            }else{
                $cacheCount = $data[$label][$res->date]->play_count;
                $data[$label][$res->date] = $res;
                $data[$label][$res->date]->play_count = $cacheCount + 1;
            }
        }

        
        function rand_color() {
           $rand = str_pad(dechex(rand(0x000000, 0xFFFFFF)), 6, 0, strtoupper(STR_PAD_LEFT));
           return '#' . $rand;
        }

        $dataChart = array(
            "labels" => array_keys($emptyDate),
            "datasets" => array()
        );
        foreach ($data as $key => $value) {
            $data[$key] = wp_list_pluck( $data[$key], 'play_count', 'date');
        }

        foreach ($data as $key => $value) {
            $color = rand_color();
            $dataset = array(
                "label" => stripslashes($key),
                "backgroundColor" =>  $color,
                "borderColor" =>  $color,
                "data" => array_values($data[$key]),
                "fill" => true
            );

            array_push($dataChart['datasets'], $dataset);
        }

        
        return $dataChart;
    }
    
    /**
    * Retrieve the plays per page during the specified interval.
    *
    * @since 1.0.0
    *
    * @param array $args Array of arguments.
    * @return array
    */
    public function get_play_count_per_page( $args = array() ) {
        $args = wp_parse_args( $args, array( 'limit' => 10 ) );
        
        $sql = $this->db->prepare(
        "SELECT page_title, page_url, COUNT(*) AS play_count
        FROM {$this->db_name}
        WHERE
        action = 'play' AND
        target_time = 0 AND
        created BETWEEN %s AND %s
        GROUP BY page_url
        ORDER BY play_count DESC
        LIMIT %d",
        $this->start_date,
        $this->end_date,
        absint( $args['limit'] )
        );
        
        $results = $this->db->get_results( $sql );
        
        foreach ( $results as $key => $result ) {
            if ( empty( $result->page_title ) ) {
                $results[ $key ]->page_title = $result->page_url;
            }
        }
        
        return $results;
    }
    
    /**
    * Retrieve the plays per day for each track within the specified interval.
    *
    * @since 1.0.0
    *
    * @param array $args Array of arguments.
    * @return array
    */
    public function get_play_count_per_track( $args = array() ) {
        $args = wp_parse_args( $args, array( 'limit' => 10 , 'url' => false) );
        
        if ($args['url']) {
            
            $sql = $this->db->prepare(
            "SELECT
            target_title,
            target_url,
            page_url,
            COUNT( IF( action = 'play', 1, NULL ) ) AS play_count
            FROM {$this->db_name}
            WHERE
            (
            ( action = 'play' AND target_time = 0 ) OR
            action = 'complete' OR
            action = 'skip'
            ) AND
            page_url = %s
            GROUP BY target_url
            ORDER BY play_count DESC
            LIMIT %d",
            $args['url'],
            absint( $args['limit'] )
            );
            
        }else{
            
            $sql = $this->db->prepare(
            "SELECT
            target_title,
            target_url,
            page_url,
            COUNT( IF( action = 'play', 1, NULL ) ) AS play_count
            FROM {$this->db_name}
            WHERE
            (
            ( action = 'play' AND target_time = 0 ) OR
            action = 'complete' OR
            action = 'skip'
            )
            GROUP BY target_url
            ORDER BY play_count DESC
            LIMIT %d",
            absint( $args['limit'] )
            );
            
        }
        
        $results = $this->db->get_results( $sql );
        
        return $results;
    }


    public function get_download_count_per_track( $args = array() ) {
        $args = wp_parse_args( $args, array( 'limit' => 10 , 'url' => false) );
        
        if ($args['url']) {
            
            $sql = $this->db->prepare(
            "SELECT
            target_title,
            target_url,
            page_url,
            COUNT( IF( action = 'download', 1, NULL ) ) AS download_count
            FROM {$this->db_name}
            WHERE action = 'download' AND page_url = %s
            GROUP BY target_url
            ORDER BY download_count DESC
            LIMIT %d",
            $args['url'],
            absint( $args['limit'] )
            );
            
        }else{
            
            $sql = $this->db->prepare(
            "SELECT
            target_title,
            target_url,
            page_url,
            COUNT( IF( action = 'download', 1, NULL ) ) AS download_count
            FROM {$this->db_name}
            WHERE action = 'download' 
            GROUP BY target_url
            ORDER BY download_count DESC
            LIMIT %d",
            absint( $args['limit'] )
            );
            
        }
        
        $results = $this->db->get_results( $sql );
        
        return $results;
    }
    
    /**
    * Retrieve data to display the change in plays compared to the previous interval.
    *
    * @since 1.0.0
    *
    * @param array $args Array of arguments.
    * @return array
    */
    public function get_chart_data( $args = array() ) {
        $args = wp_parse_args( $args, array( 'limit' => 10 ) );
        
        $sql = $this->db->prepare(
        "SELECT
        target_title,
        target_url,
        COUNT( IF( DATE_ADD( created, INTERVAL %d HOUR ) >= DATE_SUB( %s, INTERVAL %d DAY ), 1, NULL ) ) AS plays_this_period,
        COUNT( IF( DATE_ADD( created, INTERVAL %d HOUR ) < DATE_SUB( %s, INTERVAL %d DAY ), 1, NULL ) ) AS plays_last_period
        FROM {$this->db_name}
        WHERE
        action = 'play' AND
        target_time = 0 AND
        created BETWEEN %s AND %s
        GROUP BY target_url
        ORDER BY plays_this_period DESC
        LIMIT %d",
        $this->offset,
        $this->end_date,
        $this->interval,
        $this->offset,
        $this->end_date,
        $this->interval,
        date( self::MYSQL_DATETIME_FORMAT, strtotime( sprintf( '-%d days', $this->interval * 2 ) ) ),
        $this->end_date,
        absint( $args['limit'] )
        );
        
        $results = $this->db->get_results( $sql );
        
        return $results;
    }
}