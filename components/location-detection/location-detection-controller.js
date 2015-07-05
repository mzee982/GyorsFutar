angular.module('ngModuleLocationDetection')
    .controller('ngControllerLocationDetection',
        [   '$scope',
            '$state',
            '$stateParams',
            '$q',
            'STATE',
            'LOCATION_MODE',
            'EVENT',
            function($scope, $state, $stateParams, $q, STATE, LOCATION_MODE, EVENT) {

                $scope.selectLocationByGeoLocator = function() {
                    var deferred = $q.defer();

                    var promiseGetLocation = $scope.getLocation();

                    promiseGetLocation.then(

                        // Success
                        function(position) {

                            console.info(
                                'Position ' +
                                'lat: ' + position.coords.latitude +
                                ' lon: ' + position.coords.longitude +
                                ' accuracy: ' + position.coords.accuracy +
                                ' formattedAddress: ' + position.formattedAddress);

                            // Format
                            position = {
                                coords: {
                                    latitude: parseFloat(position.coords.latitude).toFixed(6),
                                    longitude: parseFloat(position.coords.longitude).toFixed(6),
                                    accuracy: parseInt((position.coords.accuracy == undefined) ? 1000 : position.coords.accuracy)
                                },
                                formattedAddress: position.formattedAddress
                            };

                            // Accurate enough
                            if (position.coords.accuracy < 500) {

                                // Min search radius
                                if (position.coords.accuracy < 250) position.coords.accuracy = 250;

                                deferred.resolve({targetState: STATE.TIMETABLE, position: position});
                            }

                            // Not accurate enough
                            else {

                                // Stored locations
                                deferred.resolve({targetState: STATE.RECENT_LOCATION_LIST, position: position});

                            }

                        },

                        // Error
                        function(error) {
                            var msg = 'getLocation: ' + error.message;
                            deferred.reject(msg);
                        }

                    );

                    return deferred.promise;
                }

                $scope.getLocation = function() {
                    var deferred = $q.defer();

                    geolocator.locate(

                        // Success
                        function(position) {
                            deferred.resolve(position);
                        },

                        // Error
                        function(error) {
                            deferred.reject(error);
                        },

                        true,
                        {enableHighAccuracy: true, timeout: 6000, maximumAge: 0},
                        null);

                    return deferred.promise;
                }


                /*
                 * Mode selection
                 */

                switch ($stateParams.locationMode) {
                    case LOCATION_MODE.AUTO:
                        var promiseSelectLocation = $scope.selectLocationByGeoLocator();
                        break;
                    case LOCATION_MODE.LIST:
                        var promiseSelectLocation = $q.when({targetState: STATE.RECENT_LOCATION_LIST});
                        break;
                    case LOCATION_MODE.MAP:
                        var promiseSelectLocation = $q.when({targetState: STATE.LOCATION_PICKER});
                        break;
                    default:
                        var promiseSelectLocation = $scope.selectLocationByGeoLocator();
                }

                /*
                 * Result
                 */

                promiseSelectLocation.then(

                    // Success
                    function(data) {

                        switch (data.targetState) {

                            case STATE.TIMETABLE:
                                var timetableParams = {
                                    location: data.position
                                };

                                $state.go(data.targetState, timetableParams);

                                break;

                            case STATE.RECENT_LOCATION_LIST:
                                var locationFromListParams = {
                                    initialPosition: angular.isDefined(data.position) ? data.position : $stateParams.initialPosition,
                                    markedPosition: $stateParams.markedPosition
                                };

                                $state.go(data.targetState, locationFromListParams);

                                break;

                            case STATE.LOCATION_PICKER:
                                var locationPickerParams = {
                                    initialPosition: angular.isDefined(data.position) ? data.position : $stateParams.initialPosition,
                                    markedPosition: $stateParams.markedPosition
                                };

                                $state.go(data.targetState, locationPickerParams);

                                break;

                            default:
                                $scope.$emit(EVENT.ERROR_MESSAGE, 'selectLocation: Invalid target state');

                        }

                    },

                    // Error
                    function(error) {
                        var msg = 'selectLocation: ' + error;
                        $scope.$emit(EVENT.ERROR_MESSAGE, msg);
                    }

                );

            }
        ]
    );
