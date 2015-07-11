angular.module('ngModuleBkkFutar')
    .factory('ngServiceBkkFutar',
    [   '$q',
        'BKK_FUTAR',
        function($q, BKK_FUTAR) {

            /*
             * Interface
             */

            var serviceInstance = {
                searchStops: function(id, name) {return searchStops(id, name);},
                getStopsForLocation: function(position) {return getStopsForLocation(position);},
                getArrivalsAndDeparturesForStop: function(stopIdArray, baseTime) {return getArrivalsAndDeparturesForStop(stopIdArray, baseTime);},
                getTripDetails: function(id) {return getTripDetails(id);},

                aggregateStopTime: function(stopTime) {return aggregateStopTime(stopTime);},
                convertColor: function(color) {return convertColor(color);}
            };


            /*
             * Functions
             */

            function searchStops(id, name) {
                var deferred = $q.defer();

                var url = BKK_FUTAR.URL_API_BASE + BKK_FUTAR.URL_API_SEARCH;
                url = url.replace(BKK_FUTAR.PARAM_API_SEARCH_QUERY, name);
                url = url.replace(BKK_FUTAR.PARAM_API_BASE_REFERENCES, BKK_FUTAR.PARAM_VALUE_API_SEARCH_REFERENCES);

                console.info('searchStops URL: ' + url);

                $.ajax({
                    url: url,
                    jsonp: 'callback',
                    dataType: 'jsonp',
                    success: function(data) {deferred.resolve({id: id, data: data});},
                    error: function(xhr, status, errorThrown) {deferred.reject(status + ' ' + errorThrown);}
                });

                return deferred.promise;
            }

            function getStopsForLocation(position) {
                var deferred = $q.defer();

                var url = BKK_FUTAR.URL_API_BASE + BKK_FUTAR.URL_API_STOPS_FOR_LOCATION;
                url = url.replace(BKK_FUTAR.PARAM_API_STOPS_FOR_LOCATION_LATITUDE, position.coords.latitude);
                url = url.replace(BKK_FUTAR.PARAM_API_STOPS_FOR_LOCATION_LONGITUDE, position.coords.longitude);
                url = url.replace(BKK_FUTAR.PARAM_API_STOPS_FOR_LOCATION_RADIUS, position.coords.accuracy);
                url = url.replace(BKK_FUTAR.PARAM_API_BASE_REFERENCES, BKK_FUTAR.PARAM_VALUE_API_STOPS_FOR_LOCATION_REFERENCES);

                console.info('getStopsForLocation URL: ' + url);

                $.ajax({
                    url: url,
                    jsonp: 'callback',
                    dataType: 'jsonp',
                    success: function(data) {deferred.resolve(data);},
                    error: function(xhr, status, errorThrown) {deferred.reject(status + ' ' + errorThrown);}
                });

                return deferred.promise;
            }

            function getArrivalsAndDeparturesForStop(stopIdArray, baseTime) {
                var deferred = $q.defer();

                // Collect stop ids

                var stopIdsString = '';

                if (stopIdArray.length > 0) {
                    stopIdsString = stopIdsString + 'stopId=' + stopIdArray[0];

                    for (var i = 1; i < stopIdArray.length; i++) {
                        stopIdsString = stopIdsString + '&stopId=' + stopIdArray[i];
                    }
                }

                //
                var minutesAfter = parseInt(BKK_FUTAR.PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_AFTER);
                if (angular.isDefined(baseTime)) {
                    var actualDate = new Date();
                    var lookAheadMinutes = Math.ceil(Math.max(baseTime - actualDate, 0) / 1000 / 60);

                    minutesAfter = minutesAfter + lookAheadMinutes;
                }

                // URL build

                var url = BKK_FUTAR.URL_API_BASE + BKK_FUTAR.URL_API_ARRIVALS_AND_DEPARTURES_FOR_STOP;
                url = url.replace(BKK_FUTAR.PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_STOP_IDS, stopIdsString);
                url = url.replace(BKK_FUTAR.PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_ONLY_DEPARTURES, BKK_FUTAR.PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_ONLY_DEPARTURES);
                url = url.replace(BKK_FUTAR.PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_BEFORE, BKK_FUTAR.PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_BEFORE);
                url = url.replace(BKK_FUTAR.PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_AFTER, minutesAfter);
                url = url.replace(BKK_FUTAR.PARAM_API_BASE_REFERENCES, BKK_FUTAR.PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_REFERENCES);

                console.info('getArrivalsAndDeparturesForStop URL: ' + url);

                $.ajax({
                    url: url,
                    jsonp: 'callback',
                    dataType: 'jsonp',
                    success: function(data) {
                        deferred.resolve(data);
                    },
                    error: function(xhr, status, errorThrown) {
                        deferred.reject(status + ' ' + errorThrown);
                    }
                });

                return deferred.promise;
            }

            function getTripDetails(id) {
                var deferred = $q.defer();

                var url = BKK_FUTAR.URL_API_BASE + BKK_FUTAR.URL_API_TRIP_DETAILS;
                url = url.replace(BKK_FUTAR.PARAM_API_TRIP_DETAILS_TRIP_ID, id);
                url = url.replace(BKK_FUTAR.PARAM_API_BASE_REFERENCES, BKK_FUTAR.PARAM_VALUE_API_TRIP_DETAILS_REFERENCES);

                console.info('getTripDetails URL: ' + url);

                $.ajax({
                    url: url,
                    jsonp: 'callback',
                    dataType: 'jsonp',
                    success: function(data) {deferred.resolve(data);},
                    error: function(xhr, status, errorThrown) {deferred.reject(status + ' ' + errorThrown);}
                });

                return deferred.promise;
            }

            function aggregateStopTime(stopTime) {
                var stopTimeValue = undefined;
                var stopTimeDate = undefined;
                var isArrival = false;
                var isDeparture = false;
                var isPredicted = false;

                // Predicted arrival
                if (angular.isNumber(stopTime.predictedArrivalTime)) {
                    stopTimeValue = stopTime.predictedArrivalTime
                    isArrival = true;
                    isPredicted = true;
                }

                // Arrival
                else if (angular.isNumber(stopTime.arrivalTime)) {
                    stopTimeValue = stopTime.arrivalTime
                    isArrival = true;
                }

                // Predicted departure
                else if (angular.isNumber(stopTime.predictedDepartureTime)) {
                    stopTimeValue = stopTime.predictedDepartureTime
                    isDeparture = true;
                    isPredicted = true;
                }

                // Departure
                else if (angular.isNumber(stopTime.departureTime)) {
                    stopTimeValue = stopTime.departureTime;
                    isDeparture = true;
                }

                stopTimeDate = new Date(stopTimeValue * 1000);

                var targetStopTime = {
                    stopTime: stopTimeDate,
                    stopTimeString: stopTimeDate.toLocaleTimeString(),
                    isArrival: isArrival,
                    isDeparture: isDeparture,
                    isPredicted: isPredicted
                };


                return targetStopTime;
            }

            function convertColor(color) {
                return '#' + color;
            }


            /*
             * The service instance
             */

            return serviceInstance;

        }

    ]);
