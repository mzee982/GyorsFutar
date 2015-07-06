angular.module('ngModuleLocationPicker')
    .controller('ngControllerLocationPicker',
    [   '$scope',
        '$state',
        '$stateParams',
        '$q',
        '$localStorage',
        'STATE',
        'EVENT',
        'LOCATION_PICKER',
        function($scope, $state, $stateParams, $q, $localStorage, STATE, EVENT, LOCATION_PICKER) {

            //
            $scope.deferredLocationPicker = $q.defer();
            $scope.promiseLocationPicker = $scope.deferredLocationPicker.promise;

            $scope.initialPosition = undefined;
            $scope.markedPosition = undefined;


            $scope.pickPosition = function(pickedPosition) {
                $scope.deferredLocationPicker.resolve({targetState: STATE.TIMETABLE, position: pickedPosition});
            }

            $scope.storeLocation = function(location) {
                var actualStoreTimestamp = new Date().getTime();
                var defaultStoreTimestamp = new Date(0).getTime();
                var locationKey = location.formattedAddress;

                // Read storage
                var storedLocations = $localStorage.recentLocations;

                // Initialize if not exists yet
                if (angular.isUndefined(storedLocations)) {
                    storedLocations = {};
                }

                // Add / Overwrite
                location.storeTimestamp = actualStoreTimestamp;
                storedLocations[locationKey] = location;

                // To array
                var storedLocationArray = [];
                angular.forEach(
                    storedLocations,
                    function(value, key, obj) {
                        if (angular.isUndefined(value.storeTimestamp)) value.storeTimestamp = defaultStoreTimestamp;
                        this.push(value);
                    },
                    storedLocationArray);

                // Sort by descending timestamp
                storedLocationArray.sort(function(a, b) {return b.storeTimestamp - a.storeTimestamp;});

                // Store only the most recent locations
                storedLocationArray = storedLocationArray.slice(0, LOCATION_PICKER.RECENT_LOCATION_COUNT);

                // To object
                storedLocations = {};
                angular.forEach(storedLocationArray, function(value, key, obj) {this[value.formattedAddress] = value;}, storedLocations);

                // Write storage
                $localStorage.recentLocations = storedLocations;

            }


            /*
             * Location picker
             */

            if (angular.isDefined($stateParams.initialPosition)) {
                $scope.initialPosition = $stateParams.initialPosition;
                $scope.markedPosition = $stateParams.markedPosition;
            }

            else {
                $scope.deferredLocationPicker.reject('Missing initial position');
            }


            /*
             * Result
             */

            $scope.promiseLocationPicker.then(

                // Success
                function(data) {

                    switch (data.targetState) {

                        case STATE.TIMETABLE:
                            var timetableParams = {
                                location: data.position
                            };

                            $state.go(data.targetState, timetableParams);

                            break;

                        default:
                            $scope.$emit(EVENT.ERROR_MESSAGE, 'locationPicker: Invalid target state');

                    }

                },

                // Error
                function(error) {
                    var msg = 'locationPicker: ' + error;
                    $scope.$emit(EVENT.ERROR_MESSAGE, msg);
                }

            );

        }
    ]
);
