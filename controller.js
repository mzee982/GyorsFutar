var app = angular.module('ngAppGyorsFutar', ['ui.bootstrap', 'ngStorage']);
app.controller('ngControllerGyorsFutar', function($scope, $localStorage) {

    // Constants
    $scope.UI_MODE_LOCATION_GET='UI_MODE_LOCATION_GET';
    $scope.UI_MODE_LOCATION_LIST='UI_MODE_LOCATION_LIST';
    $scope.UI_MODE_LOCATION_PICKER='UI_MODE_LOCATION_PICKER';
    $scope.UI_MODE_TIMETABLE_BUILD='UI_MODE_TIMETABLE_BUILD';
    $scope.UI_MODE_TIMETABLE_SHOW='UI_MODE_TIMETABLE_SHOW';
    $scope.LOCATION_MODE_AUTO='LOCATION_MODE_AUTO';
    $scope.LOCATION_MODE_LIST='LOCATION_MODE_LIST';
    $scope.LOCATION_MODE_MAP='LOCATION_MODE_MAP';

    $scope.initializeScope = function() {
        $scope.timeCountdownInterval = undefined;
        $scope.timetableUpdateTimeout = undefined;
        $scope.successMessage = undefined;
        $scope.errorMessage = undefined;
        $scope.uiMode = undefined;
        $scope.geoPosition = undefined;
        $scope.storedLocations = undefined;
        $scope.timetablePresentation = undefined;
        $scope.timetableBuildTime = undefined;
    };

    $scope.reset = function() {

        if ($scope.timeCountdownInterval != undefined) {
            window.clearInterval($scope.timeCountdownInterval);
            $scope.timeCountdownInterval = undefined;
        }

        if ($scope.timetableUpdateTimeout != undefined) {
            window.clearTimeout($scope.timetableUpdateTimeout);
            $scope.timetableUpdateTimeout = undefined;
        }

    };

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

    $scope.showLocationList = function(position, callback) {
        var locations = $localStorage.locations;
        var locationArray = [];

        for (locationId in locations) {
            var actualLocation = locations[locationId];

            // Calculate distance
            var fromLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            var toLatLng = new google.maps.LatLng(actualLocation.coords.latitude, actualLocation.coords.longitude);

            actualLocation.distance = google.maps.geometry.spherical.computeDistanceBetween(fromLatLng, toLatLng);

            actualLocation.callback = function() {callback(this);};

            locationArray.push(actualLocation);
        }

        // Sort by ascending distance
        locationArray.sort(function(a, b) {return a.distance - b.distance});

        // Last item is the Location Picker
        var locationPickerItem = {callback: function() {callback();}};
        locationArray.push(locationPickerItem);

        //
        $scope.storedLocations = locationArray;

        $scope.uiMode = $scope.UI_MODE_LOCATION_LIST;
        $scope.$apply();
    };

    $scope.showLocationPicker = function(position, callback) {
        $scope.uiMode = $scope.UI_MODE_LOCATION_PICKER;
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

            $scope.storeLocation(position);

            callback(position);
        });

        $('#locationPicker').locationpicker(options);

    }

    $scope.onLocationPickerRadiusChange = function(radius) {
        var latitude = parseFloat($('#locationPicker-latitude').val()).toFixed(6);
        var longitude = parseFloat($('#locationPicker-longitude').val()).toFixed(6);

        $('#locationPicker-radius').val(radius);

        $('#locationPicker').locationpicker('location', {latitude: latitude, longitude: longitude, radius: radius});
    }

    $scope.storeLocation = function(position) {
        var positionKey = position.formattedAddress;

        // Read
        var locations = $localStorage.locations;

        // Initialize
        if (locations == undefined) {
            locations = {};
        }

        // Add / Overwrite
        locations[positionKey] = position;

        // Store
        $localStorage.locations = locations;

    }

    $scope.onLocationRefreshClick = function(mode) {
        $scope.initialize(mode, $scope.geoPosition);
    }

    $scope.onTimetableRefreshClick = function() {
        $scope.buildTimetable($scope.geoPosition);
    }

    $scope.updateTimeCountdowns = function() {
        //TODO Use $interval

        var update = function() {
            var now = new Date();

            $(".time-countdown").each(
                function() {
                    var stopTime = new Date(parseInt($(this).attr("data-target-time")));
                    var countdownString = formatTimeDiff(now, stopTime);

                    $(this).text(countdownString);
                }
            );
        };

        // Clear
        if ($scope.timeCountdownInterval != undefined) {
            window.clearInterval($scope.timeCountdownInterval);
            $scope.timeCountdownInterval = undefined;
        }

        // Update now
        update();

        // Set regular update
        $scope.timeCountdownInterval = window.setInterval(update, 1000);

    }

    $scope.autoUpdateTimetable = function() {
        //TODO Use $timeout

        if ($scope.timetableUpdateTimeout != undefined) {
            window.clearTimeout($scope.timetableUpdateTimeout);
            $scope.timetableUpdateTimeout = undefined;
        }

        // Update Timetable
        $scope.timetableUpdateTimeout = window.setTimeout(
            function() {
                $scope.buildTimetable($scope.geoPosition);
            },
            30000
        );
    }

    $scope.buildTimetable = function(position) {
        var promiseBuildTimetable = buildTimetable(position, $scope.timetablePresentation);

        $scope.uiMode = $scope.UI_MODE_TIMETABLE_BUILD;
        $scope.$apply();

        promiseBuildTimetable.then(

            // Done
            function(timetablePresentation) {
                $scope.timetableBuildTime = new Date();
                $scope.timetablePresentation = timetablePresentation;

                $scope.uiMode = $scope.UI_MODE_TIMETABLE_SHOW;
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

    $scope.selectLocation = function(locationMode, initialPosition) {
        var deferredObject = $.Deferred();

        $scope.uiMode = $scope.UI_MODE_LOCATION_GET;
        $scope.$apply();

        // Mode selection
        switch(locationMode) {
            case $scope.LOCATION_MODE_AUTO:
                var promiseSelectLocation = $scope.selectLocationByGeoLocator();
                break;
            case $scope.LOCATION_MODE_LIST:
                var promiseSelectLocation = $scope.selectLocationFromList(initialPosition);
                break;
            case $scope.LOCATION_MODE_MAP:
                var promiseSelectLocation = $scope.selectLocationByPicker(initialPosition);
                break;
            default:
                var promiseSelectLocation = $scope.selectLocationByGeoLocator();
        }

        //
        promiseSelectLocation.then(

            // Done
            function(position) {
                deferredObject.resolve(position);
            },

            // Fail
            function(error) {
                var msg = 'selectLocation: ' + error.message;
                deferredObject.reject(msg);
            }

        );

        return deferredObject.promise();
    }

    $scope.selectLocationByGeoLocator = function() {
        var deferredObject = $.Deferred();

        var promiseGetLocation = getLocation();

        promiseGetLocation.then(

            // Done
            function(position) {

                //TODO Mock location: Orb�nhegyi
                //position = {coords: {latitude: 47.497418, longitude: 19.013673, accuracy: 10}, formattedAddress: 'Mock location Orb�nhegyi'};

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
                    if (position.coords.accuracy < 250) position.coords.accuracy = 250;

                    deferredObject.resolve(position);
                }

                // Not accurate enough
                else {

                    // Stored locations
                    var promiseSelectLocationFromList = $scope.selectLocationFromList(position);

                    promiseSelectLocationFromList.then(

                        // Done
                        function(selectedPosition) {
                            deferredObject.resolve(selectedPosition);
                        },

                        // Fail
                        function(error) {
                            var msg = 'selectLocationFromList: ' + error.message;
                            deferredObject.reject(msg);
                        }

                    );

                }

            },

            // Fail
            function(error) {
                var msg = 'getLocation: ' + error.message;
                deferredObject.reject(msg);
            }

        );

        return deferredObject.promise();
    }

    $scope.selectLocationFromList = function (initialPosition) {
        var deferredObject = $.Deferred();

        // Stored locations
        if ($localStorage.locations != undefined) {

            $scope.showLocationList(
                initialPosition,
                function(selectedPosition) {

                    // Location selected
                    if (selectedPosition != undefined) {
                        deferredObject.resolve(selectedPosition);
                    }

                    // Location Picker
                    else {
                        var promiseSelectLocationByPicker = $scope.selectLocationByPicker(initialPosition);

                        promiseSelectLocationByPicker.then(

                            // Done
                            function(pickedPosition) {
                                deferredObject.resolve(pickedPosition);
                            },

                            // Fail
                            function(error) {
                                var msg = 'selectLocationByPicker: ' + error.message;
                                deferredObject.reject(msg);
                            }

                        );
                    }

                }
            );

        }

        // Location Picker
        else {
            var promiseSelectLocationByPicker = $scope.selectLocationByPicker(initialPosition);

            promiseSelectLocationByPicker.then(

                // Done
                function(pickedPosition) {
                    deferredObject.resolve(pickedPosition);
                },

                // Fail
                function(error) {
                    var msg = 'selectLocationByPicker: ' + error.message;
                    deferredObject.reject(msg);
                }

            );
        }

        return deferredObject.promise();
    };

    $scope.selectLocationByPicker = function(initialPosition) {
        var deferredObject = $.Deferred();

        $scope.showLocationPicker(
            initialPosition,
            function(pickedPosition) {
                deferredObject.resolve(pickedPosition);
            }
        );

        return deferredObject.promise();
    }

    $scope.initialize = function(locationMode, initialPosition) {

        $scope.reset();
        $scope.initializeScope();

        /*
         * Determine geo-location
         */

        var promiseSelectLocation = $scope.selectLocation(locationMode, initialPosition);

        var promiseLocationReady = promiseSelectLocation.then(

            // Done
            function (position) {
                var deferredObject = $.Deferred();

                $scope.geoPosition = position;
                deferredObject.resolve($scope.geoPosition);

                return deferredObject.promise();
            },

            // Fail
            function (message) {
                var deferredObject = $.Deferred();

                deferredObject.reject(message);

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

                $scope.uiMode = undefined;
                $scope.$apply();
            }

        );

    }


    // Startup
    $scope.initialize($scope.LOCATION_MODE_AUTO);

});
