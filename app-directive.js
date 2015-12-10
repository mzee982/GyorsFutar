angular.module('ngAppGyorsFutar')
    .constant('FILL_HEIGHT', {
        'WINDOW_RESIZE_HEIGHT_ADJUSTMENT_TIMEOUT': 500,
        'INITIAL_HEIGHT_ADJUSTMENT_TIMEOUT': 500
    })
    .constant('RECOMPILE', {
        'CLASS': 'gyfClassRecompile'
    })
    .constant('STICKY', {
        'STATE_STICKED': 'STICKED',
        'STATE_UNSTICKED': 'UNSTICKED',
        'NOTIFY_COLLAPSIBLES_THROTTLE_WAIT': 500,
        'RESIZE_HANDLER_DEBOUNCE_WAIT': 500,
        'CLASS_STICKY': 'sticky',
        'CLASS_PLACEHOLDER': 'placeholder',
        'CLASS_STICKED': 'sticked'
    })
    .constant('COLLAPSIBLE', {
        'STATE_EXPANDED': 'EXPANDED',
        'STATE_COLLAPSED': 'COLLAPSED',
        'CLASS_COLLAPSIBLE': 'collapsible',
        'CLASS_EXPANDED': 'expanded',
        'CLASS_COLLAPSED': 'collapsed',
        'CLASS_TRANSITION': 'transition'
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
                        countdownString = $filter('date')(now, 'mediumTime');
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
    }])
    .directive('gyfSticky', ['$document', '$window', '$timeout', 'ngServiceUtils', 'STICKY', 'COLLAPSIBLE', function($document, $window, $timeout, ngServiceUtils, STICKY, COLLAPSIBLE) {
        return {
            restrict: 'E',
            scope: {
            },
            controller: ['$scope', function($scope) {
                $scope.collapsibles = [];

                this.registerCollapsible = function(collapsible) {
                    $scope.collapsibles.push(collapsible);
                }

                this.unregisterCollapsible = function(collapsible) {
                    var index = $scope.collapsibles.indexOf(collapsible);
                    if (index >=0) $scope.collapsibles.splice(index, 1);
                }

            }],
            link: function(scope, element, attrs) {
                scope.sticky = element;
                scope.state = undefined;
                scope.placeholder = undefined;
                scope.scrollParent = undefined;
                scope.stickyScrollOffset = undefined;
                scope.collapsiblesScrollOffset = undefined;
                scope.throttledNotifyCollapsibles = ngServiceUtils.throttle(notifyCollapsibles, STICKY.NOTIFY_COLLAPSIBLES_THROTTLE_WAIT);
                scope.debouncedResizeHandler = ngServiceUtils.debounce(resizeHandler, STICKY.RESIZE_HANDLER_DEBOUNCE_WAIT);

                function createPlaceholder(element) {
                    var placeholderElement = angular.element($document[0].createElement('div'));
                    placeholderElement.height(element.height());

                    placeholderElement.addClass(STICKY.CLASS_STICKY + ' ' + STICKY.CLASS_PLACEHOLDER);

                    return placeholderElement;
                }

                function findScrollParent(childElement) {
                    var scrollParent = undefined;

                    // Find amongst parents
                    childElement.parents().each(function(index, parentElement) {

                        // Has vertical scroll bar?
                        if (parentElement.scrollHeight > parentElement.clientHeight) {
                            scrollParent = angular.element(parentElement);
                            return false;
                        }

                    });

                    return scrollParent;
                }

                function stick(scope) {

                    // Dimensions

                    var height = scope.sticky.height();
                    var top = scope.scrollParent.offset().top;


                    // Setup

                    scope.sticky.addClass(STICKY.CLASS_STICKY);
                    scope.sticky.addClass(STICKY.CLASS_STICKED);
                    scope.sticky.css('height', height);
                    scope.sticky.css('top', top);


                    // Add placeholder

                    scope.placeholder = createPlaceholder(scope.sticky);
                    scope.sticky.after(scope.placeholder);


                    // State
                    scope.state = STICKY.STATE_STICKED;


                    //
                    scope.collapsiblesScrollOffset = scope.stickyScrollOffset;

                }

                function unstick(scope) {

                    // Reset

                    scope.sticky.addClass(STICKY.CLASS_STICKY);
                    scope.sticky.removeClass(STICKY.CLASS_STICKED);
                    scope.sticky.css('height', '');
                    scope.sticky.css('top', '');


                    // Remove placeholder

                    if (angular.isDefined(scope.placeholder)) scope.placeholder.remove();
                    scope.placeholder = undefined;


                    // State
                    scope.state = STICKY.STATE_UNSTICKED;


                    //
                    scope.scrollParent = undefined;
                    scope.stickyScrollOffset = undefined;
                    scope.collapsiblesScrollOffset = undefined;

                }

                function notifyCollapsibles(scrollTop, collapsiblesScrollOffset) {

                    if (scope.collapsibles.length > 0) {
                        var relativeScrollValue = scrollTop - collapsiblesScrollOffset;
                        var collapsiblesHeight = 0;

                        // Notify collapsibles
                        for (var index = scope.collapsibles.length - 1; index >= 0; index--) {
                            var currentState = scope.collapsibles[index].getState();
                            var currentHeight = scope.collapsibles[index].getHeight();
                            collapsiblesHeight += currentHeight;

                            if ((currentState == COLLAPSIBLE.STATE_EXPANDED) && (relativeScrollValue >= collapsiblesHeight)) {

                                // Collapse
                                scope.collapsibles[index].stateChangeHandler(COLLAPSIBLE.STATE_COLLAPSED);

                            }

                            else if ((currentState == COLLAPSIBLE.STATE_COLLAPSED) && (relativeScrollValue <= (collapsiblesHeight - currentHeight))) {

                                // Expand
                                scope.collapsibles[index].stateChangeHandler(COLLAPSIBLE.STATE_EXPANDED);

                            }

                        }

                        // Adjust collapsiblesScrollOffset
                        if (relativeScrollValue < 0) {
                            scope.collapsiblesScrollOffset = scrollTop;
                        }
                        else if (collapsiblesHeight < relativeScrollValue) {
                            scope.collapsiblesScrollOffset = scrollTop - collapsiblesHeight;
                        }

                    }

                }

                function scrollHandler(event) {
                    var scope = event.data;
                    var scrollTop = $document.scrollTop();

                    // Find scroll parent (on first scroll event, be sure to exist)
                    if (angular.isUndefined(scope.scrollParent)) {
                        scope.scrollParent = findScrollParent(scope.sticky);

                        if (angular.isDefined(scope.scrollParent)) {
                            scope.stickyScrollOffset = scope.sticky.offset().top - scope.scrollParent.offset().top;
                        }
                    }

                    // Has scroll parent
                    if (angular.isDefined(scope.scrollParent)) {

                        // Stick
                        if ((scrollTop >= scope.stickyScrollOffset) && (scope.state == STICKY.STATE_UNSTICKED)) {
                            stick(scope);
                        }

                        // Notify collapsible
                        if (scope.state == STICKY.STATE_STICKED) {
                            scope.throttledNotifyCollapsibles(scrollTop, scope.collapsiblesScrollOffset);
                        }

                        // Unstick
                        if ((scrollTop < scope.stickyScrollOffset) && (scope.state == STICKY.STATE_STICKED)) {
                            unstick(scope);
                        }

                    }
                }

                function resizeHandler(event) {

                    // Reset
                    unstick(scope);

                    // Notify collapsibles
                    for (var index = 0; index < scope.collapsibles.length; index++) {
                        scope.collapsibles[index].reInit();
                    }

                    // Send scroll event
                    $document.scroll();

                }


                // Init

                unstick(scope);

                $document.scroll(scope, scrollHandler);
                angular.element($window).on('resize', scope.debouncedResizeHandler);


                // Destroy

                element.on('$destroy', function() {

                    $document.off('scroll', scrollHandler);
                    angular.element($window).off('resize', scope.throttledResizeHandler);

                });

            }
        };
    }])
    .directive('gyfCollapsible', ['$document', 'COLLAPSIBLE', function($document, COLLAPSIBLE) {
        return {
            restrict: 'E',
            require: '^gyfSticky',
            scope: {},
            link: function (scope, element, attrs, ctrl) {

                scope.collapsible = element;
                scope.collapsibleInterface = {getHeight: getHeight, getState: getState, reInit: reInit, stateChangeHandler: stateChangeHandler};
                scope.state = undefined;
                scope.collapsibleHeight = undefined;

                function getHeight() {
                    return scope.collapsibleHeight;
                }

                function getState() {
                    return scope.state;
                }

                function init() {

                    //
                    scope.collapsibleHeight = scope.collapsible.height();

                    // CSS classes
                    scope.collapsible.addClass(COLLAPSIBLE.CLASS_COLLAPSIBLE);
                    scope.collapsible.addClass(COLLAPSIBLE.CLASS_EXPANDED);

                    // CSS styles (transition initial values)
                    scope.collapsible.css('height', scope.collapsibleHeight);
                    scope.collapsible.children().css('top', 0);

                    // State
                    scope.state = COLLAPSIBLE.STATE_EXPANDED;

                }

                function reInit() {

                    // Reset

                    // CSS classes
                    scope.collapsible.removeClass(COLLAPSIBLE.CLASS_COLLAPSIBLE);
                    scope.collapsible.removeClass(COLLAPSIBLE.CLASS_EXPANDED);
                    scope.collapsible.removeClass(COLLAPSIBLE.CLASS_COLLAPSED);
                    scope.collapsible.removeClass(COLLAPSIBLE.CLASS_TRANSITION);

                    // CSS styles
                    scope.collapsible.css('height', '');
                    scope.collapsible.children().css('top', '');

                    // State
                    scope.state = undefined;
                    scope.collapsibleHeight = undefined;

                    // Re-init
                    init();

                }

                function collapse(scope) {

                    // CSS classes
                    scope.collapsible.removeClass(COLLAPSIBLE.CLASS_EXPANDED);
                    scope.collapsible.addClass(COLLAPSIBLE.CLASS_COLLAPSIBLE);
                    scope.collapsible.addClass(COLLAPSIBLE.CLASS_COLLAPSED);
                    scope.collapsible.addClass(COLLAPSIBLE.CLASS_TRANSITION);

                    // CSS styles (transition targets)
                    scope.collapsible.css('height', '0');
                    scope.collapsible.children().css('top', -1 * scope.collapsibleHeight);

                    // State
                    scope.state = COLLAPSIBLE.STATE_COLLAPSED;

                    // CSS transition end event
                    scope.collapsible.off('transitionend webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd');
                    scope.collapsible.one('transitionend webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd', function(event) {
                        scope.collapsible.off('transitionend webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd');
                        scope.collapsible.removeClass(COLLAPSIBLE.CLASS_TRANSITION);
                    });

                }

                function expand(scope) {

                    // CSS classes
                    scope.collapsible.removeClass(COLLAPSIBLE.CLASS_COLLAPSED);
                    scope.collapsible.addClass(COLLAPSIBLE.CLASS_COLLAPSIBLE);
                    scope.collapsible.addClass(COLLAPSIBLE.CLASS_EXPANDED);
                    scope.collapsible.addClass(COLLAPSIBLE.CLASS_TRANSITION);

                    // CSS styles (transition targets)
                    scope.collapsible.css('height', scope.collapsibleHeight);
                    scope.collapsible.children().css('top', 0);

                    // State
                    scope.state = COLLAPSIBLE.STATE_EXPANDED;

                    // CSS transition end event
                    scope.collapsible.off('transitionend webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd');
                    scope.collapsible.one('transitionend webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd', function(event) {
                        scope.collapsible.off('transitionend webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd');
                        scope.collapsible.removeClass(COLLAPSIBLE.CLASS_TRANSITION);
                    });

                }

                function stateChangeHandler(state) {

                    // State changed
                    if (scope.state != state) {

                        // COLLAPSED
                        if (state == COLLAPSIBLE.STATE_COLLAPSED) {
                            collapse(scope);
                        }

                        // EXPANDED
                        else if (state == COLLAPSIBLE.STATE_EXPANDED) {
                            expand(scope);
                        }

                    }

                }


                // Init

                init();
                ctrl.registerCollapsible(scope.collapsibleInterface);


                // Destroy

                element.on('$destroy', function() {
                    ctrl.unregisterCollapsible(scope.collapsibleInterface);
                });

            }
        };
    }]);
