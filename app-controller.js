angular.module('ngAppGyorsFutar')
    .controller('ngControllerGyorsFutar',
        [   '$rootScope',
            '$scope',
            '$state',
            '$window',
            'ngServiceContext',
            'STATE',
            'LOCATION_MODE',
            'EVENT',
            function($rootScope, $scope, $state, $window, ngServiceContext, STATE, LOCATION_MODE, EVENT) {

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
                 * State change start event
                 */

                $rootScope.$on('$stateChangeStart',
                    function(event, toState, toParams, fromState, fromParams){

                        /*
                         * Detect page refresh/reload action
                         * Redirect to REDIRECT temporary state
                         *
                         * empty -> non REDIRECT state
                         */

                        if (angular.isDefined(fromState.name) && (fromState.name.length == 0) && (toState.name != STATE.REDIRECT)) {
                            event.preventDefault();

                            ngServiceContext.navigate(STATE.REDIRECT);
                        }

                    });

                /*
                 * State change success event
                 */

                $rootScope.$on('$stateChangeSuccess',
                    function(event, toState, toParams, fromState, fromParams){

                        /*
                         * ANY -> ANY state
                         */

                        // Clear success/error messages on state change
                        //$scope.successMessages = [];
                        //$scope.errorMessages = [];


                        /*
                         * Immediately proceed from REDIRECT temporary state
                         *
                         * ANY -> REDIRECT state
                         */

                        if (toState.name == STATE.REDIRECT) {

                            //
                            // Redirect to INITIAL state
                            //
                            // empty -> REDIRECT state
                            //

                            if (angular.isDefined(fromState.name) && (fromState.name.length == 0)) {

                                // Wait for the location hash change (browser session history entry creation)
                                angular.element($window).one(
                                    'hashchange',
                                    function(event) {
                                        ngServiceContext.navigate(STATE.INITIAL);
                                    }
                                );

                            }

                            //
                            // Back navigation detected
                            //
                            // non empty -> REDIRECT state
                            //

                            else {

                                ngServiceContext.navigateBack(fromState);

                            }

                        }


                        /*
                         * Immediately proceed from INITIAL temporary state
                         * Redirect to LOCATION_DETECTION state
                         *
                         * ANY -> INITIAL state
                         */

                        else if (toState.name == STATE.INITIAL) {

                            ngServiceContext.initialize();
                            ngServiceContext.navigate(STATE.LOCATION_DETECTION);

                        }

                    });


                /*
                 * State change error event
                 */

                $rootScope.$on('$stateChangeError',
                    function(event, toState, toParams, fromState, fromParams, error){
                        console.debug('State change error');
                    });

            }
        ]
    );
