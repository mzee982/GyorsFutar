angular.module('ngModuleSchedule')
    .controller('ngControllerSchedule',
    [   '$scope',
        '$state',
        '$stateParams',
        '$q',
        '$timeout',
        'ngServiceLocation',
        'ngServiceSchedule',
        'ngServiceContext',
        'STATE',
        'EVENT',
        'SCHEDULE',
        'LOCATION',
        function($scope, $state, $stateParams, $q, $timeout, ngServiceLocation, ngServiceSchedule, ngServiceContext, STATE, EVENT, SCHEDULE, LOCATION) {

            //
            $scope.deferredSchedule = $q.defer();
            $scope.promiseSchedule = $scope.deferredSchedule.promise;

            $scope.stopId = undefined;
            $scope.routeIds = undefined;
            $scope.baseTime = undefined;

            $scope.scheduleUpdateTimeout = undefined;
            $scope.isBuilding = undefined;
            $scope.schedulePresentation = undefined;


            $scope.scheduleScheduleUpdate = function() {

                // Clear previous schedule
                $scope.clearScheduleUpdate();

                // Update Schedule
                $scope.scheduleUpdateTimeout = $timeout(function() {
                        $scope.buildSchedule($scope.stopId, $scope.routeIds, $scope.baseTime);
                    },
                    SCHEDULE.AUTO_UPDATE_DELAY);

            }

            $scope.clearScheduleUpdate = function() {
                if (angular.isDefined($scope.scheduleUpdateTimeout)) {
                    $timeout.cancel($scope.scheduleUpdateTimeout);
                    $scope.scheduleUpdateTimeout = undefined;
                }
            }

            $scope.filterStopTimes = function(value, index, array) {
                return ($scope.schedulePresentation.visibleStopTimeLowerIndex <= index) && (index <= $scope.schedulePresentation.visibleStopTimeUpperIndex);
            }

            $scope.onScheduleRefreshClick = function() {
                $scope.buildSchedule($scope.stopId, $scope.routeIds, $scope.baseTime);
            }

            $scope.onStopTimeClick = function(stopTime, baseTime) {
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

                        $scope.deferredSchedule.resolve({targetState: STATE.TIMETABLE, stopLocation: stopLocation, baseTime: baseTime});
                    },

                    // Error
                    function(error) {
                        $scope.deferredSchedule.reject('formatLocation failed');
                    }

                );

            }

            $scope.onStopTimeMoreOlderClick = function() {
                var visibleCount = $scope.schedulePresentation.visibleStopTimeUpperIndex - $scope.schedulePresentation.visibleStopTimeLowerIndex;

                $scope.schedulePresentation.visibleStopTimeLowerIndex = Math.max($scope.schedulePresentation.visibleStopTimeLowerIndex - visibleCount, 0);
            }

            $scope.onStopTimeMoreNewerClick = function() {
                var visibleCount = $scope.schedulePresentation.visibleStopTimeUpperIndex - $scope.schedulePresentation.visibleStopTimeLowerIndex;

                $scope.schedulePresentation.visibleStopTimeUpperIndex = Math.min($scope.schedulePresentation.visibleStopTimeUpperIndex + visibleCount, $scope.schedulePresentation.stopTimes.length);
            }

            $scope.buildSchedule = function(stopId, routeIds, baseTime) {
                $scope.isBuilding = true;

                var promiseBuildSchedule = ngServiceSchedule.buildSchedule(stopId, routeIds, baseTime, $scope.schedulePresentation);

                promiseBuildSchedule.then(

                    // Success
                    function(schedulePresentation) {
                        $scope.schedulePresentation = schedulePresentation;
                        $scope.isBuilding = false;

                        // Update schedule regularly
                        $scope.scheduleScheduleUpdate();
                    },

                    // Error
                    function(message) {
                        $scope.schedulePresentation = undefined;
                        $scope.isBuilding = false;

                        $scope.deferredSchedule.reject(message);
                    }

                );

            }


            /*
             * Build schedule
             */

            var stateParams = ngServiceContext.getStateParams();

            if (angular.isDefined(stateParams.stopId)) {
                $scope.stopId = stateParams.stopId;
                $scope.routeIds = stateParams.routeIds;
                $scope.baseTime = stateParams.baseTime;

                $scope.buildSchedule($scope.stopId, $scope.routeIds, $scope.baseTime);
            }

            else {
                $scope.deferredSchedule.reject('Missing stopId');
            }


            /*
             * Result
             */

            $scope.promiseSchedule.then(

                // Success
                function(data) {

                    switch (data.targetState) {

                        case STATE.TIMETABLE:

                            ngServiceContext.navigate(
                                data.targetState,
                                {
                                    location: data.stopLocation,
                                    baseTime: data.baseTime
                                });

                            break;

                        default:
                            $scope.$emit(EVENT.ERROR_MESSAGE, 'schedule: Invalid target state');

                    }

                },

                // Error
                function(error) {
                    var msg = 'schedule: ' + error;
                    $scope.$emit(EVENT.ERROR_MESSAGE, msg);
                }

            );


            /*
             * Clean-up
             */

            $scope.$on('$destroy', function() {

                $scope.clearScheduleUpdate();

            });

        }
    ]
);
