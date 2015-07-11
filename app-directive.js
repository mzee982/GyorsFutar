angular.module('ngAppGyorsFutar')
    .directive('gyfCountdown', ['$interval', '$filter', function($interval, $filter) {
        return {
            restrict: 'A',
            scope: {
                baseTime: '=',
                sourceTime: '=',
                targetTime: '='
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
                    var now = new Date();
                    var baseTime = (angular.isDefined(scope.baseTime)) ? scope.baseTime : new Date();
                    var countdownString = undefined;

                    if (angular.isDefined(scope.targetTime)) {
                        countdownString = formatTimeDiff(scope.targetTime, baseTime);
                    }

                    else if (angular.isDefined(scope.sourceTime)) {
                        countdownString = formatTimeDiff(baseTime, scope.sourceTime);
                    }

                    else if (angular.isUndefined(scope.baseTime)) {
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
                if (angular.isUndefined(scope.baseTime)) {
                    countdownInterval = $interval(update, 1000, false);
                }

            }
        };
    }]);
