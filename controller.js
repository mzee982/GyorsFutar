var app = angular.module('ngAppGyorsFutar', []);
app.controller('ngControllerGyorsFutar', function($scope) {

    /*
     * Initialize
     */

    $scope.timeCountdownInterval = undefined;
    $scope.timetableUpdateTimeout = undefined;
    $scope.successMessage = undefined;
    $scope.errorMessage = undefined;
    $scope.geoPosition = undefined;
    $scope.timetablePresentation = undefined;
    $scope.timetableBuildTime = undefined;
    $scope.isLocationPicker = false;

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

    $scope.showLocationPicker = function(position, callback) {
        $scope.isLocationPicker = true;

        $scope.$apply();

        var options = {
            location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude},
            radius: position.coords.accuracy,
            inputBinding: {
                latitudeInput: $('#locationPicker-latitude'),
                longitudeInput: $('#locationPicker-longitude'),
                radiusInput: $('#locationPicker-radius'),
                locationNameInput: $('#locationPicker-address')
            }
        };

        $('#locationPickerButtonOk').click(function() {
            var latitude = parseFloat($('#locationPicker-latitude').val()).toFixed(6);
            var longitude = parseFloat($('#locationPicker-longitude').val()).toFixed(6);
            var radius = $('#locationPicker-radius').val();
            var locationName = $('#locationPicker-address').val();

            var position = {coords: {latitude: latitude, longitude: longitude, accuracy: radius}, formattedAddress: locationName};

            callback(position);
            $scope.hideLocationPicker();
        });

        $('#locationPicker').locationpicker(options);

    }

    $scope.hideLocationPicker = function() {
        $scope.isLocationPicker = false;

        $scope.$apply();

    }

    $scope.onLocationPickerRadiusChange = function(radius) {
        var latitude = parseFloat($('#locationPicker-latitude').val()).toFixed(6);
        var longitude = parseFloat($('#locationPicker-longitude').val()).toFixed(6);

        $('#locationPicker-radius').val(radius);

        $('#locationPicker').locationpicker('location', {latitude: latitude, longitude: longitude, radius: radius});
    }

    $scope.onLocationRefreshClick = function() {
        $scope.initialize();
    }

    $scope.onTimetableRefreshClick = function() {
        $scope.buildTimetable($scope.geoPosition);
    }

    $scope.updateTimeCountdowns = function() {

        if ($scope.timeCountdownInterval != undefined) {
            window.clearInterval($scope.timeCountdownInterval);
            $scope.timeCountdownInterval = undefined;
        }

        // Regular update
        $scope.timeCountdownInterval = window.setInterval(
            function() {
                var now = new Date();

                $(".time-countdown").each(
                    function() {
                        var stopTime = new Date(parseInt($(this).attr("data-target-time")));
                        var countdownString = formatTimeDiff(now, stopTime);

                        $(this).text(countdownString);
                    }
                );
            },
            1000
        );

    }

    $scope.autoUpdateTimetable = function() {
        if ($scope.timetableUpdateTimeout != undefined) {
            window.clearTimeout($scope.timetableUpdateTimeout);
            $scope.timetableUpdateTimeout = undefined;
        }

        // Update Timetable
        $scope.timetableUpdateTimeout = window.setTimeout(
            function() {
                $scope.buildTimetable($scope.geoPosition);
            },
            15000
        );
    }

    $scope.buildTimetable = function(position) {
        var promiseBuildTimetable = buildTimetable(position);

        promiseBuildTimetable.then(

            // Done
            function(timetablePresentation) {
                $scope.timetableBuildTime = new Date();
                $scope.timetablePresentation = timetablePresentation;

                $scope.$apply();

                // Refresh stop time countdowns
                $scope.updateTimeCountdowns();

                // Update timetable regularly
                $scope.autoUpdateTimetable();

            },

            // Fail
            function(message) {
                $scope.showErrorMessage(message);
            }

        );
    }

    $scope.initialize = function() {
        $scope.successMessage = undefined;
        $scope.errorMessage = undefined;
        $scope.geoPosition = undefined;
        $scope.timetablePresentation = undefined;
        $scope.timetableBuildTime = undefined;
        $scope.isLocationPicker = false;

        //$scope.$apply();

        /*
         * Determine geo-location
         */

        var promiseGetLocation = getLocation();

        var promiseLocationReady = promiseGetLocation.then(

            // Done
            function (position) {
                var deferredObject = $.Deferred();

                //TODO Mock location: Orbánhegyi
                //position = {coords: {latitude: 47.497418, longitude: 19.013673, accuracy: 10}, formattedAddress: 'Mock location Orbánhegyi'};

                console.info(
                    'Position ' +
                    'lat: ' + position.coords.latitude +
                    ' lon: ' + position.coords.longitude +
                    ' accuracy: ' + position.coords.accuracy +
                    ' formattedAddress: ' + position.formattedAddress);

                // Format
                position = {
                    coords: {
                        latitude: parseFloat(position.coords.latitude).toFixed(6),
                        longitude: parseFloat(position.coords.longitude).toFixed(6),
                        accuracy: parseInt((position.coords.accuracy == undefined) ? 1000 : position.coords.accuracy)
                    },
                    formattedAddress: position.formattedAddress
                };

                // Accurate enough
                if (position.coords.accuracy < 500) {

                    // Min search radius
                    if (position.coords.accuracy < 100) position.coords.accuracy = 100;

                    $scope.geoPosition = position;
                    deferredObject.resolve($scope.geoPosition);
                }

                // Not accurate enough
                else {

                    $scope.showLocationPicker(
                        position,
                        function(position) {
                            $scope.geoPosition = position;
                            deferredObject.resolve($scope.geoPosition);
                        }
                    );

                }

                return deferredObject.promise();
            },

            // Fail
            function (error) {
                var deferredObject = $.Deferred();

                var msg = 'getLocation: ' + error.message;
                $scope.showErrorMessage(msg);
                deferredObject.reject(msg);

                return deferredObject.promise();
            }

        );

        /*
         * Build and show timetable
         */

        promiseLocationReady.then(

            // Done
            function(position) {
                $scope.buildTimetable(position);
            },

            // Fail
            function(message) {
                $scope.showErrorMessage(message);
            }

        );

    }


    // Startup
    $scope.initialize();

});
