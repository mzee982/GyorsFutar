angular.module('ngModuleLocationPicker')
    .constant('INPUT_TYPE', {
        'ADDRESS': 'address',
        'LATITUDE': 'latitude',
        'LONGITUDE': 'longitude',
        'RADIUS': 'radius'
    })
    .constant('ACTION_TYPE', {
        'SUBMIT': 'submit',
        'RADIUS_CHANGE': 'radius-change'
    })
    .directive('gyfLocationPickerContainer', [function() {
        return {
            restrict: 'E',
            scope: {
                initialPosition: '=',
                detectedPosition: '=',
                markedPosition: '=',
                pickLocation: '&',
                pickerLocationChange: '&'
            },
            controller: ['$scope', function($scope) {
                $scope.inputAddress = undefined;
                $scope.inputLatitude = undefined;
                $scope.inputLongitude = undefined;
                $scope.inputRadius = undefined;
                $scope.locationPicker = undefined;

                this.pickLocation = function(pickedLocation) {
                    $scope.pickLocation({pickedLocation: pickedLocation});
                }

                this.pickerLocationChange = function(location) {

                    // Triggers UI update
                    $scope.$apply($scope.pickerLocationChange({location: location}));

                }

                this.setInputAddress = function(element) {
                    $scope.inputAddress = element;
                }

                this.setInputLatitude = function(element) {
                    $scope.inputLatitude = element;
                }

                this.setInputLongitude = function(element) {
                    $scope.inputLongitude = element;
                }

                this.setInputRadius = function(element) {
                    $scope.inputRadius = element;
                }

                this.setLocationPicker = function(element) {
                    $scope.locationPicker = element;
                }

                this.getInputAddress = function() {
                    return $scope.inputAddress;
                }

                this.getInputLatitude = function() {
                    return $scope.inputLatitude;
                }

                this.getInputLongitude = function() {
                    return $scope.inputLongitude;
                }

                this.getInputRadius = function() {
                    return $scope.inputRadius;
                }

                this.getInitialPosition = function() {
                    return $scope.initialPosition;
                }

                this.getDetectedPosition = function() {
                    return $scope.detectedPosition;
                }

                this.getMarkedPosition = function() {
                    return $scope.markedPosition;
                }

                this.getLocationPicker = function() {
                    return $scope.locationPicker;
                }

            }]
        };
    }])
    .directive('gyfLocationPickerPanel', ['$window', function($window) {
        return {
            restrict: 'A',
            require: '^gyfLocationPickerContainer',
            scope: {},
            controller: ['$element', '$window', function($element, $window) {
/*

                // Adjust location picker height

                var windowHeight = $window.innerHeight;
                var top = $element.offset().top;
                var innerHeight = $element.height();
                var outerHeight = $element.outerHeight(true);

                $element.height(windowHeight - top - (outerHeight - innerHeight));

*/
            }]
        };
    }])
    .directive('gyfLocationPicker', ['$timeout', '$window', 'ngServiceUtils', 'EVENT', 'LOCATION', 'LOCATION_PICKER', function($timeout, $window, ngServiceUtils, EVENT, LOCATION, LOCATION_PICKER) {
        return {
            restrict: 'A',
            require: '^gyfLocationPickerContainer',
            scope: {},
            link: function(scope, element, attrs, ctrl) {
                var debouncedMapResizeHandler = ngServiceUtils.debounce(mapResizeHandler, LOCATION_PICKER.MAP_RESIZE_HANDLER_DEBOUNCE_WAIT);

                function fitBounds(ctrl) {
                    var mapContext = ctrl.getLocationPicker().locationpicker('map');
                    var location = ctrl.getLocationPicker().locationpicker('location');

                    var circleOptions = {
                        radius: location.radius * 1,
                        center: new google.maps.LatLng(location.latitude, location.longitude)
                    };
                    var circle = new google.maps.Circle(circleOptions);
                    var circleBounds = circle.getBounds();

                    mapContext.map.fitBounds(circleBounds);
                }

                function mapResizeHandler(event) {

                    // Auto size the map
                    event.data.ctrl.getLocationPicker().locationpicker('autosize');

                    // Fit bounds
                    fitBounds(event.data.ctrl);

                }

                ctrl.setLocationPicker(element);


                /*
                 * Initialize location picker map
                 */

                var position = ctrl.getInitialPosition();

                var locationPickerOptions = {
                    location: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude},
                    radius: position.coords.accuracy,
                    inputBinding: {
                        latitudeInput: ctrl.getInputLatitude(),
                        longitudeInput: ctrl.getInputLongitude(),
                        radiusInput: ctrl.getInputRadius(),
                        locationNameInput: ctrl.getInputAddress()
                    },
                    enableAutocomplete: true,
                    oninitialized: function(component) {

                        // Force refresh the address input field
                        ctrl.getInputAddress().focus();
                        ctrl.getInputAddress().blur();

                        // Initial location change

                        var pickerLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            radius: position.coords.accuracy
                        };

                        ctrl.pickerLocationChange(pickerLocation);

                    },
                    onchanged: function(currentLocation, radius, isMarkerDropped) {

                        // Notify about change

                        var newLocation = {
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                            radius: radius
                        };

                        ctrl.pickerLocationChange(newLocation);

                    }
                };

                ctrl.getLocationPicker().locationpicker(locationPickerOptions);

                // Auto size the map
                ctrl.getLocationPicker().locationpicker('autosize');

                // Add map click listener

                var mapContext = ctrl.getLocationPicker().locationpicker('map');
                var mapClickTimeout = undefined;

                mapContext.map.addListener(
                    'click',
                    function(e) {
                        if (angular.isDefined(mapClickTimeout)) $timeout.cancel(mapClickTimeout);

                        mapClickTimeout = $timeout(
                            function() {
                                var newLocation = {
                                    latitude: e.latLng.lat(),
                                    longitude: e.latLng.lng(),
                                    radius: LOCATION.ACCURACY_MIN_SEARCH_RADIUS
                                };

                                // Set new location
                                ctrl.getLocationPicker().locationpicker('location', newLocation);

                                // Notify about change
                                ctrl.pickerLocationChange(newLocation);

                            },
                            LOCATION_PICKER.CLICK_CANCELLATION_TIMEOUT,
                            false);
                    }
                );

                mapContext.map.addListener(
                    'dblclick',
                    function(e) {
                        if (angular.isDefined(mapClickTimeout)) $timeout.cancel(mapClickTimeout);
                    }
                );


                /*
                 * Show detected position
                 */

                var detectedPosition = ctrl.getDetectedPosition();

                if (angular.isDefined(detectedPosition)) {
                    var mapContext = ctrl.getLocationPicker().locationpicker('map');
                    var detectedLatLng = new google.maps.LatLng(detectedPosition.coords.latitude, detectedPosition.coords.longitude);

                    // Marker
                    var detectedPositionMarker = new google.maps.Marker({
                        position: detectedLatLng,
                        icon: LOCATION_PICKER.SYMBOL_DIRECTIONS_WALK,
                        map: mapContext.map,
                        title: detectedPosition.formattedAddress + ' (accuracy: ' + detectedPosition.coords.detectedAccuracy + ' m)'
                    });

                    // Circle
                    var detectedPositionCircle = new google.maps.Circle({
                        strokeWeight: 0,
                        fillColor: '#0000FF',
                        fillOpacity: 0.15,
                        clickable: false,
                        map: mapContext.map,
                        center: detectedLatLng,
                        radius: detectedPosition.coords.detectedAccuracy
                    });

                }


                /*
                 * Show marked position
                 */

                var markedPosition = ctrl.getMarkedPosition();

                if (angular.isDefined(markedPosition)) {
                    var mapContext = ctrl.getLocationPicker().locationpicker('map');
                    var markedLatLng = new google.maps.LatLng(markedPosition.stopLat, markedPosition.stopLon);

                    // Marker
                    var marker = new google.maps.Marker({
                        position: markedLatLng,
                        icon: LOCATION_PICKER.SYMBOL_PIN_DROP,
                        map: mapContext.map,
                        title: markedPosition.routeName
                    });

                    // Info Window

                    var markedContentString =
                        '<div>' +
                            '<div>' +
                                '<span>' + markedPosition.routeName + '</span>' +
                                '&nbsp;' +
                                '<span>' + markedPosition.name + '</span>' +
                            '</div>' +
                            '<div>' + markedPosition.stopTimeString + '</div>' +
                        '</div>';

                    var infoWindow = new google.maps.InfoWindow({content: markedContentString});

                    marker.addListener('click', function() {
                        infoWindow.open(mapContext.map, marker);
                    });

                    infoWindow.open(mapContext.map, marker);

                }


                /*
                 * Fit bounds
                 */

                fitBounds(ctrl);


                /*
                 * Event: adjust height
                 */

                scope.$on(EVENT.ADJUST_HEIGHT, function(event) {
                    mapResizeHandler(ctrl);
                });


                /*
                 * Event: window resize
                 */

                // Register
                angular.element($window).on('resize', {ctrl: ctrl}, debouncedMapResizeHandler);


                /*
                 * Element destroy event
                 */

                element.on('$destroy', function() {

                    // Unregister window resize event handler
                    angular.element($window).off('resize', debouncedMapResizeHandler);
                    debouncedMapResizeHandler.cancel();

                });

            }
        };
    }])
    .directive('gyfLocationPickerInput', ['INPUT_TYPE', function(INPUT_TYPE) {
        return {
            restrict: 'A',
            require: '^gyfLocationPickerContainer',
            scope: {
                inputType: '@gyfLocationPickerInput'
            },
            link: function(scope, element, attrs, ctrl) {

                // Register inputs in controller
                switch (scope.inputType) {
                    case INPUT_TYPE.ADDRESS:
                        ctrl.setInputAddress(element);

                        element.on('click', function() {
                            element.select();
                        });

                        break;
                    case INPUT_TYPE.LATITUDE:
                        ctrl.setInputLatitude(element);
                        break;
                    case INPUT_TYPE.LONGITUDE:
                        ctrl.setInputLongitude(element);
                        break;
                    case INPUT_TYPE.RADIUS:
                        ctrl.setInputRadius(element);
                        break;
                }

            }
        };
    }])
    .directive('gyfLocationPickerAction', ['ACTION_TYPE', function(ACTION_TYPE) {
        return {
            restrict: 'A',
            require: '^gyfLocationPickerContainer',
            scope: {
                actionType: '@gyfLocationPickerAction',
                radiusValue: '@'
            },
            link: function(scope, element, attrs, ctrl) {

                // Action submit
                if (scope.actionType == ACTION_TYPE.SUBMIT) {

                    element.on('click', function() {
                        var latitude = parseFloat(ctrl.getInputLatitude().val()).toFixed(6);
                        var longitude = parseFloat(ctrl.getInputLongitude().val()).toFixed(6);
                        var radius = ctrl.getInputRadius().val();
                        var locationName = ctrl.getInputAddress().val();

                        var pickedLocation = {coords: {latitude: latitude, longitude: longitude, accuracy: radius}, formattedAddress: locationName};

                        ctrl.pickLocation(pickedLocation);
                    });

                }

                // Action radius change
                else if (scope.actionType == ACTION_TYPE.RADIUS_CHANGE) {

                    element.on('click', function() {
                        var latitude = parseFloat(ctrl.getInputLatitude().val()).toFixed(6);
                        var longitude = parseFloat(ctrl.getInputLongitude().val()).toFixed(6);

                        var newLocation = {latitude: latitude, longitude: longitude, radius: scope.radiusValue};

                        // Update radius input
                        ctrl.getInputRadius().val(newLocation.radius);

                        // Set new location
                        ctrl.getLocationPicker().locationpicker('location', {latitude: latitude, longitude: longitude, radius: scope.radiusValue});

                        // Notify about change
                        ctrl.pickerLocationChange(newLocation);

                    });

                }

            }
        };
    }]);
