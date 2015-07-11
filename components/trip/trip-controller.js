angular.module('ngModuleTrip')
    .controller('ngControllerTrip',
    [   '$scope',
        '$state',
        '$stateParams',
        '$q',
        '$timeout',
        'ngServiceLocation',
        'ngServiceTrip',
        'STATE',
        'EVENT',
        'LOCATION',
        'TRIP',
        function($scope, $state, $stateParams, $q, $timeout, ngServiceLocation, ngServiceTrip, STATE, EVENT, LOCATION, TRIP) {

            //
            $scope.deferredTrip = $q.defer();
            $scope.promiseTrip = $scope.deferredTrip.promise;

            $scope.tripId = undefined;
            $scope.stopId = undefined;
            $scope.tripUpdateTimeout = undefined;
            $scope.isBuilding = undefined;
            $scope.tripPresentation = undefined;


            $scope.scheduleTripUpdate = function() {

                // Clear previous schedule
                $scope.clearTripUpdate();

                // Update Trip
                $scope.tripUpdateTimeout = $timeout(function() {
                        $scope.buildTrip($scope.tripId, $scope.stopId);
                    },
                    TRIP.AUTO_UPDATE_DELAY);

            }

            $scope.clearTripUpdate = function() {
                if (angular.isDefined($scope.tripUpdateTimeout)) {
                    $timeout.cancel($scope.tripUpdateTimeout);
                    $scope.tripUpdateTimeout = undefined;
                }
            }

            $scope.onTripRefreshClick = function() {
                $scope.buildTrip($scope.tripId, $scope.stopId);
            }

            $scope.buildTrip = function(id, currentStopId) {
                $scope.isBuilding = true;

                var promiseBuildTrip = ngServiceTrip.buildTrip(id, currentStopId);

                promiseBuildTrip.then(

                    // Success
                    function(tripPresentation) {
                        $scope.tripPresentation = tripPresentation;
                        $scope.isBuilding = false;

                        // Update trip regularly
                        $scope.scheduleTripUpdate();
                    },

                    // Error
                    function(message) {
                        $scope.tripPresentation = undefined;
                        $scope.isBuilding = false;

                        $scope.deferredTrip.reject(message);
                    }

                );

            }

            $scope.onStopClick = function(stopTime) {
                var stopLocation = undefined;
                var baseTime = undefined;

                // Format location
                var promiseFormatLocation = ngServiceLocation.formatLocation(stopTime.stopLat, stopTime.stopLon, LOCATION.ACCURACY_MIN_SEARCH_RADIUS);

                promiseFormatLocation.then(

                    // Success
                    function(location) {
                        stopLocation = location;

                        if (stopTime.isSubsequent) baseTime = stopTime.stopTime;

                        $scope.deferredTrip.resolve({targetState: STATE.TIMETABLE, stopLocation: stopLocation, baseTime: baseTime});
                    },

                    // Error
                    function(error) {
                        $scope.deferredTrip.reject('formatLocation failed');
                    }

                );

            }


            /*
             * Build trip
             */

            if (angular.isDefined($stateParams.tripId)) {
                $scope.tripId = $stateParams.tripId;
                $scope.stopId = $stateParams.stopId;

                $scope.buildTrip($scope.tripId, $scope.stopId);
            }

            else {
                $scope.deferredTrip.reject('Missing tripId');
            }


            /*
             * Result
             */

            $scope.promiseTrip.then(

                // Success
                function(data) {

                    switch (data.targetState) {

                        case STATE.TIMETABLE:

                            var timetableParams = {
                                location: data.stopLocation,
                                baseTime: data.baseTime
                            };

                            $state.go(data.targetState, timetableParams);

                            break;

                        default:
                            $scope.$emit(EVENT.ERROR_MESSAGE, 'trip: Invalid target state');

                    }

                },

                // Error
                function(error) {
                    var msg = 'trip: ' + error;
                    $scope.$emit(EVENT.ERROR_MESSAGE, msg);
                }

            );


            /*
             * Clean-up
             */

            $scope.$on('$destroy', function() {

                $scope.clearTripUpdate();

            });

        }
    ]
);
