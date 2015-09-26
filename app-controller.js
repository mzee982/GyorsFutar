angular.module('ngAppGyorsFutar')
    .controller('ngControllerGyorsFutar',
        [   '$rootScope',
            '$scope',
            '$state',
            '$window',
            '$mdToast',
            'ngServiceContext',
            'STATE',
            'LOCATION_MODE',
            'EVENT',
            function($rootScope, $scope, $state, $window, $mdToast, ngServiceContext, STATE, LOCATION_MODE, EVENT) {

                //
                $scope.errorMessage = undefined;
                $scope.successMessages = [];
                $scope.toastPromise = undefined;


                //

                $scope.showErrorPage = function() {
                    return angular.isDefined($scope.errorMessage);
                }

                $scope.errorPageGoBackClick = function() {

                    // Navigate back
                    ngServiceContext.navigateBack($state.current);

                };

                $scope.processSuccessMessages = function() {

                    if (($scope.successMessages.length > 0) && angular.isUndefined($scope.toastPromise)) {
                        var message = $scope.successMessages.shift();

                        // Show toast
                        $scope.successToast(message);

                    }

                }

                $scope.successToast = function(message) {

                    // Show toast
                    var toastPreset = $mdToast.simple().content(message).action('OK');
                    $scope.toastPromise = $mdToast.show(toastPreset);

                    // Finally remove the toast promise and continue processing
                    $scope.toastPromise.finally(
                        function() {
                            $scope.toastPromise = undefined;
                            $scope.processSuccessMessages();
                        }
                    );

                }


                /*
                 * Event handling
                 */

                // Success message event
                $scope.$on(EVENT.SUCCESS_MESSAGE, function(event, message) {
                    $scope.successMessages.push(message);
                    $scope.processSuccessMessages();
                });

                // Error message event
                $scope.$on(EVENT.ERROR_MESSAGE, function(event, message) {
                    $scope.errorMessage = message;
                });


                /*
                 * State change start event
                 */

                $rootScope.$on('$stateChangeStart',
                    function(event, toState, toParams, fromState, fromParams){

                        /*
                         * ANY -> ANY state
                         */

                        // Clear error message
                        $scope.errorMessage = undefined;

                        // Clear success messages
                        $scope.successMessages = [];

                        // Hide toast messages
                        if (angular.isDefined($scope.toastPromise)) $mdToast.hide($scope.toastPromise);


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
