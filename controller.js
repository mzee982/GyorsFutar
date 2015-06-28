var app = angular.module('ngAppGyorsFutar', ['ui.bootstrap', 'ngStorage']);

app.controller('ngControllerGyorsFutar',
    [   '$scope',
        '$q',
        '$interval',
        '$timeout',
        '$window',
        '$localStorage',
        function($scope, $q, $interval, $timeout, $window, $localStorage) {

    // Constants
    $scope.UI_MODE_LOCATION_GET='UI_MODE_LOCATION_GET';
    $scope.UI_MODE_LOCATION_LIST='UI_MODE_LOCATION_LIST';
    $scope.UI_MODE_LOCATION_PICKER='UI_MODE_LOCATION_PICKER';
    $scope.UI_MODE_TIMETABLE_BUILD='UI_MODE_TIMETABLE_BUILD';
    $scope.UI_MODE_TIMETABLE_SHOW='UI_MODE_TIMETABLE_SHOW';
    $scope.LOCATION_MODE_AUTO='LOCATION_MODE_AUTO';
    $scope.LOCATION_MODE_LIST='LOCATION_MODE_LIST';
    $scope.LOCATION_MODE_MAP='LOCATION_MODE_MAP';
    $scope.AUTO_UPDATE_DELAY=60000;
    $scope.RECENT_LOCATION_COUNT=5;

    $scope.initializeScope = function() {
        $scope.timetableUpdateTimeout = undefined;
        $scope.successMessage = undefined;
        $scope.errorMessage = undefined;
        $scope.uiMode = undefined;
        $scope.geoPosition = undefined;
        $scope.recentLocations = undefined;
        $scope.timetablePresentation = undefined;
        $scope.timetableBuildTime = undefined;
    };

    $scope.$on('$destroy', function() {
        $scope.reset();
    });

    $scope.reset = function() {

        if (angular.isDefined($scope.timetableUpdateTimeout)) {
            $timeout.cancel($scope.timetableUpdateTimeout);
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
        var storedLocations = $localStorage.recentLocations;
        var recentLocationArray = [];

        for (locationId in storedLocations) {
            var actualLocation = storedLocations[locationId];

            // Calculate distance
            var fromLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            var toLatLng = new google.maps.LatLng(actualLocation.coords.latitude, actualLocation.coords.longitude);

            actualLocation.distance = google.maps.geometry.spherical.computeDistanceBetween(fromLatLng, toLatLng);

            // Add callback function
            actualLocation.callback = function() {callback(this);};

            recentLocationArray.push(actualLocation);
        }

        // Sort by ascending distance
        recentLocationArray.sort(function(a, b) {return a.distance - b.distance});

        // Last item is the Location Picker
        var locationPickerItem = {callback: function() {callback();}};
        recentLocationArray.push(locationPickerItem);

        //
        $scope.recentLocations = recentLocationArray;

        $scope.uiMode = $scope.UI_MODE_LOCATION_LIST;
        //TODO Fix: Error: [$rootScope:inprog]
        $scope.$apply();
    };

    $scope.showLocationPicker = function(position, markedPosition, callback) {
        $scope.uiMode = $scope.UI_MODE_LOCATION_PICKER;
        $scope.$apply();

        var circleOptions = {
            location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude},
            radius: position.coords.accuracy,
            inputBinding: {
                latitudeInput: $('#locationPicker-latitude'),
                longitudeInput: $('#locationPicker-longitude'),
                radiusInput: $('#locationPicker-radius'),
                locationNameInput: $('#locationPicker-address')
            },
            enableAutocomplete: true
        };

        //
        $scope.adjustLocationPickerHeight();

        //
        $('#locationPicker').locationpicker(circleOptions);

        // Show marked position
        if (markedPosition != undefined) {
            var mapContext = $('#locationPicker').locationpicker('map');
            var markedLatlng = new google.maps.LatLng(markedPosition.stopLat, markedPosition.stopLon);

            // Marker
            var marker = new google.maps.Marker({
                position: markedLatlng,
                icon: {
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    scale: 3
                },
                map: mapContext.map,
                title: markedPosition.routeName
            });

            // Info Window
            var markedContentString =
                '<div>' +
                '<div>' + markedPosition.name + '</div>' +
                '<div>' + markedPosition.routeName + '</div>' +
                '<div>' + markedPosition.stopTimeString + '</div>' +
                '</div>';
            var infoWindow = new google.maps.InfoWindow({
                content: markedContentString
            });

            infoWindow.open(mapContext.map, marker);

            // Fit bounds
            circleOptions = {
                radius: mapContext.map.radius * 1,
                center: new google.maps.LatLng(mapContext.location.latitude, mapContext.location.longitude)
            };

            var circle = new google.maps.Circle(circleOptions);
            var circleBounds = circle.getBounds();

            mapContext.map.fitBounds(circleBounds);

        }

        //
        $('#locationPickerButtonOk').click(function() {
            var latitude = parseFloat($('#locationPicker-latitude').val()).toFixed(6);
            var longitude = parseFloat($('#locationPicker-longitude').val()).toFixed(6);
            var radius = $('#locationPicker-radius').val();
            var locationName = $('#locationPicker-address').val();

            var position = {coords: {latitude: latitude, longitude: longitude, accuracy: radius}, formattedAddress: locationName};

            $scope.storeLocation(position);

            callback(position);
        });

    }

    $scope.adjustLocationPickerHeight = function() {

        if ($scope.uiMode == $scope.UI_MODE_LOCATION_PICKER) {
            var windowHeight = $window.innerHeight;
            var top = $('#locationPickerPanel').offset().top;
            var innerHeight = $('#locationPickerPanel').height();
            var outerHeight = $('#locationPickerPanel').outerHeight(true);

            $('#locationPickerPanel').height(windowHeight - top - (outerHeight - innerHeight));

            $('#locationPicker').locationpicker('autosize');
        }

    }

    $scope.onLocationPickerRadiusChange = function(radius) {
        var latitude = parseFloat($('#locationPicker-latitude').val()).toFixed(6);
        var longitude = parseFloat($('#locationPicker-longitude').val()).toFixed(6);

        $('#locationPicker-radius').val(radius);

        $('#locationPicker').locationpicker('location', {latitude: latitude, longitude: longitude, radius: radius});
    }

    $scope.storeLocation = function(location) {
        var actualStoreTimestamp = new Date().getTime();
        var defaultStoreTimestamp = new Date(0).getTime();
        var locationKey = location.formattedAddress;

        // Read storage
        var storedLocations = $localStorage.recentLocations;

        // Initialize if not exists yet
        if (angular.isUndefined(storedLocations)) {
            storedLocations = {};
        }

        // Add / Overwrite
        location.storeTimestamp = actualStoreTimestamp;
        storedLocations[locationKey] = location;

        // To array
        var storedLocationArray = [];
        angular.forEach(
            storedLocations,
            function(value, key, obj) {
                if (angular.isUndefined(value.storeTimestamp)) value.storeTimestamp = defaultStoreTimestamp;
                this.push(value);
            },
            storedLocationArray);

        // Sort by descending timestamp
        storedLocationArray.sort(function(a, b) {return b.storeTimestamp - a.storeTimestamp;});

        // Store only the most recent locations
        storedLocationArray = storedLocationArray.slice(0, $scope.RECENT_LOCATION_COUNT);

        // To object
        storedLocations = {};
        angular.forEach(storedLocationArray, function(value, key, obj) {this[value.formattedAddress] = value;}, storedLocations);

        // Write storage
        $localStorage.recentLocations = storedLocations;

    }

    $scope.onLocationRefreshClick = function(mode) {
        $scope.initialize(mode, $scope.geoPosition);
    }

    $scope.onTimetableRefreshClick = function() {
        $scope.buildTimetable($scope.geoPosition);
    }

    $scope.onStopLocationClick = function(stopTime) {
        $scope.initialize($scope.LOCATION_MODE_MAP, $scope.geoPosition, stopTime);
    }

    $scope.autoUpdateTimetable = function() {

        if (angular.isDefined($scope.timetableUpdateTimeout)) {
            $timeout.cancel($scope.timetableUpdateTimeout);
            $scope.timetableUpdateTimeout = undefined;
        }

        // Update Timetable
        $scope.timetableUpdateTimeout = $timeout(function() {
                $scope.buildTimetable($scope.geoPosition);
            },
            $scope.AUTO_UPDATE_DELAY,
            false);

    }

    $scope.buildTimetable = function(position) {
        var promiseBuildTimetable = buildTimetable($q, position, $scope.timetablePresentation);

        $scope.uiMode = $scope.UI_MODE_TIMETABLE_BUILD;
        $scope.$apply();

        promiseBuildTimetable.then(

            // Done
            function(timetablePresentation) {
                $scope.timetableBuildTime = new Date();
                $scope.timetablePresentation = timetablePresentation;

                $scope.uiMode = $scope.UI_MODE_TIMETABLE_SHOW;
                $scope.$apply();

                // Update timetable regularly
                $scope.autoUpdateTimetable();

            },

            // Fail
            function(message) {
                $scope.showErrorMessage(message);
            }

        );
    }

    $scope.selectLocation = function(locationMode, initialPosition, markedPosition) {
        var deferred = $q.defer();

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
                var promiseSelectLocation = $scope.selectLocationByPicker(initialPosition, markedPosition);
                break;
            default:
                var promiseSelectLocation = $scope.selectLocationByGeoLocator();
        }

        //
        promiseSelectLocation.then(

            // Success
            function(position) {
                deferred.resolve(position);
            },

            // Error
            function(error) {
                var msg = 'selectLocation: ' + error.message;
                deferred.reject(msg);
            }

        );

        return deferred.promise;
    }

    $scope.selectLocationByGeoLocator = function() {
        var deferred = $q.defer();

        var promiseGetLocation = getLocation($q);

        promiseGetLocation.then(

            // Success
            function(position) {

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

                    deferred.resolve(position);
                }

                // Not accurate enough
                else {

                    // Stored locations
                    var promiseSelectLocationFromList = $scope.selectLocationFromList(position);

                    promiseSelectLocationFromList.then(

                        // Success
                        function(selectedPosition) {
                            deferred.resolve(selectedPosition);
                        },

                        // Error
                        function(error) {
                            var msg = 'selectLocationFromList: ' + error.message;
                            deferred.reject(msg);
                        }

                    );

                }

            },

            // Error
            function(error) {
                var msg = 'getLocation: ' + error.message;
                deferred.reject(msg);
            }

        );

        return deferred.promise;
    }

    $scope.selectLocationFromList = function (initialPosition) {
        var deferred = $q.defer();

        // Stored locations
        if ($localStorage.locations != undefined) {

            $scope.showLocationList(
                initialPosition,
                function(selectedPosition) {

                    // Location selected
                    if (selectedPosition != undefined) {
                        deferred.resolve(selectedPosition);
                    }

                    // Location Picker
                    else {
                        var promiseSelectLocationByPicker = $scope.selectLocationByPicker(initialPosition);

                        promiseSelectLocationByPicker.then(

                            // Success
                            function(pickedPosition) {
                                deferred.resolve(pickedPosition);
                            },

                            // Error
                            function(error) {
                                var msg = 'selectLocationByPicker: ' + error.message;
                                deferred.reject(msg);
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

                // Success
                function(pickedPosition) {
                    deferred.resolve(pickedPosition);
                },

                // Error
                function(error) {
                    var msg = 'selectLocationByPicker: ' + error.message;
                    deferred.reject(msg);
                }

            );
        }

        return deferred.promise;
    };

    $scope.selectLocationByPicker = function(initialPosition, markedPosition) {
        var deferred = $q.defer();

        $scope.showLocationPicker(
            initialPosition,
            markedPosition,
            function(pickedPosition) {
                deferred.resolve(pickedPosition);
            }
        );

        return deferred.promise;
    }

    $scope.initialize = function(locationMode, initialPosition, markedPosition) {

        $scope.reset();
        $scope.initializeScope();

        /*
         * Determine geo-location
         */

        var promiseSelectLocation = $scope.selectLocation(locationMode, initialPosition, markedPosition);

        var promiseLocationReady = promiseSelectLocation.then(

            // Success
            function (position) {
                $scope.geoPosition = position;

                return $scope.geoPosition;
            },

            // Error
            function (message) {
                return message;
            }

        );

        /*
         * Build and show timetable
         */

        promiseLocationReady.then(

            // Success
            function(position) {
                $scope.buildTimetable(position);
            },

            // Error
            function(message) {
                $scope.showErrorMessage(message);

                $scope.uiMode = undefined;
                $scope.$apply();
            }

        );

    }


    // Startup
    //$window.addEventListener("resize", $scope.adjustLocationPickerHeight());
    //$(window).resize($scope.adjustLocationPickerHeight());
    $scope.initialize($scope.LOCATION_MODE_AUTO);

}]);

app.directive('gyfCountdown', ['$interval', function($interval) {
    return {
        restrict: 'A',
        scope: {
            sourceTime: '=',
            targetTime: '='
        },
        link: function(scope, element, attrs) {
            var countdownInterval = undefined;

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

            // Watch
            //scope.$watch(attrs.sourceTime, function(value) {});
            //scope.$watch(attrs.targetTime, function(value) {});

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
