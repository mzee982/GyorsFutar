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
                markedPosition: '=',
                pickPosition: '&',
                storeLocation: '&'
            },
            controller: ['$scope', function($scope) {
                $scope.inputAddress = undefined;
                $scope.inputLatitude = undefined;
                $scope.inputLongitude = undefined;
                $scope.inputRadius = undefined;
                $scope.locationPicker = undefined;

                this.pickPosition = function(pickedPosition) {
                    $scope.pickPosition({pickedPosition: pickedPosition});
                }

                this.storeLocation = function(location) {
                    $scope.storeLocation({location: location});
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
    .directive('gyfLocationPicker', ['EVENT', function(EVENT) {
        return {
            restrict: 'A',
            require: '^gyfLocationPickerContainer',
            scope: {},
            link: function(scope, element, attrs, ctrl) {

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
                    enableAutocomplete: true
                };

                ctrl.getLocationPicker().locationpicker(locationPickerOptions);

                // Auto size the map
                ctrl.getLocationPicker().locationpicker('autosize');


                /*
                 * Show marked position
                 */

                var markedPosition = ctrl.getMarkedPosition();
                var mapContext = ctrl.getLocationPicker().locationpicker('map');

                if (angular.isDefined(markedPosition)) {
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

                }


                /*
                 * Fit bounds
                 */

                fitBounds(ctrl);


                /*
                 * Event: adjust height
                 */

                scope.$on(EVENT.ADJUST_HEIGHT, function(event) {

                    // Auto size the map
                    ctrl.getLocationPicker().locationpicker('autosize');

                    // Fit bounds
                    fitBounds(ctrl);

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

                        var position = {coords: {latitude: latitude, longitude: longitude, accuracy: radius}, formattedAddress: locationName};

                        ctrl.storeLocation(position);
                        ctrl.pickPosition(position);
                    });

                }

                // Action radius change
                else if (scope.actionType == ACTION_TYPE.RADIUS_CHANGE) {

                    element.on('click', function() {
                        var latitude = parseFloat(ctrl.getInputLatitude().val()).toFixed(6);
                        var longitude = parseFloat(ctrl.getInputLongitude().val()).toFixed(6);

                        ctrl.getInputRadius().val(scope.radiusValue);
                        ctrl.getLocationPicker().locationpicker('location', {latitude: latitude, longitude: longitude, radius: scope.radiusValue});

                    });

                }

            }
        };
    }]);
