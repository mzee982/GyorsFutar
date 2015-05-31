var app = angular.module('ngAppGyorsFutar', []);
app.controller('ngControllerGyorsFutar', function($scope) {

    // Initialize
    $scope.successMessage = undefined;
    $scope.errorMessage = undefined;
    $scope.timetablePresentation = undefined;

    $scope.showSuccessMessage = function(message) {
        $scope.successMessage = message;

        $("#idAlertSuccess").off('closed.bs.alert');
        $("#idAlertSuccess").one('closed.bs.alert', function(){$scope.successMessage = undefined;});

        $scope.$apply();
    };

    $scope.showErrorMessage = function(message) {
        $scope.errorMessage = message;

        $("#idAlertError").off('closed.bs.alert');
        $("#idAlertError").one('closed.bs.alert', function(){$scope.errorMessage = undefined;});

        $scope.$apply();
    };

    $scope.updateStopTimeCountdowns = function() {
        var now = new Date();

        $(".stop-time-countdown").each(
            function() {
                //TODO Make utility function
                var stopTimeMillis = parseInt($(this).attr("data-route-trip-stopTime"));
                var stopTime = new Date(stopTimeMillis);
                var countdownTimeMillis = now - stopTime;
                var countdownTimeMillisSign = countdownTimeMillis > 0 ? 1 : -1;

                countdownTimeMillis = Math.abs(countdownTimeMillis);

                var secs = Math.round(countdownTimeMillis / 1000) % 60;
                var minutes = Math.round(countdownTimeMillis / 1000 / 60) % 60;
                var hours = Math.round(countdownTimeMillis / 1000 / 60 / 60) % 24;

                var secsString = ("00" + secs).slice(-2);
                var minutesString = ("00" + minutes).slice(-2);
                var hoursString = ("00" + hours).slice(-2);
                var signString = countdownTimeMillisSign < 0 ? '-' : '';

                $(this).text(signString + hoursString + ':' + minutesString + ':' + secsString);
            }
        );

        // Regular update
        window.setTimeout($scope.updateStopTimeCountdowns, 1000);

    }

    $scope.showTimeTable = function() {

        // Update UI
        $scope.$apply();

        // Refresh stop time countdowns
        $scope.updateStopTimeCountdowns();

    }

    // Build timetable
    var promiseBuildTimetable = buildTimetable();

    // Show timetable
    promiseBuildTimetable.then(

        // Done
        function(timetablePresentation) {
            $scope.timetablePresentation = timetablePresentation;
            $scope.showTimeTable();
        },

        // Fail
        function(message) {
            $scope.showErrorMessage(message);
        }

    );

});
