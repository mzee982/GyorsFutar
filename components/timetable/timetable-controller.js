angular.module('ngModuleTimetable')
    .controller('ngControllerTimetable',
    [   '$scope',
        '$state',
        '$stateParams',
        '$q',
        '$timeout',
        'ngServiceTimetable',
        'ngServiceContext',
        'STATE',
        'EVENT',
        'LOCATION_MODE',
        'TIMETABLE',
        function($scope, $state, $stateParams, $q, $timeout, ngServiceTimetable, ngServiceContext, STATE, EVENT, LOCATION_MODE, TIMETABLE) {

            //
            $scope.LOCATION_MODE = LOCATION_MODE;

            $scope.deferredTimetable = $q.defer();
            $scope.promiseTimetable = $scope.deferredTimetable.promise;

            $scope.geoPosition = undefined;
            $scope.baseTime = undefined;

            $scope.timetableUpdateTimeout = undefined;
            $scope.isBuilding = undefined;
            $scope.timetablePresentation = undefined;


            $scope.scheduleTimetableUpdate = function() {

                // Clear previous schedule
                $scope.clearTimetableUpdate();

                // Update Timetable
                $scope.timetableUpdateTimeout = $timeout(function() {
                        $scope.buildTimetable($scope.geoPosition, $scope.baseTime);
                    },
                    TIMETABLE.AUTO_UPDATE_DELAY);

            }

            $scope.clearTimetableUpdate = function() {
                if (angular.isDefined($scope.timetableUpdateTimeout)) {
                    $timeout.cancel($scope.timetableUpdateTimeout);
                    $scope.timetableUpdateTimeout = undefined;
                }
            }

            $scope.onLocationRefreshClick = function(mode) {
                $scope.deferredTimetable.resolve({
                        targetState: STATE.LOCATION_DETECTION,
                        locationMode: mode,
                        initialPosition: $scope.geoPosition,
                        markedPosition: undefined
                    });
            }

            $scope.onTimetableRefreshClick = function() {
                $scope.buildTimetable($scope.geoPosition, $scope.baseTime);
            }

            $scope.onStopLocationClick = function(stopTime) {
                $scope.deferredTimetable.resolve({
                    targetState: STATE.LOCATION_DETECTION,
                    locationMode: LOCATION_MODE.MAP,
                    initialPosition: $scope.geoPosition,
                    markedPosition: stopTime
                });
            }

            $scope.onStopTimeClick = function(stopTime, baseTime) {
                $scope.deferredTimetable.resolve({
                    targetState: STATE.TRIP,
                    tripId: stopTime.tripId,
                    stopId: stopTime.stopId,
                    baseTime: baseTime
                });
            }

            $scope.onTripClick = function(stopTime, routes, baseTime) {
                var routeIds = [];

                if (angular.isArray(routes)) {
                    for (var routeIndex = 0; routeIndex < routes.length; routeIndex++) {
                        routeIds.push(routes[routeIndex].id);
                    }
                }

                else {
                    routeIds.push(routes.id);
                }

                $scope.deferredTimetable.resolve({
                    targetState: STATE.SCHEDULE,
                    stopId: stopTime.stopId,
                    routeIds: routeIds,
                    baseTime: baseTime
                });
            }

            $scope.onRouteGroupHeaderClick = function(event, routeGroup) {

                if (routeGroup.isGroup) {
                    routeGroup.isExpanded=!routeGroup.isExpanded
                }

                else {
                    event.preventDefault();
                }

            }

            $scope.buildTimetable = function(location, baseTime) {
                $scope.isBuilding = true;

                // baseTime validation/correction
                if (angular.isDate(baseTime) && (baseTime <= new Date())) baseTime = undefined;

                var promiseBuildTimetable = ngServiceTimetable.buildTimetable(location, baseTime, $scope.timetablePresentation);

                // Show timetable
                promiseBuildTimetable.then(

                    // Done
                    function(timetablePresentation) {
                        $scope.timetablePresentation = timetablePresentation;
                        $scope.baseTime = timetablePresentation.baseTime;
                        $scope.isBuilding = false;

                        // Update timetable regularly
                        $scope.scheduleTimetableUpdate();
                    },

                    // Fail
                    function(message) {
                        $scope.timetablePresentation = undefined;
                        $scope.isBuilding = false;

                        $scope.deferredTimetable.reject(message);
                    }

                );

            }


            /*
             * Build timetable
             */

            var stateParams = ngServiceContext.getStateParams();

            if (angular.isDefined(stateParams.location)) {
                $scope.geoPosition = stateParams.location;
                $scope.baseTime = stateParams.baseTime;

                $scope.buildTimetable($scope.geoPosition, $scope.baseTime);
            }

            else {
                $scope.deferredTimetable.reject('Missing position');
            }


            /*
             * Result
             */

            $scope.promiseTimetable.then(

                // Success
                function(data) {

                    switch (data.targetState) {

                        case STATE.LOCATION_DETECTION:

                            ngServiceContext.navigate(
                                data.targetState,
                                {
                                    locationMode: data.locationMode,
                                    initialPosition: data.initialPosition,
                                    markedPosition: data.markedPosition
                                });

                            break;

                        case STATE.TRIP:

                            ngServiceContext.navigate(
                                data.targetState,
                                {
                                    tripId: data.tripId,
                                    stopId: data.stopId,
                                    baseTime: data.baseTime
                                });

                            break;

                        case STATE.SCHEDULE:

                            ngServiceContext.navigate(
                                data.targetState,
                                {
                                    stopId: data.stopId,
                                    routeIds: data.routeIds,
                                    baseTime: data.baseTime
                                }
                            );

                            break;

                        default:
                            $scope.$emit(EVENT.ERROR_MESSAGE, 'timetable: Invalid target state');

                    }

                },

                // Error
                function(error) {
                    var msg = 'timetable: ' + error;
                    $scope.$emit(EVENT.ERROR_MESSAGE, msg);
                }

            );


            /*
             * Clean-up
             */

            $scope.$on('$destroy', function() {

                $scope.clearTimetableUpdate();

            });

        }
    ]
);

