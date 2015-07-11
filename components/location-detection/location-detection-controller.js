angular.module('ngModuleLocationDetection')
    .controller('ngControllerLocationDetection',
        [   '$scope',
            '$state',
            '$stateParams',
            '$q',
            'ngServiceLocation',
            'STATE',
            'LOCATION_MODE',
            'EVENT',
            function($scope, $state, $stateParams, $q, ngServiceLocation, STATE, LOCATION_MODE, EVENT) {

                $scope.getLocationByGeoLocator = function() {
                    var deferred = $q.defer();

                    var promiseLocationByGeoLocator = ngServiceLocation.getLocationByGeoLocator();

                    promiseLocationByGeoLocator.then(

                        // Success
                        function(data) {

                            // Timetable
                            if (data.isAccurate) {
                                deferred.resolve({targetState: STATE.TIMETABLE, position: data.location});
                            }

                            // Stored locations
                            else {
                                deferred.resolve({targetState: STATE.RECENT_LOCATION_LIST, position: data.location});
                            }

                        },

                        // Error
                        function(error) {
                            var msg = 'getLocationByGeoLocator: ' + error;
                            deferred.reject(msg);
                        }

                    );

                    return deferred.promise;
                }


                /*
                 * Mode selection
                 */

                switch ($stateParams.locationMode) {
                    case LOCATION_MODE.AUTO:
                        var promiseSelectLocation = $scope.getLocationByGeoLocator();
                        break;
                    case LOCATION_MODE.LIST:
                        var promiseSelectLocation = $q.when({targetState: STATE.RECENT_LOCATION_LIST});
                        break;
                    case LOCATION_MODE.MAP:
                        var promiseSelectLocation = $q.when({targetState: STATE.LOCATION_PICKER});
                        break;
                    default:
                        var promiseSelectLocation = $scope.getLocationByGeoLocator();
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
