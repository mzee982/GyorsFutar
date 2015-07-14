angular
    .module('ngModuleBkkFutar', [])
    .constant('BKK_FUTAR', {
        'URL_API_BASE': 'http://futar.bkk.hu/bkk-utvonaltervezo-api/ws/otp/api/where/',
        'PARAM_API_BASE_REFERENCES': '$INCLUDE_REFERENCES',

        'URL_API_SEARCH': 'search.json?query=$QUERY&includeReferences=$INCLUDE_REFERENCES',
        'PARAM_API_SEARCH_QUERY': '$QUERY',
        'PARAM_VALUE_API_SEARCH_REFERENCES': 'routes,stops',

        'URL_API_STOPS_FOR_LOCATION': 'stops-for-location.json?lat=$LATITIUDE&lon=$LONGITUDE&radius=$RADIUS&includeReferences=$INCLUDE_REFERENCES',
        'PARAM_API_STOPS_FOR_LOCATION_LATITUDE': '$LATITIUDE',
        'PARAM_API_STOPS_FOR_LOCATION_LONGITUDE': '$LONGITUDE',
        'PARAM_API_STOPS_FOR_LOCATION_RADIUS': '$RADIUS',
        'PARAM_VALUE_API_STOPS_FOR_LOCATION_REFERENCES': 'false',

        'URL_API_ARRIVALS_AND_DEPARTURES_FOR_STOP': 'arrivals-and-departures-for-stop.json?$STOP_IDS&onlyDepartures=$ONLY_DEPARTURES&minutesBefore=$MINUTES_BEFORE&minutesAfter=$MINUTES_AFTER&includeReferences=$INCLUDE_REFERENCES',
        'PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_STOP_IDS': '$STOP_IDS',
        'PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_ONLY_DEPARTURES': '$ONLY_DEPARTURES',
        'PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_ONLY_DEPARTURES': 'false',
        'PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_BEFORE': '$MINUTES_BEFORE',
        'PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_BEFORE': '0',
        'PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_AFTER': '$MINUTES_AFTER',
        'PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_AFTER': '30',
        'PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_REFERENCES': 'trips',

        'URL_API_TRIP_DETAILS': 'trip-details.json?tripId=$TRIP_ID&includeReferences=$INCLUDE_REFERENCES',
        'PARAM_API_TRIP_DETAILS_TRIP_ID': '$TRIP_ID',
        'PARAM_VALUE_API_TRIP_DETAILS_REFERENCES': 'routes,stops,trips',

        'URL_API_SCHEDULE_FOR_STOP': 'schedule-for-stop.json?stopId=$STOP_ID&onlyDepartures=$ONLY_DEPARTURES&date=$DATE&includeReferences=$INCLUDE_REFERENCES',
        'PARAM_API_SCHEDULE_FOR_STOP_STOP_ID': '$STOP_ID',
        'PARAM_API_SCHEDULE_FOR_STOP_ONLY_DEPARTURES': '$ONLY_DEPARTURES',
        'PARAM_VALUE_API_SCHEDULE_FOR_STOP_ONLY_DEPARTURES': 'false',
        'PARAM_API_SCHEDULE_FOR_STOP_DATE': '$DATE',
        'PARAM_VALUE_API_SCHEDULE_FOR_STOP_REFERENCES': 'routes,stops'
    });
