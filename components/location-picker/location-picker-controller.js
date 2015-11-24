angular.module('ngModuleLocationPicker')
    .controller('ngControllerLocationPicker',
    [   '$scope',
        '$state',
        '$stateParams',
        'ngServiceContext',
        'ngServiceLocation',
        '$q',
        'STATE',
        'EVENT',
        function($scope, $state, $stateParams, ngServiceContext, ngServiceLocation, $q, STATE, EVENT) {

            //
            $scope.deferredLocationPicker = $q.defer();
            $scope.promiseLocationPicker = $scope.deferredLocationPicker.promise;

            $scope.initialPosition = undefined;
            $scope.markedPosition = undefined;
            $scope.detectedPosition = undefined;

            $scope.pickerLocation = undefined;


            $scope.pickLocation = function(pickedLocation) {

                // Store picked location
                ngServiceLocation.storeLocation(pickedLocation);

                $scope.deferredLocationPicker.resolve({targetState: STATE.TIMETABLE, position: pickedLocation});
            }

            $scope.pickerLocationChange = function(location) {
                $scope.pickerLocation = location;
            }

            $scope.compareToPickerLocationRadius = function(radius) {
                return ((angular.isDefined($scope.pickerLocation)) && ($scope.pickerLocation.radius == radius));
            }


            /*
             * Location picker
             */

            var stateParams = ngServiceContext.getStateParams();

            if (angular.isDefined(stateParams.initialPosition)) {
                $scope.initialPosition = stateParams.initialPosition;
                $scope.markedPosition = stateParams.markedPosition;
                $scope.detectedPosition = stateParams.detectedPosition;
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
                            var stateParams = ngServiceContext.getStateParams();

                            ngServiceContext.navigate(
                                data.targetState,
                                {
                                    detectedPosition: stateParams.detectedPosition,
                                    location: data.position
                                });

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
