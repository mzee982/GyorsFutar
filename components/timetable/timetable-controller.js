angular.module('ngModuleTimetable')
    .controller('ngControllerTimetable',
    [   '$scope',
        '$state',
        '$stateParams',
        '$q',
        '$timeout',
        'ngServiceTimetable',
        'STATE',
        'EVENT',
        'LOCATION_MODE',
        'TIMETABLE',
        function($scope, $state, $stateParams, $q, $timeout, ngServiceTimetable, STATE, EVENT, LOCATION_MODE, TIMETABLE) {

            //
            $scope.LOCATION_MODE = LOCATION_MODE;

            $scope.deferredTimetable = $q.defer();
            $scope.promiseTimetable = $scope.deferredTimetable.promise;

            $scope.geoPosition = undefined;
            $scope.timetableUpdateTimeout = undefined;
            $scope.isBuilding = undefined;
            $scope.timetableBuildTime = undefined;
            $scope.timetablePresentation = undefined;


            $scope.scheduleTimetableUpdate = function() {

                // Clear previous schedule
                $scope.clearTimetableUpdate();

                // Update Timetable
                $scope.timetableUpdateTimeout = $timeout(function() {
                        $scope.buildTimetable($scope.geoPosition);
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
                $scope.buildTimetable($scope.geoPosition);
            }

            $scope.onStopLocationClick = function(stopTime) {
                $scope.deferredTimetable.resolve({
                    targetState: STATE.LOCATION_DETECTION,
                    locationMode: LOCATION_MODE.MAP,
                    initialPosition: $scope.geoPosition,
                    markedPosition: stopTime
                });
            }

            $scope.buildTimetable = function(location) {
                $scope.isBuilding = true;

                var promiseBuildTimetable = ngServiceTimetable.buildTimetable(location, $scope.timetablePresentation);

                // Show timetable
                promiseBuildTimetable.then(

                    // Done
                    function(timetablePresentation) {
                        $scope.timetableBuildTime = new Date();
                        $scope.timetablePresentation = timetablePresentation;
                        $scope.isBuilding = false;

                        // Update timetable regularly
                        $scope.scheduleTimetableUpdate();
                    },

                    // Fail
                    function(message) {
                        $scope.timetableBuildTime = undefined;
                        $scope.timetablePresentation = undefined;
                        $scope.isBuilding = false;

                        $scope.deferredTimetable.reject(message);
                    }

                );

            }


            /*
             * Build timetable
             */

            if (angular.isDefined($stateParams.location)) {
                $scope.geoPosition = $stateParams.location;
                $scope.buildTimetable($scope.geoPosition);
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

                            var locationDetectionParams = {
                                locationMode: data.locationMode,
                                initialPosition: data.initialPosition,
                                markedPosition: data.markedPosition
                            };

                            $state.go(STATE.LOCATION_DETECTION, locationDetectionParams);

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

