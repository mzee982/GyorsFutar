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
                $scope.successMessage = undefined;
                $scope.errorMessage = undefined;


                /*
                 * Event handling
                 */

                // Success message event
                $scope.$on(EVENT.SUCCESS_MESSAGE, function(event, message) {
                    $scope.successMessage = message;
                });

                // Error message event
                $scope.$on(EVENT.ERROR_MESSAGE, function(event, message) {
                    $scope.errorMessage = message;
                });

                // Redirect to location detection
                $rootScope.$on('$stateChangeSuccess',
                    function(event, toState, toParams, fromState, fromParams){

                        /*
                         * ANY -> ANY
                         */

                        // Clear messages
                        $scope.successMessage = undefined;
                        $scope.errorMessage = undefined;


                        /*
                         * -> INITIAL
                         */

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
