angular.module('ngModuleLocationPicker')
    .controller('ngControllerLocationPicker',
    [   '$scope',
        '$state',
        '$stateParams',
        '$q',
        '$localStorage',
        '$window',
        'STATE',
        'EVENT',
        'LOCATION_PICKER',
        function($scope, $state, $stateParams, $q, $localStorage, $window, STATE, EVENT, LOCATION_PICKER) {

            //
            $scope.deferredLocationPicker = $q.defer();
            $scope.promiseLocationPicker = $scope.deferredLocationPicker.promise;


            $scope.showLocationPicker = function(position, markedPosition, callback) {

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

                //TODO Elminiate JQuery
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
                //TODO Eliminate JQuery
                var windowHeight = $window.innerHeight;
                var top = $('#locationPickerPanel').offset().top;
                var innerHeight = $('#locationPickerPanel').height();
                var outerHeight = $('#locationPickerPanel').outerHeight(true);

                $('#locationPickerPanel').height(windowHeight - top - (outerHeight - innerHeight));

                $('#locationPicker').locationpicker('autosize');
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
                storedLocationArray = storedLocationArray.slice(0, LOCATION_PICKER.RECENT_LOCATION_COUNT);

                // To object
                storedLocations = {};
                angular.forEach(storedLocationArray, function(value, key, obj) {this[value.formattedAddress] = value;}, storedLocations);

                // Write storage
                $localStorage.recentLocations = storedLocations;

            }


            /*
             * Location picker
             */

            if (angular.isDefined($stateParams.initialPosition)) {

                $scope.showLocationPicker(
                    $stateParams.initialPosition,
                    $stateParams.markedPosition,
                    function(pickedPosition) {
                        $scope.deferredLocationPicker.resolve({targetState: STATE.TIMETABLE, position: pickedPosition});
                    }
                );

            }

            else {
                $scope.deferredLocationPicker.reject('Missing initial position');
            }


            /*
             * Result
             */

            $scope.promiseLocationPicker.then(

                // Success
                function(data) {

                    switch (data.targetState) {

                        case STATE.TIMETABLE:
                            var timetableParams = {
                                location: data.position
                            };

                            $state.go(data.targetState, timetableParams);

                            break;

                        default:
                            $scope.$emit(EVENT.ERROR_MESSAGE, 'locationPicker: Invalid target state');

                    }

                },

                // Error
                function(error) {
                    var msg = 'locationPicker: ' + error;
                    $scope.$emit(EVENT.ERROR_MESSAGE, msg);
                }

            );

        }
    ]
);
