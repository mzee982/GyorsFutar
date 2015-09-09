angular.module('ngAppGyorsFutar')
    .factory('ngServiceContext',
    [   '$state',
        'STATE',
        function($state, STATE) {

            /*
             * Members
             */

            var stateParams;
            var backStack;


            /*
             * Interface
             */

            var serviceInstance = {
                initialize: function() {initialize();},
                getStateParams: function() {return getStateParams();},
                navigate: function(toStateName, newStateParams) {navigate(toStateName, newStateParams);},
                navigateBack: function(fromState) {navigateBack(fromState);}
            };


            /*
             * Functions
             */

            function initialize() {

                stateParams = {
                    locationMode: undefined,
                    initialPosition: undefined,
                    markedPosition: undefined,
                    location: undefined,
                    baseTime: undefined,
                    tripId: undefined,
                    stopId: undefined,
                    routeIds: undefined,
                    trip: undefined
                };

                backStack = [];

            }

            function getStateParams() {
                var actualStateParams = angular.copy(stateParams);

                return actualStateParams;
            }

            function setStateParams(newStateParams) {

                if (angular.isDefined(newStateParams)) {
                    angular.extend(stateParams, newStateParams);
                }

            }

            function navigate(toStateName, newStateParams) {

                /*
                 * State input parameters
                 */

                setStateParams(newStateParams);


                /*
                 * Navigation categories
                 */

                var fromState = $state.current;
                var fromStateName = (angular.isDefined(fromState) && angular.isDefined(fromState.name)) ? fromState.name : '';
                var fromParentStateName = angular.isDefined(fromState) ? fromState.data.parentState : undefined;
                var toState = $state.get(toStateName);
                var toParentStateName = toState.data.parentState;

                var isEntry = (fromStateName.length == 0);
                var isDescendant = (angular.isDefined(toParentStateName) && (toParentStateName == fromStateName));

                var isAncestral = false;

                if (angular.isDefined(fromParentStateName)) {
                    var compareState = $state.get(fromParentStateName);
                    var compareStateParent = angular.isDefined(compareState.data.parentState) ? $state.get(compareState.data.parentState) : undefined;

                    while ((toState.name != compareState.name) && (angular.isDefined(compareStateParent))) {
                        compareState = compareStateParent;
                        compareStateParent = angular.isDefined(compareState.data.parentState) ? $state.get(compareState.data.parentState) : undefined;
                    }

                    isAncestral = (toState.name == compareState.name);
                }

                else {
                    isAncestral = false;
                }


                //
                // Entry
                //

                if (isEntry) {

                    // Nothing to do

                }


                //
                // Descendant
                //

                else if (isDescendant) {

                    if (fromState.data.backStackable) {

                        // Push to back stack
                        backStack.push(fromStateName);

                    }

                }


                //
                // Ancestral
                //

                else if (isAncestral) {

                    // Single instance allowed -> Back stack clean-up
                    if (toState.data.singleInstance) {
                        var toStateIndex = backStack.lastIndexOf(toStateName);

                        if (toStateIndex >= 0) {
                            backStack = backStack.slice(0, toStateIndex);
                        }

                        else {
                            backStack = [];
                        }
                    }

                    // Back stackable
                    else if (fromState.data.backStackable) {

                        // Push to back stack
                        backStack.push(fromStateName);

                    }

                }

                // Lateral
                else {

                    // Back stackable
                    if (fromState.data.backStackable) {

                        // Push to back stack
                        backStack.push(fromStateName);

                    }

                    // Single instance allowed -> Back stack clean-up
                    if (toState.data.singleInstance) {
                        var toStateIndex = backStack.lastIndexOf(toStateName);

                        if (toStateIndex >= 0) {
                            backStack = backStack.slice(0, toStateIndex);
                        }
                    }

                }

                /*
                 * State transition
                 */

                $state.go(toStateName);

            }

            function navigateBack(fromState) {
                var parentStateName = fromState.data.parentState;

                // Temporal navigation
                if (backStack.length > 0) {
                    var toStateName = backStack.pop();

                    // Navigate back in back stack
                    $state.go(toStateName);

                }

                // Ancestral navigation
                else if (angular.isDefined(parentStateName)) {

                    // Navigate up in state hierarchy
                    $state.go(parentStateName);

                }

                // Fallback navigation
                else {

                    // Re-enter the app
                    $state.go(STATE.INITIAL);

                }

            }


            /*
             * Initialization
             */

            initialize();


            /*
             * The service instance
             */

            return serviceInstance;

        }

    ]);
