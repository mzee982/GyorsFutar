angular.module('ngModuleMap')
    .controller('ngControllerMap',
    [   '$scope',
        '$state',
        '$stateParams',
        '$q',
        '$timeout',
        'ngServiceMap',
        'ngServiceLocation',
        'ngServiceContext',
        'STATE',
        'EVENT',
        'MAP',
        'LOCATION',
        function($scope, $state, $stateParams, $q, $timeout, ngServiceMap, ngServiceLocation, ngServiceContext, STATE, EVENT, MAP, LOCATION) {

            //
            $scope.deferredMap = $q.defer();
            $scope.promiseMap = $scope.deferredMap.promise;

            $scope.trip = undefined;
            $scope.baseTime = undefined;
            $scope.mapUpdateTimeout = undefined;
            $scope.isBuilding = undefined;
            $scope.mapPresentation = undefined;
            $scope.recompileAccessor = {};


            $scope.scheduleMapUpdate = function() {

                // Clear previous schedule
                $scope.clearMapUpdate();

                // Update Map
                $scope.mapUpdateTimeout = $timeout(function() {
                        $scope.buildMap($scope.trip, $scope.baseTime);
                    },
                    MAP.AUTO_UPDATE_DELAY);

            }

            $scope.clearMapUpdate = function() {
                if (angular.isDefined($scope.mapUpdateTimeout)) {
                    $timeout.cancel($scope.mapUpdateTimeout);
                    $scope.mapUpdateTimeout = undefined;
                }
            }

            $scope.onMapRefreshClick = function() {
                $scope.buildMap($scope.trip, $scope.baseTime);
            }

            $scope.onStopMarkerClick = function(marker, eventName, markerModel) {
                var stopLocation = undefined;
                var baseTime = undefined;

                // Format location
                var promiseFormatLocation = ngServiceLocation.formatLocation(markerModel.coords.latitude, markerModel.coords.longitude, LOCATION.ACCURACY_MIN_SEARCH_RADIUS);

                promiseFormatLocation.then(

                    // Success
                    function(location) {
                        stopLocation = location;

                        if (markerModel.isCurrent) {
                            baseTime = $scope.baseTime;
                        }
                        else if (markerModel.isSubsequent) {
                            baseTime = markerModel.stopTime;
                        }
                        else {
                            baseTime = markerModel.stopTime;
                        }

                        $scope.deferredMap.resolve({targetState: STATE.TIMETABLE, stopLocation: stopLocation, baseTime: baseTime});
                    },

                    // Error
                    function(error) {
                        $scope.deferredMap.reject('formatLocation failed');
                    }

                );

            }

            $scope.onMapResized = function() {

                // Trigger map resize event
                if ((angular.isDefined($scope.mapPresentation)) && (angular.isDefined($scope.mapPresentation.map.control.getGMap))) {
                    var map = $scope.mapPresentation.map.control.getGMap();
                    google.maps.event.trigger(map, 'resize');
                }

            }

            $scope.onMapZoomChanged = function(map, eventName, arguments) {

                if (angular.isDefined($scope.mapPresentation)) {
                    $scope.mapPresentation = ngServiceMap.handleMapZoomChange($scope.mapPresentation);

                    if ($scope.mapPresentation.needToRecompile) $scope.doRecompile();
                }

            }

            $scope.doRecompile = function() {

                // Call the directive's function
                if (angular.isDefined($scope.recompileAccessor.recompile)) {
                    $scope.recompileAccessor.recompile();
                }

            }

            $scope.buildMap = function(trip, baseTime) {
                $scope.isBuilding = true;

                var promiseBuildMap = ngServiceMap.buildMap(trip, baseTime, $scope.onMapZoomChanged, $scope.onStopMarkerClick, $scope.mapPresentation);

                promiseBuildMap.then(

                    // Success
                    function(mapPresentation) {
                        $scope.mapPresentation = mapPresentation;
                        $scope.isBuilding = false;

                        if (mapPresentation.needToRecompile) $scope.doRecompile();

                        // Update map regularly
                        $scope.scheduleMapUpdate();
                    },

                    // Error
                    function(message) {
                        $scope.mapPresentation = undefined;
                        $scope.isBuilding = false;

                        $scope.deferredMap.reject(message);
                    }

                );

            }


            /*
             * Build map
             */

            var stateParams = ngServiceContext.getStateParams();

            if (angular.isDefined(stateParams.trip)) {
                $scope.trip = stateParams.trip;
                $scope.baseTime = stateParams.baseTime;

                $scope.buildMap($scope.trip, $scope.baseTime);
            }

            else {
                $scope.deferredMap.reject('Missing trip');
            }


            /*
             * Result
             */

            $scope.promiseMap.then(

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

                        default:
                            $scope.$emit(EVENT.ERROR_MESSAGE, 'map: Invalid target state');

                    }

                },

                // Error
                function(error) {
                    var msg = 'map: ' + error;
                    $scope.$emit(EVENT.ERROR_MESSAGE, msg);
                }

            );


            /*
             * Event handling
             */

            // Adjust height event
            $scope.$on(EVENT.ADJUST_HEIGHT, function(event) {
                $scope.onMapResized();
            });


            /*
             * Clean-up
             */

            $scope.$on('$destroy', function() {

                $scope.clearMapUpdate();

            });

        }
    ]
);
