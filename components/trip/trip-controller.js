angular.module('ngModuleTrip')
    .controller('ngControllerTrip',
    [   '$scope',
        '$state',
        '$stateParams',
        '$q',
        '$timeout',
        'ngServiceLocation',
        'ngServiceTrip',
        'ngServiceContext',
        'STATE',
        'EVENT',
        'LOCATION',
        'TRIP',
        function($scope, $state, $stateParams, $q, $timeout, ngServiceLocation, ngServiceTrip, ngServiceContext, STATE, EVENT, LOCATION, TRIP) {

            //
            $scope.deferredTrip = $q.defer();
            $scope.promiseTrip = $scope.deferredTrip.promise;

            $scope.tripId = undefined;
            $scope.stopId = undefined;
            $scope.baseTime = undefined;
            $scope.tripUpdateTimeout = undefined;
            $scope.isBuilding = undefined;
            $scope.tripPresentation = undefined;


            $scope.scheduleTripUpdate = function() {

                // Clear previous schedule
                $scope.clearTripUpdate();

                // Update Trip
                $scope.tripUpdateTimeout = $timeout(function() {
                        $scope.buildTrip($scope.tripId, $scope.stopId, $scope.baseTime);
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
                $scope.buildTrip($scope.tripId, $scope.stopId, $scope.baseTime);
            }

            $scope.onStopClick = function(stopTime, baseTime) {
                var stopLocation = undefined;

                // Format location
                var promiseFormatLocation = ngServiceLocation.formatLocation(stopTime.stopLat, stopTime.stopLon, LOCATION.ACCURACY_MIN_SEARCH_RADIUS);

                promiseFormatLocation.then(

                    // Success
                    function(location) {
                        stopLocation = location;

                        if (stopTime.isCurrent) {
                            baseTime = baseTime;
                        }
                        else if (stopTime.isSubsequent) {
                            baseTime = stopTime.stopTime;
                        }
                        else {
                            baseTime = stopTime.stopTime;
                        }

                        $scope.deferredTrip.resolve({targetState: STATE.TIMETABLE, stopLocation: stopLocation, baseTime: baseTime});
                    },

                    // Error
                    function(error) {
                        $scope.deferredTrip.reject('formatLocation failed');
                    }

                );

            }

            $scope.onHeaderClick = function(tripId, stopId, baseTime) {
/*
                var paramTrip = {
                    tripHeadsign: trip.tripHeadsign,
                    routeName: trip.routeName,
                    routeColor: trip.routeColor,
                    routeTextColor: trip.routeTextColor,
                    polyline: trip.tripPolylinePoints,
                    stops: [],
                    vehicle: undefined
                };

                // Stops
                for (var stopTimeIndex = 0; stopTimeIndex < trip.stopTimes.length; stopTimeIndex++) {
                    var actualStopTime = trip.stopTimes[stopTimeIndex];

                    var targetStop = {
                        id: actualStopTime.stopId,
                        name: actualStopTime.stopName,
                        lat: actualStopTime.stopLat,
                        lon: actualStopTime.stopLon,
                        direction: actualStopTime.stopDirection,
                        stopTime: actualStopTime.stopTime,
                        stopTimeString: actualStopTime.stopTimeString,
                        isCurrent: actualStopTime.isCurrent,
                        isSubsequent: actualStopTime.isSubsequent
                    };

                    // Vehicle

                    if (angular.isDefined(actualStopTime.vehicle)) {
                        var actualVehicle = actualStopTime.vehicle;

                        var targetVehicle = {
                            id: actualVehicle.id,
                            bearing: actualVehicle.bearing,
                            lat: actualVehicle.lat,
                            lon: actualVehicle.lon
                        }

                        paramTrip.vehicle = targetVehicle;
                    }

                    paramTrip.stops.push(targetStop);
                }
*/

                var paramTrip = {
                    tripId: tripId,
                    stopId: stopId
                };

                $scope.deferredTrip.resolve({targetState: STATE.MAP, trip: paramTrip, baseTime: baseTime});

            }

            $scope.buildTrip = function(id, currentStopId, baseTime) {
                $scope.isBuilding = true;

                var promiseBuildTrip = ngServiceTrip.buildTrip(id, currentStopId, baseTime);

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


            /*
             * Build trip
             */

            var stateParams = ngServiceContext.getStateParams();

            if (angular.isDefined(stateParams.tripId)) {
                $scope.tripId = stateParams.tripId;
                $scope.stopId = stateParams.stopId;
                $scope.baseTime = stateParams.baseTime;

                $scope.buildTrip($scope.tripId, $scope.stopId, $scope.baseTime);
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

                            ngServiceContext.navigate(
                                data.targetState,
                                {
                                    location: data.stopLocation,
                                    baseTime: data.baseTime
                                }
                            );

                            break;

                        case STATE.MAP:

                            ngServiceContext.navigate(
                                data.targetState,
                                {
                                    trip: data.trip,
                                    baseTime: data.baseTime
                                });

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
