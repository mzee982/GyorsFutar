angular.module('ngModuleLocation')
    .factory('ngServiceLocation',
    [   '$q',
        '$localStorage',
        '$log',
        'ngServiceUtils',
        'LOCATION',
        function($q, $localStorage, $log, ngServiceUtils, LOCATION) {

            /*
             * Interface
             */

            var serviceInstance = {
                getLocationByGeoLocator: function() {return getLocationByGeoLocator();},
                formatLocation: function(lat, lon, accuracy, address) {return formatLocation(lat, lon, accuracy, address);},
                storeLocation: function(location) {storeLocation(location);},
                getStoredLocations: function() {return getStoredLocations();}
            };


            /*
             * Functions
             */

            function getLocationByGeoLocator() {
                var deferred = $q.defer();

                var promiseLocate = locate();

                promiseLocate.then(

                    // Success
                    function(location) {

                        $log.debug(
                            'Location by GeoLocator ' +
                            'lat: ' + location.coords.latitude +
                            ' lon: ' + location.coords.longitude +
                            ' accuracy: ' + location.coords.accuracy +
                            ' formattedAddress: ' + location.formattedAddress);

                        // Format
                        var promiseFormatLocation = formatLocation(location.coords.latitude, location.coords.longitude, location.coords.accuracy, location.formattedAddress);

                        promiseFormatLocation.then(

                            // Success
                            function(location) {

                                // Accurate enough
                                if (location.coords.accuracy <= LOCATION.ACCURACY_LIMIT) {

                                    // Set min search radius
                                    if (location.coords.accuracy < LOCATION.ACCURACY_MIN_SEARCH_RADIUS) location.coords.accuracy = LOCATION.ACCURACY_MIN_SEARCH_RADIUS;

                                    deferred.resolve({location: location, isAccurate: true});
                                }

                                // Not accurate enough
                                else {
                                    deferred.resolve({location: location, isAccurate: false});
                                }

                            },

                            // Error
                            function(error) {
                                deferred.reject('formatLocation failed');
                            }

                        );

                    },

                    // Error
                    function(error) {
                        var msg = 'locate: ' + error.message;
                        deferred.reject(msg);
                    }

                );

                return deferred.promise;
            }

            function locate() {
                var deferred = $q.defer();

                geolocator.locate(

                    // Success
                    function(location) {
                        deferred.resolve(location);
                    },

                    // Error
                    function(error) {
                        deferred.reject(error);
                    },

                    true,
                    {
                        enableHighAccuracy: true,
                        timeout: LOCATION.TIMEOUT,
                        maximumAge: 0
                    },
                    null);

                return deferred.promise;
            }

            function formatLocation(lat, lon, accuracy, address) {
                var deferred = $q.defer();

                var location = {
                    coords: {
                        latitude: parseFloat(lat).toFixed(6),
                        longitude: parseFloat(lon).toFixed(6),
                        detectedAccuracy: parseInt((angular.isNumber(accuracy)) ? accuracy : 0),
                        accuracy: parseInt((angular.isNumber(accuracy)) ? accuracy : LOCATION.ACCURACY_DEFAULT)
                    },
                    formattedAddress: address
                };

                // Reverse Geocoding by Location
                if (angular.isUndefined(address)) {
                    var geocoder = new google.maps.Geocoder();
                    var latlng = new google.maps.LatLng(location.coords.latitude, location.coords.longitude);

                    geocoder.geocode(
                        {'location': latlng},
                        function(results, status) {

                            // Success
                            if (status == google.maps.GeocoderStatus.OK) {
                                if (results[0]) {
                                    location.formattedAddress = results[0].formatted_address;
                                } else {
                                    location.formattedAddress = '';
                                }
                            }

                            // Error
                            else {
                                location.formattedAddress = '';
                            }

                            deferred.resolve(location);
                        }
                    );

                }

                //
                else {
                    deferred.resolve(location);
                }


                return deferred.promise;
            }

            function storeLocation(location) {
                var actualStoreTimestamp = ngServiceUtils.now();
                var defaultStoreTimestamp = new Date(0).getTime();
                var locationKey = location.formattedAddress;

                // Read storage
                var storedLocations = $localStorage.recentLocations;

                // Initialize if not exists yet
                if (angular.isUndefined(storedLocations)) {
                    storedLocations = {};
                }

                // Add / Overwrite
                location.storeTimestamp = actualStoreTimestamp;
                storedLocations[locationKey] = location;

                // To array
                var storedLocationArray = [];
                angular.forEach(
                    storedLocations,
                    function(value, key, obj) {
                        if (angular.isUndefined(value.storeTimestamp)) value.storeTimestamp = defaultStoreTimestamp;
                        this.push(value);
                    },
                    storedLocationArray);

                // Sort by descending timestamp
                storedLocationArray.sort(function(a, b) {return b.storeTimestamp - a.storeTimestamp;});

                // Store only the most recent locations
                storedLocationArray = storedLocationArray.slice(0, LOCATION.RECENT_LOCATION_COUNT);

                // To object
                storedLocations = {};
                angular.forEach(storedLocationArray, function(value, key, obj) {this[value.formattedAddress] = value;}, storedLocations);

                // Write storage
                $localStorage.recentLocations = storedLocations;

            }

            function getStoredLocations() {
                return $localStorage.recentLocations;
            }


            /*
             * The service instance
             */

            return serviceInstance;

        }
    ]);
