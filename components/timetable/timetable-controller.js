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
            $scope.TIMETABLE = TIMETABLE;

            $scope.deferredTimetable = $q.defer();
            $scope.promiseTimetable = $scope.deferredTimetable.promise;

            $scope.geoPosition = undefined;
            $scope.baseTime = undefined;

            $scope.isBuilding = undefined;
            $scope.baseTimeDropdown = {
                isOpen: false,
                editedBaseTime: undefined,
                timePickerOptions: undefined,
                validateTimeout: undefined,
                minuteStepResetTimeout: undefined
            }
            $scope.timePickerOptions = undefined;
            $scope.timetableUpdateTimeout = undefined;
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

            $scope.onBaseTimeEditClick = function($event) {

                //
                $event.preventDefault();
                $event.stopPropagation();

                // Editable base time
                var editedBaseTime = angular.isDefined($scope.baseTime) ? new Date($scope.baseTime) : new Date();
                editedBaseTime.setSeconds(0);
                editedBaseTime.setMilliseconds(0);

                // Open the time picker dropdown
                $scope.baseTimeDropdown = {
                    isOpen: true,
                    editedBaseTime: editedBaseTime,
                    timePickerOptions: {
                        hourStep: 1,
                        minuteStep: 1,
                        showMeridian: false,
                        min: undefined
                    },
                    validateTimeout: undefined,
                    minuteStepResetTimeout: undefined
                }

            }

            $scope.onBaseTimeEditChange = function(editedBaseTime) {

                // Cancel timeouts
                if (angular.isDefined($scope.baseTimeDropdown.validateTimeout)) $timeout.cancel($scope.baseTimeDropdown.validateTimeout);
                if (angular.isDefined($scope.baseTimeDropdown.minuteStepResetTimeout)) $timeout.cancel($scope.baseTimeDropdown.minuteStepResetTimeout);


                /*
                 * Invalid base time
                 */

                if (!angular.isDate(editedBaseTime)) {

                    // Delayed validation
                    $scope.baseTimeDropdown.validateTimeout = $timeout(
                        function() {
                            $scope.baseTimeDropdown.editedBaseTime = angular.isDefined($scope.baseTime) ? $scope.baseTime : new Date();
                        },
                        TIMETABLE.BASE_TIME_EDIT_VALIDATION_DELAY);

                    // minuteStep reset
                    $scope.baseTimeDropdown.timePickerOptions.minuteStep = 1;

                }


                /*
                 * Valid base time
                 */

                else {

                    // Update minuteStep

                    // minuteStep 1 - Reset
                    if (   ($scope.baseTimeDropdown.timePickerOptions.minuteStep > 1)
                        && ((editedBaseTime.getMinutes() % $scope.baseTimeDropdown.timePickerOptions.minuteStep) > 0)) {

                        $scope.baseTimeDropdown.timePickerOptions.minuteStep = 1;
                    }

                    // minuteStep 5 - Set
                    else if (      ($scope.baseTimeDropdown.timePickerOptions.minuteStep == 1)
                                && ((editedBaseTime.getMinutes() % 5) == 0)) {

                        $scope.baseTimeDropdown.timePickerOptions.minuteStep = 5;
                    }

                    // minuteStep 10 - Set
                    else if (      ($scope.baseTimeDropdown.timePickerOptions.minuteStep == 5)
                                && ((editedBaseTime.getMinutes() % 10) == 0)) {

                        $scope.baseTimeDropdown.timePickerOptions.minuteStep = 10;
                    }

                    // Delayed minuteStep reset
                    if ($scope.baseTimeDropdown.timePickerOptions.minuteStep > 1) {
                        $scope.baseTimeDropdown.minuteStepResetTimeout = $timeout(
                            function() {
                                $scope.baseTimeDropdown.timePickerOptions.minuteStep = 1;
                            },
                            TIMETABLE.BASE_TIME_EDIT_MINSTEP_RESET_DELAY);
                    }

                }

            }

            $scope.onBaseTimeEditOk = function(location, editedBaseTime) {

                // Valid base time
                if (angular.isDate(editedBaseTime)) {

                    // Reload timetable
                    $scope.deferredTimetable.resolve({
                        targetState: STATE.TIMETABLE,
                        location: location,
                        baseTime: editedBaseTime
                    });

                }

                // Close time picker dropdown
                $scope.baseTimeDropdown.isOpen = false;

            }

            $scope.onBaseTimeEditCancel = function() {

                // Close time picker dropdown
                $scope.baseTimeDropdown.isOpen = false;

            }

            $scope.onBaseTimeResetClick = function(location) {

                // Reload timetable
                $scope.deferredTimetable.resolve({
                    targetState: STATE.TIMETABLE,
                    location: location,
                    baseTime: undefined
                });

            }

            $scope.buildTimetable = function(location, baseTime) {
                $scope.isBuilding = true;

                // baseTime validation/correction
                if (angular.isDate(baseTime)) {
                    var nowMinutes = new Date();
                    var baseTimeMinutes = new Date(baseTime);
                    nowMinutes.setSeconds(0);
                    nowMinutes.setMilliseconds(0);
                    baseTimeMinutes.setSeconds(0);
                    baseTimeMinutes.setMilliseconds(0);

                    if (nowMinutes.getTime() == baseTimeMinutes.getTime()) baseTime = undefined;
                }

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

                        case STATE.TIMETABLE:

                            ngServiceContext.navigate(
                                data.targetState,
                                {
                                    location: data.location,
                                    baseTime: data.baseTime
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

