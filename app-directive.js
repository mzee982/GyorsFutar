angular.module('ngAppGyorsFutar')
    .constant('FILL_HEIGHT', {
        'WINDOW_RESIZE_HEIGHT_ADJUSTMENT_TIMEOUT': 500,
        'INITIAL_HEIGHT_ADJUSTMENT_TIMEOUT': 500
    })
    .constant('RECOMPILE', {
        'CLASS': 'gyfClassRecompile'
    })
    .directive('gyfCountdown', ['$interval', '$filter', function($interval, $filter) {
        return {
            restrict: 'A',
            scope: {
                baseTime: '=',
                sourceTime: '=',
                targetTime: '=',
                baseTimeValue: '@',
                sourceTimeValue: '@',
                targetTimeValue: '@'
            },
            link: function(scope, element, attrs) {
                var countdownInterval = undefined;

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
                }

                // Update
                function update() {
                    var currentBaseTime = (angular.isDefined(scope.baseTime)) ? scope.baseTime : (angular.isDefined(scope.baseTimeValue)) ? new Date(parseInt(scope.baseTimeValue)) : undefined;
                    var currentSourceTime = (angular.isDefined(scope.sourceTime)) ? scope.sourceTime : (angular.isDefined(scope.sourceTimeValue)) ? new Date(parseInt(scope.sourceTimeValue)) : undefined;
                    var currentTargetTime = (angular.isDefined(scope.targetTime)) ? scope.targetTime : (angular.isDefined(scope.targetTimeValue)) ? new Date(parseInt(scope.targetTimeValue)) : undefined;
                    var now = new Date();
                    var baseTime = (angular.isDefined(currentBaseTime)) ? currentBaseTime : now;
                    var countdownString = undefined;


                    if (angular.isDefined(currentTargetTime)) {
                        countdownString = formatTimeDiff(currentTargetTime, baseTime);
                    }

                    else if (angular.isDefined(currentSourceTime)) {
                        countdownString = formatTimeDiff(baseTime, currentSourceTime);
                    }

                    else if (angular.isUndefined(currentBaseTime)) {
                        countdownString = $filter('date')(now, 'H:mm:ss');
                    }

                    element.text(countdownString);
                }

                // Destroy
                element.on('$destroy', function() {
                    $interval.cancel(countdownInterval);
                });

                // Initial UI update
                update();

                // Regular UI update
                if (angular.isUndefined(scope.baseTime) && angular.isUndefined(scope.baseTimeValue)) {
                    countdownInterval = $interval(update, 1000, false);
                }

            }
        };
    }])
    .directive('gyfFillHeight', ['$window', '$rootElement', '$timeout', 'EVENT', 'FILL_HEIGHT', function($window, $rootElement, $timeout, EVENT, FILL_HEIGHT) {
        return {
            restrict: 'A',
            scope: {
                targetSelector: '@'
            },
            link: function(scope, element, attrs) {
                var windowResizeTimeout = undefined;
                var initialHeightAdjustmentTimeout = undefined;
                var windowHeight = $window.innerHeight;
                var targetElement = selectTargetElement(scope.targetSelector);

                // Select target element
                function selectTargetElement(targetSelector) {

                    if (angular.isDefined(targetSelector)) {
                        var foundElement = element.find(targetSelector);

                        if (foundElement.length == 1) {
                            return $(targetSelector);
                        }
                        else {
                            return element;
                        }
                    }
                    else {
                        return element;
                    }

                }

                // Adjust height to fill window
                function adjustHeight(targetElement, windowHeight) {
                    var rootContentTop = Number.MAX_VALUE;
                    var rootContentHeight = 0;

                    $rootElement.children().each(function(index, childElement) {
                        rootContentTop = Math.min(rootContentTop, $(childElement).offset().top);
                        rootContentHeight += $(childElement).outerHeight(true);
                    });

                    var elementHeight = targetElement.height();
                    var fillableHeight = windowHeight - rootContentTop - rootContentHeight;

                    targetElement.height(elementHeight + fillableHeight);

                    // Broadcast the event
                    scope.$root.$broadcast(EVENT.ADJUST_HEIGHT);
                }

                // Window resize event handler
                function onWindowResize() {
                    if (angular.isDefined(windowResizeTimeout)) $timeout.cancel(windowResizeTimeout);

                    // Delayed execution, waiting for the final window resize event
                    windowResizeTimeout = $timeout(
                        function(){
                            windowHeight = $window.innerHeight;
                            adjustHeight(targetElement, windowHeight);
                        },
                        FILL_HEIGHT.WINDOW_RESIZE_HEIGHT_ADJUSTMENT_TIMEOUT,
                        false);
                }

                // Window resize event handling
                angular.element($window).on('resize', onWindowResize);

                // Element destroy event handling
                element.on('$destroy', function() {
                    if (angular.isDefined(windowResizeTimeout)) $timeout.cancel(windowResizeTimeout);
                    if (angular.isDefined(initialHeightAdjustmentTimeout)) $timeout.cancel(initialHeightAdjustmentTimeout);
                    angular.element($window).off('resize', onWindowResize);
                });

                // Initial height adjustment

                if (angular.isDefined(initialHeightAdjustmentTimeout)) $timeout.cancel(initialHeightAdjustmentTimeout);

                // Delayed execution, waiting for final content (animation finishing...)
                initialHeightAdjustmentTimeout = $timeout(
                    function() {
                        adjustHeight(targetElement, windowHeight);
                    },
                    FILL_HEIGHT.INITIAL_HEIGHT_ADJUSTMENT_TIMEOUT,
                    false
                );

            }
        };
    }])
    .directive('gyfRecompile', ['$compile', '$timeout', 'RECOMPILE', function($compile, $timeout, RECOMPILE) {
        return {
            restrict: 'A',
            scope: {
                accessor: '='
            },
            link: function(scope, element, attrs) {
                var recompileTimeout = undefined;

                function recompile() {
                    $timeout.cancel(recompileTimeout);

                    recompileTimeout = $timeout(
                        function(){
                            var foundElement = element.find('.' + RECOMPILE.CLASS);

                            foundElement.each(
                                function(index, elem) {
                                    var angElem = angular.element(elem);

                                    // Recompile HTML
                                    $compile(angElem)(scope);

                                    // Remove remcompile marking class
                                    angElem.removeClass(RECOMPILE.CLASS);

                                }
                            );
                        },
                        500,
                        false);
                }

                // Accessor
                if (angular.isDefined(scope.accessor)) {
                    scope.accessor.recompile = recompile;
                }

                // Element destroy event handling
                element.on('$destroy', function() {
                    $timeout.cancel(recompileTimeout);
                    scope.accessor.recompile = undefined;
                });

            }
        };
    }]);
