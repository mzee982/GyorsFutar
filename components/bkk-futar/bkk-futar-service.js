angular.module('ngModuleBkkFutar')
    .factory('ngServiceBkkFutar',
    [   '$q',
        '$http',
        '$filter',
        '$log',
        'BKK_FUTAR',
        function($q, $http, $filter, $log, BKK_FUTAR) {

            /*
             * Interface
             */

            var serviceInstance = {
                searchStops: function(id, name) {return searchStops(id, name);},
                getStopsForLocation: function(position) {return getStopsForLocation(position);},
                getArrivalsAndDeparturesForStop: function(stopIdArray, baseTime) {return getArrivalsAndDeparturesForStop(stopIdArray, baseTime);},
                getTripDetails: function(id) {return getTripDetails(id);},
                getScheduleForStop: function(id, baseTime) {return getScheduleForStop(id, baseTime)},
                getScheduleForStops: function(stopIdArray, baseTime) {return getScheduleForStops(stopIdArray, baseTime)},

                aggregateStopTime: function(stopTime) {return aggregateStopTime(stopTime);},
                convertColor: function(color) {return convertColor(color);},
                convertDate: function(dateValue) {return convertDate(dateValue);},
                isNightTransport: function(route) {return isNightTransport(route);}
            };


            /*
             * Functions
             */

            function concatRequestUrl(config, url) {
                var query = [];

                Object.keys(config.params || {}).forEach(function (key) {
                    var val = config.params[key];
                    query.push([key, val].join('='));
                });

                var queryStr = query.join('&');
                var path = (url || config.url) + '?' + queryStr;

                return path;
            }

            function requestBkkFutarJsonp(apiUrl, params, logLabel) {
                var deferred = $q.defer();
                var config = {params: params};

                // URL
                var url = BKK_FUTAR.URL_API_BASE + apiUrl;

                // Additional params
                config.params[BKK_FUTAR.PARAM_NAME_JSONP_CALLBACK] = BKK_FUTAR.PARAM_VALUE_JSONP_CALLBACK;

                // Timeout
                config.timeout = BKK_FUTAR.HTTP_JSONP_REQUEST_TIMEOUT;

                $log.debug(logLabel + ' URL: ' + concatRequestUrl(config, url));

                // JSONP request
                $http.jsonp(url, config).then(

                    // Success
                    function (successResponse) {
                        deferred.resolve(successResponse.data);
                    },

                    // Error
                    function (errorResponse) {
                        deferred.reject(errorResponse);
                    }

                );

                return deferred.promise;
            }

            function searchStops(id, name) {

                // Params
                var params = {};
                params[BKK_FUTAR.PARAM_API_SEARCH_QUERY] = name;
                params[BKK_FUTAR.PARAM_NAME_API_BASE_REFERENCES] = BKK_FUTAR.PARAM_VALUE_API_SEARCH_REFERENCES;

                // Request
                var promise = requestBkkFutarJsonp(BKK_FUTAR.URL_API_SEARCH, params, 'searchStops');

                // Transform response
                var transformedPromise = promise.then(

                    // Success
                    function (data) {
                        return {id: id, data: data};
                    },

                    // Error
                    function (error) {
                        return $q.reject(error);
                    }

                );

                return transformedPromise;
            }

            function getStopsForLocation(position) {

                // Params
                var params = {};
                params[BKK_FUTAR.PARAM_NAME_API_STOPS_FOR_LOCATION_LATITUDE] = position.coords.latitude;
                params[BKK_FUTAR.PARAM_NAME_API_STOPS_FOR_LOCATION_LONGITUDE] = position.coords.longitude;
                params[BKK_FUTAR.PARAM_NAME_API_STOPS_FOR_LOCATION_RADIUS] = position.coords.accuracy;
                params[BKK_FUTAR.PARAM_NAME_API_BASE_REFERENCES] = BKK_FUTAR.PARAM_VALUE_API_STOPS_FOR_LOCATION_REFERENCES;

                // Request
                return requestBkkFutarJsonp(BKK_FUTAR.URL_API_STOPS_FOR_LOCATION, params, 'getStopsForLocation');

            }

            function getArrivalsAndDeparturesForStop(stopIdArray, baseTime) {

                //
                var minutesAfter = parseInt(BKK_FUTAR.PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_AFTER);
                if (angular.isDefined(baseTime)) {
                    var actualDate = new Date();
                    var lookAheadMinutes = Math.ceil(Math.max(baseTime - actualDate, 0) / 1000 / 60);

                    minutesAfter = minutesAfter + lookAheadMinutes;
                }

                // Params
                var params = {};
                params[BKK_FUTAR.PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_STOP_IDS] = stopIdArray;
                params[BKK_FUTAR.PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_ONLY_DEPARTURES] = BKK_FUTAR.PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_ONLY_DEPARTURES;
                params[BKK_FUTAR.PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_BEFORE] = BKK_FUTAR.PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_BEFORE;
                params[BKK_FUTAR.PARAM_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_MINUTES_AFTER] = minutesAfter;
                params[BKK_FUTAR.PARAM_NAME_API_BASE_REFERENCES] = BKK_FUTAR.PARAM_VALUE_API_ARRIVALS_AND_DEPARTURES_FOR_STOP_REFERENCES;

                // Request
                return requestBkkFutarJsonp(BKK_FUTAR.URL_API_ARRIVALS_AND_DEPARTURES_FOR_STOP, params, 'getArrivalsAndDeparturesForStop');

            }

            function getTripDetails(id) {

                // Params
                var params = {};
                params[BKK_FUTAR.PARAM_API_TRIP_DETAILS_TRIP_ID] = id;
                params[BKK_FUTAR.PARAM_NAME_API_BASE_REFERENCES] = BKK_FUTAR.PARAM_VALUE_API_TRIP_DETAILS_REFERENCES;

                // Request
                return requestBkkFutarJsonp(BKK_FUTAR.URL_API_TRIP_DETAILS, params, 'getTripDetails');

            }

            function getScheduleForStop(id, baseTime) {

                // Date
                var dateValue = (angular.isDate(baseTime)) ? baseTime : new Date();
                var dateString = $filter('date')(dateValue, 'yyyyMMdd');

                // Params
                var params = {};
                params[BKK_FUTAR.PARAM_API_SCHEDULE_FOR_STOP_STOP_ID] = id;
                params[BKK_FUTAR.PARAM_API_SCHEDULE_FOR_STOP_ONLY_DEPARTURES] = BKK_FUTAR.PARAM_VALUE_API_SCHEDULE_FOR_STOP_ONLY_DEPARTURES;
                params[BKK_FUTAR.PARAM_API_SCHEDULE_FOR_STOP_DATE] = dateString;
                params[BKK_FUTAR.PARAM_NAME_API_BASE_REFERENCES] = BKK_FUTAR.PARAM_VALUE_API_SCHEDULE_FOR_STOP_REFERENCES;

                // Request
                return requestBkkFutarJsonp(BKK_FUTAR.URL_API_SCHEDULE_FOR_STOP, params, 'getScheduleForStop');

            }

            function getScheduleForStops(stopIdArray, baseTime) {
                var promises = [];

                // Date
                var dateValue = (angular.isDate(baseTime)) ? baseTime : new Date();
                var dateString = $filter('date')(dateValue, 'yyyyMMdd');

                // Query for each stop id
                angular.forEach(
                    stopIdArray,
                    function(stopId) {

                        // Params
                        var params = {};
                        params[BKK_FUTAR.PARAM_API_SCHEDULE_FOR_STOP_STOP_ID] = stopId;
                        params[BKK_FUTAR.PARAM_API_SCHEDULE_FOR_STOP_ONLY_DEPARTURES] = BKK_FUTAR.PARAM_VALUE_API_SCHEDULE_FOR_STOPS_ONLY_DEPARTURES;
                        params[BKK_FUTAR.PARAM_API_SCHEDULE_FOR_STOP_DATE] = dateString;
                        params[BKK_FUTAR.PARAM_NAME_API_BASE_REFERENCES] = BKK_FUTAR.PARAM_VALUE_API_SCHEDULE_FOR_STOPS_REFERENCES;

                        // Request
                        promises.push(requestBkkFutarJsonp(BKK_FUTAR.URL_API_SCHEDULE_FOR_STOP, params, 'getScheduleForStop'));

                    }
                );

                return $q.all(promises);
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

                stopTimeDate = convertDate(stopTimeValue);

                var targetStopTime = {
                    stopTime: stopTimeDate,
                    stopTimeString: stopTimeDate.toLocaleTimeString(),
                    isArrival: isArrival,
                    isDeparture: isDeparture,
                    isPredicted: isPredicted
                };


                return targetStopTime;
            }

            function convertDate(dateValue) {
                return new Date(dateValue * 1000);
            }

            function convertColor(color) {
                return '#' + color;
            }

            function isNightTransport(route) {
                return ((route.type == 'BUS') && BKK_FUTAR.REGEXP_ROUTE_ID_NIGHT_TRANSPORT.test(route.id));
            }


            /*
             * The service instance
             */

            return serviceInstance;

        }

    ])
    .factory('ngServiceBkkFutarInterceptor',
        ['$q', 'BKK_FUTAR', function($q, BKK_FUTAR) {
            return {

                'response': function(response) {

                    /*
                     * BKK Futar API responses
                     */

                    if (response.config.url.indexOf(BKK_FUTAR.URL_API_BASE) >= 0) {

                        // Validate data
                        if (angular.isObject(response.data)) {

                            // Validate status
                            if (response.data.status == 'OK') {

                                // Validate data
                                if ((angular.isObject(response.data.data))) {

                                    // Validate limit
                                    if (response.data.data.limitExceeded === true) {
                                        return $q.reject('Limit exceeded');
                                    }

                                    // Validate outOfRange
                                    if (response.data.data.outOfRange === true) {
                                        return $q.reject('Out of range');
                                    }

                                }

                                else {
                                    return $q.reject('No data to process');
                                }

                            }

                            else {
                                return $q.reject(response.data.status + ' ' + response.data.text);
                            }

                        }

                        else {
                            return $q.reject('No data received');
                        }

                        return response;

                    }


                    /*
                     * Other responses
                     */

                    else {
                        return response;
                    }

                },

                'responseError': function(rejection) {

                    /*
                     * BKK Futar API responses
                     */

                    if (rejection.config.url.indexOf(BKK_FUTAR.URL_API_BASE) >= 0) {
                        return $q.reject('Request failed (' + rejection.status + ' - ' + rejection.statusText + ')');
                    }


                    /*
                     * Other responses
                     */

                    else {
                        return $q.reject(rejection);
                    }

                }

            };
        }]
    );
