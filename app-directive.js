angular.module('ngAppGyorsFutar')
    .directive('gyfCountdown', ['$interval', function($interval) {
        return {
            restrict: 'A',
            scope: {
                sourceTime: '=',
                targetTime: '='
            },
            link: function(scope, element, attrs) {
                var countdownInterval = undefined;

                function formatTimeDiff(date1, date2) {
                    var diffTimeMillis = date1 - date2;
                    var diffTimeMillisSign = diffTimeMillis >= 0 ? 1 : -1;

                    diffTimeMillis = Math.abs(diffTimeMillis);

                    var secs = Math.floor(diffTimeMillis / 1000) % 60;
                    var minutes = Math.floor(diffTimeMillis / 1000 / 60) % 60;
                    var hours = Math.floor(diffTimeMillis / 1000 / 60 / 60) % 24;

                    var secsString = ("00" + secs).slice(-2);
                    var minutesString = ("00" + minutes).slice(-2);
                    var hoursString = ("00" + hours).slice(-2);
                    var signString = diffTimeMillisSign < 0 ? '-' : '';

                    var formattedDiffTime =
                        signString +
                        ((hours > 0) ? (hoursString + ':') : ('')) +
                        minutesString + ':' +
                        secsString;

                    return formattedDiffTime;
                }

                // Update
                function update() {
                    var now = new Date();
                    var countdownString = undefined;

                    if (angular.isDefined(scope.targetTime)) {
                        countdownString = formatTimeDiff(scope.targetTime, now);
                    }

                    else if (angular.isDefined(scope.sourceTime)) {
                        countdownString = formatTimeDiff(now, scope.sourceTime);
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
                countdownInterval = $interval(update, 1000, false);

            }
        };
    }]);