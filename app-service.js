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
                    detectedPosition: undefined,
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
                var isReload = (fromStateName == toStateName);
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
                // Reload
                //

                else if (isReload) {

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


                //
                // Lateral
                //

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


                if (isReload) {
                    $state.reload();
                }
                else {
                    $state.go(toStateName);
                }

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

    ])
    .factory('ngServiceUtils',
    [
        '$timeout',
        '$filter',
        function($timeout, $filter) {

            /*
             * Interface
             */

            var serviceInstance = {
                now: function() {return now();},
                throttle: function(func, wait, options) {return throttle(func, wait, options);},
                debounce: function(func, wait, immediate) {return debounce(func, wait, immediate);},
                formatTimeDiff: function(date1, date2) {return formatTimeDiff(date1, date2);}
            };


            /*
             * Functions
             */

            //
            //     Underscore.js 1.8.3
            //     http://underscorejs.org
            //     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
            //     Underscore may be freely distributed under the MIT license.
            //
            // A (possibly faster) way to get the current timestamp as an integer.
            var now = Date.now || function() {return new Date().getTime();};

            //
            //     Underscore.js 1.8.3
            //     http://underscorejs.org
            //     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
            //     Underscore may be freely distributed under the MIT license.
            //
            // Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
            // This accumulates the arguments passed into an array, after a given index.
            var restArgs = function(func, startIndex) {
                startIndex = startIndex == null ? func.length - 1 : +startIndex;
                return function() {
                    var length = Math.max(arguments.length - startIndex, 0);
                    var rest = Array(length);
                    for (var index = 0; index < length; index++) {
                        rest[index] = arguments[index + startIndex];
                    }
                    switch (startIndex) {
                        case 0: return func.call(this, rest);
                        case 1: return func.call(this, arguments[0], rest);
                        case 2: return func.call(this, arguments[0], arguments[1], rest);
                    }
                    var args = Array(startIndex + 1);
                    for (index = 0; index < startIndex; index++) {
                        args[index] = arguments[index];
                    }
                    args[startIndex] = rest;
                    return func.apply(this, args);
                };
            };

            //
            //     Underscore.js 1.8.3
            //     http://underscorejs.org
            //     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
            //     Underscore may be freely distributed under the MIT license.
            //
            // Delays a function for the given number of milliseconds, and then calls
            // it with the arguments supplied.
            var delay = restArgs(function(func, wait, args) {
                return $timeout(function() {
                    return func.apply(null, args);
                }, wait, false);
            });

            //
            //     Underscore.js 1.8.3
            //     http://underscorejs.org
            //     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
            //     Underscore may be freely distributed under the MIT license.
            //
            // Returns a function, that, when invoked, will only be triggered at most once
            // during a given window of time. Normally, the throttled function will run
            // as much as it can, without ever going more than once per `wait` duration;
            // but if you'd like to disable the execution on the leading edge, pass
            // `{leading: false}`. To disable execution on the trailing edge, ditto.
            function throttle(func, wait, options) {
                var timeoutPromise, context, args, result;
                var previous = 0;
                if (!options) options = {};

                var later = function() {
                    previous = options.leading === false ? 0 : now();
                    timeoutPromise = null;
                    result = func.apply(context, args);
                    if (!timeoutPromise) context = args = null;
                };

                var throttled = function() {
                    var nowValue = now();
                    if (!previous && options.leading === false) previous = nowValue;
                    var remaining = wait - (nowValue - previous);
                    context = this;
                    args = arguments;
                    if (remaining <= 0 || remaining > wait) {
                        if (timeoutPromise) {
                            $timeout.cancel(timeoutPromise);
                            timeoutPromise = null;
                        }
                        previous = nowValue;
                        result = func.apply(context, args);
                        if (!timeoutPromise) context = args = null;
                    } else if (!timeoutPromise && options.trailing !== false) {
                        timeoutPromise = $timeout(later, remaining, false);
                    }
                    return result;
                };

                throttled.clear = function() {
                    $timeout.cancel(timeoutPromise);
                    previous = 0;
                    timeoutPromise = context = args = null;
                };

                return throttled;
            }

            //
            //     Underscore.js 1.8.3
            //     http://underscorejs.org
            //     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
            //     Underscore may be freely distributed under the MIT license.
            //
            // Returns a function, that, as long as it continues to be invoked, will not
            // be triggered. The function will be called after it stops being called for
            // N milliseconds. If `immediate` is passed, trigger the function on the
            // leading edge, instead of the trailing.
            function debounce(func, wait, immediate) {
                var timeoutPromise, result;

                var later = function(context, args) {
                    timeoutPromise = null;
                    if (args) result = func.apply(context, args);
                };

                var debounced = restArgs(function(args) {
                    var callNow = immediate && !timeoutPromise;
                    if (timeoutPromise) $timeout.cancel(timeoutPromise);
                    if (callNow) {
                        timeoutPromise = $timeout(later, wait, false);
                        result = func.apply(this, args);
                    } else if (!immediate) {
                        timeoutPromise = delay(later, wait, this, args);
                    }

                    return result;
                });

                debounced.cancel = function() {
                    $timeout.cancel(timeoutPromise);
                    timeoutPromise = null;
                };

                return debounced;
            };

            function formatTimeDiff(date1, date2) {
                var diffTimeMillis = date1 - date2;
                var diffTimeMillisSign = diffTimeMillis >= 0 ? 1 : -1;

                diffTimeMillis = Math.abs(diffTimeMillis);
                var diffTime = new Date(diffTimeMillis);

                var signString = diffTimeMillisSign < 0 ? '-' : '';
                var formattedDiffTime = signString;

                if (diffTime.getUTCHours() > 0) {
                    formattedDiffTime += $filter('date')(diffTime, 'H:mm:ss', 'UTC');
                }
                else {
                    formattedDiffTime += $filter('date')(diffTime, 'mm:ss', 'UTC');
                }

                return formattedDiffTime;
            };


            /*
             * The service instance
             */

            return serviceInstance;

        }
    ]);
