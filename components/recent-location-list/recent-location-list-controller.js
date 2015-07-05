angular.module('ngModuleRecentLocationList')
    .controller('ngControllerRecentLocationList',
    [   '$scope',
        '$state',
        '$stateParams',
        '$q',
        '$localStorage',
        'STATE',
        'EVENT',
        function($scope, $state, $stateParams, $q, $localStorage, STATE, EVENT) {

            //
            $scope.deferredRecentLocationList = $q.defer();
            $scope.promiseRecentLocationList = $scope.deferredRecentLocationList.promise;

            $scope.recentLocations = undefined;


            $scope.showLocationList = function(position, callback) {
                var storedLocations = $localStorage.recentLocations;
                var recentLocationArray = [];

                for (locationId in storedLocations) {
                    var actualLocation = storedLocations[locationId];

                    // Calculate distance
                    var fromLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                    var toLatLng = new google.maps.LatLng(actualLocation.coords.latitude, actualLocation.coords.longitude);

                    actualLocation.distance = google.maps.geometry.spherical.computeDistanceBetween(fromLatLng, toLatLng);

                    // Add callback function
                    actualLocation.callback = function() {callback(this);};

                    recentLocationArray.push(actualLocation);
                }

                // Sort by ascending distance
                recentLocationArray.sort(function(a, b) {return a.distance - b.distance});

                // Last item is the Location Picker
                var locationPickerItem = {callback: function() {callback();}};
                recentLocationArray.push(locationPickerItem);

                //
                $scope.recentLocations = recentLocationArray;
            };


            /*
             * Recent location list
             */

            // Stored locations
            if ($localStorage.locations != undefined) {

                if (angular.isDefined($stateParams.initialPosition)) {

                    $scope.showLocationList(
                        $stateParams.initialPosition,
                        function(selectedPosition) {

                            // Location selected
                            if (selectedPosition != undefined) {
                                $scope.deferredRecentLocationList.resolve({targetState: STATE.TIMETABLE, position: selectedPosition});
                            }

                            // Location Picker
                            else {
                                $scope.deferredRecentLocationList.resolve({targetState: STATE.LOCATION_PICKER});
                            }

                        }
                    );

                }

                else {
                    $scope.deferredRecentLocationList.reject('Missing initial position');
                }

            }

            // Location Picker
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
                            var timetableParams = {
                                location: data.position
                            };

                            $state.go(data.targetState, timetableParams);

                            break;

                        case STATE.LOCATION_PICKER:
                            var locationPickerParams = {
                                initialPosition: $stateParams.initialPosition,
                                markedPosition: $stateParams.markedPosition
                            };

                            $state.go(data.targetState, locationPickerParams);

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