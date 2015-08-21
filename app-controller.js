angular.module('ngAppGyorsFutar')
    .controller('ngControllerGyorsFutar',
        [   '$rootScope',
            '$scope',
            '$state',
            'STATE',
            'LOCATION_MODE',
            'EVENT',
            function($rootScope, $scope, $state, STATE, LOCATION_MODE, EVENT) {

                //
                $scope.successMessages = [];
                $scope.errorMessages = [];


                //

                $scope.closeSuccessMessage = function(index) {
                    $scope.successMessages.splice(index, 1);
                };

                $scope.closeErrorMessage = function(index) {
                    $scope.errorMessages.splice(index, 1);
                };


                /*
                 * Event handling
                 */

                // Success message event
                $scope.$on(EVENT.SUCCESS_MESSAGE, function(event, message) {
                    $scope.successMessages.unshift(message);

                });

                // Error message event
                $scope.$on(EVENT.ERROR_MESSAGE, function(event, message) {
                    $scope.errorMessages.unshift(message);
                });


                /*
                 * Successful state change event
                 */

                $rootScope.$on('$stateChangeSuccess',
                    function(event, toState, toParams, fromState, fromParams){

                        /*
                         * ANY -> ANY
                         */

                        // Clear success/error messages on state change
                        //$scope.successMessages = [];
                        //$scope.errorMessages = [];


                        /*
                         * -> INITIAL
                         */

                        // Redirect to location detection
                        if (toState.name == STATE.INITIAL) {

                            var locationDetectionParams = {
                                locationMode: LOCATION_MODE.AUTO,
                                initialPosition: undefined,
                                markedPosition: undefined
                            };

                            $state.go(STATE.LOCATION_DETECTION, locationDetectionParams);

                        }

                    });

            }
        ]
    );
