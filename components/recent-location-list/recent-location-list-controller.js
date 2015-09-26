angular.module('ngModuleRecentLocationList')
    .controller('ngControllerRecentLocationList',
    [   '$scope',
        '$state',
        '$stateParams',
        'ngServiceContext',
        '$q',
        '$localStorage',
        'STATE',
        'EVENT',
        function($scope, $state, $stateParams, ngServiceContext, $q, $localStorage, STATE, EVENT) {

            //
            $scope.deferredRecentLocationList = $q.defer();
            $scope.promiseRecentLocationList = $scope.deferredRecentLocationList.promise;

            $scope.actualPosition = undefined;
            $scope.recentLocations = undefined;


            $scope.showLocationList = function(position) {
                var recentLocationArray = [];

                // Load recent location list from local storage
                var storedLocations = $localStorage.recentLocations;

                // Calculate distances from initial position
                for (locationId in storedLocations) {
                    var actualLocation = storedLocations[locationId];

                    var fromLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                    var toLatLng = new google.maps.LatLng(actualLocation.coords.latitude, actualLocation.coords.longitude);

                    actualLocation.distance = google.maps.geometry.spherical.computeDistanceBetween(fromLatLng, toLatLng);

                    recentLocationArray.push(actualLocation);
                }

                // Sort by ascending distance
                recentLocationArray.sort(function(a, b) {return a.distance - b.distance});

                //
                $scope.recentLocations = recentLocationArray;
            };

            $scope.recentLocationClick = function(selectedLocation) {

                // Location selected
                $scope.deferredRecentLocationList.resolve({targetState: STATE.TIMETABLE, position: selectedLocation});

            };

            $scope.recentLocationMapClick = function(selectedLocation) {

                // Show location on map
                $scope.deferredRecentLocationList.resolve({targetState: STATE.LOCATION_PICKER, initialPosition: selectedLocation});

            };

            $scope.locationPickerClick = function() {

                // Pick location from map
                $scope.deferredRecentLocationList.resolve({targetState: STATE.LOCATION_PICKER});

            };


            /*
             * Recent location list
             */

            // List stored locations
            if ($localStorage.recentLocations != undefined) {

                var stateParams = ngServiceContext.getStateParams();

                if (angular.isDefined(stateParams.initialPosition)) {
                    $scope.actualPosition = stateParams.initialPosition;

                    $scope.showLocationList(stateParams.initialPosition);
                }

                else {
                    $scope.deferredRecentLocationList.reject('Missing initial position');
                }

            }

            // Redirect to Location Picker
            else {
                $scope.deferredRecentLocationList.resolve({targetState: STATE.LOCATION_PICKER});
            }


            /*
             * Result
             */

            $scope.promiseRecentLocationList.then(

                // Success
                function(data) {

                    switch (data.targetState) {

                        case STATE.TIMETABLE:
                            var stateParams = ngServiceContext.getStateParams();

                            ngServiceContext.navigate(
                                data.targetState,
                                {
                                    detectedPosition: stateParams.detectedPosition,
                                    location: data.position
                                });


                            break;

                        case STATE.LOCATION_PICKER:
                            var stateParams = ngServiceContext.getStateParams();

                            ngServiceContext.navigate(
                                data.targetState,
                                {
                                    detectedPosition: stateParams.detectedPosition,
                                    initialPosition: angular.isDefined(data.initialPosition) ? data.initialPosition : stateParams.initialPosition,
                                    markedPosition: stateParams.markedPosition
                                });

                            break;

                        default:
                            $scope.$emit(EVENT.ERROR_MESSAGE, 'recentLocationList: Invalid target state');

                    }

                },

                // Error
                function(error) {
                    var msg = 'recentLocationList: ' + error;
                    $scope.$emit(EVENT.ERROR_MESSAGE, msg);
                }

            );

        }
    ]
);
