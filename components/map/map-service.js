angular.module('ngModuleMap')
    .factory('ngServiceMap',
    [   '$q',
        'ngServiceBkkFutar',
        'MAP',
        'RECOMPILE',
        'TIMETABLE',
        function($q, ngServiceBkkFutar, MAP, RECOMPILE, TIMETABLE) {

            /*
             * Interface
             */

            var serviceInstance = {
                buildMap: function(trip, baseTime, zoomChangedListener, markerClickListener, previousMapPresentation) {return buildMap(trip, baseTime, zoomChangedListener, markerClickListener, previousMapPresentation);},
                handleMapZoomChange: function(mapPresentation) {return handleMapZoomChange(mapPresentation);}
            };


            /*
             * Functions
             */

            function handleMapZoomChange(mapPresentation) {
                var map = mapPresentation.map.control.getGMap();
                var currentZoomLevel = map.getZoom();


                /*
                 * Trip
                 */

                if (angular.isDefined(mapPresentation.trip)) {

                    // Stop Marker Labels

                    var actualTripStopMarkerModelArray = mapPresentation.trip.stopMarkers.models;

                    angular.forEach(
                        actualTripStopMarkerModelArray,
                        function(model, index, modelArray) {
                            modelArray[index] = generateTripStopMarkerLabel(model, mapPresentation.baseTime, currentZoomLevel);
                        }
                    );

                    mapPresentation = postProcessMapPresentation(mapPresentation);
                }


                /*
                 * Return
                 */

                return mapPresentation;
            }

            function generateTripStopMarkerLabel(tripStopMarkerModel, baseTime, currentZoomLevel) {
                var currentLabelExpansionLevel = undefined;

                if (currentZoomLevel < 15) currentLabelExpansionLevel = 0
                else if (currentZoomLevel < 16) currentLabelExpansionLevel = 1
                else currentLabelExpansionLevel = 2;

                // Need to update?
                if (angular.isUndefined(tripStopMarkerModel.labelExpansionLevel) || (tripStopMarkerModel.labelExpansionLevel != currentLabelExpansionLevel)) {
                    var labelClass = tripStopMarkerModel.isCurrent ? 'label label-success label-gmap' : 'label label-default label-gmap';
                    var needToRecompile = false;
                    var currentLabelContent = '';

                    switch (currentLabelExpansionLevel) {

                        case 0:
                            if (tripStopMarkerModel.isFirst || tripStopMarkerModel.isCurrent || tripStopMarkerModel.isLast) {
                                currentLabelContent += '<div>' + tripStopMarkerModel.stopName + '</div>';
                            }

                            break;

                        case 1:
                            currentLabelContent += '<div>' + tripStopMarkerModel.stopName + '</div>';

                            break;

                        case 2:
                            var baseTimeValue = (angular.isDefined(baseTime)) ? baseTime.getTime() : undefined;
                            var now = (angular.isDefined(baseTimeValue)) ? baseTimeValue : new Date();

                            currentLabelContent += '<div>' + tripStopMarkerModel.stopName + '</div>';
                            currentLabelContent += '<div>' + tripStopMarkerModel.stopTimeString + '</div>';

                            if (tripStopMarkerModel.isCurrent || (now <= tripStopMarkerModel.stopTime)) {
                                currentLabelContent += '<div data-gyf-countdown';
                                currentLabelContent += (angular.isDefined(baseTimeValue)) ? (' data-base-time-value="' + baseTimeValue + '"') : ' ';
                                currentLabelContent += ' data-target-time-value="';
                                currentLabelContent += tripStopMarkerModel.stopTime.getTime();
                                currentLabelContent += '"></div>';
                            }

                            break;

                    }

                    // Show label
                    if (currentLabelContent.length > 0) {
                        var currentLabelWrapper = '<div class="' + labelClass + ' ' + RECOMPILE.CLASS + '">' + currentLabelContent + '</div>';

                        tripStopMarkerModel.options.labelContent = currentLabelWrapper;
                        needToRecompile = true;
                    }

                    // No label
                    else {
                        tripStopMarkerModel.options.labelContent = undefined;
                        needToRecompile = false;
                    }

                    tripStopMarkerModel.labelExpansionLevel = currentLabelExpansionLevel;
                    tripStopMarkerModel.needToRecompile = needToRecompile;
                }

                return tripStopMarkerModel;
            }

            function processTripDetails(mapModel, data) {
                var entry = data.data.entry;
                var vehicle = entry.vehicle;
                var stopTimeArray = entry.stopTimes;
                var routeReferences = data.data.references.routes;
                var stopReferences = data.data.references.stops;
                var tripReferences = data.data.references.trips;
                var tripId = entry.tripId;
                var trip = tripReferences[tripId];
                var routeId = trip.routeId;
                var route = routeReferences[routeId];

                // Trip

                var targetTrip = {
                    id: tripId,
                    headsign: trip.tripHeadsign,
                    vehicle: undefined,
                    polylinePath: entry.polyline.points,
                    polylineCenterLat: undefined,
                    polylineCenterLon: undefined,
                    route: undefined,
                    stopTimes: []
                };

                targetTrip.polylinePath = google.maps.geometry.encoding.decodePath(entry.polyline.points);

                // StopTimes

                for (var stopTimeIndex = 0; stopTimeIndex < stopTimeArray.length; stopTimeIndex++) {
                    var actualStopTime = stopTimeArray[stopTimeIndex];
                    var actualStopId = actualStopTime.stopId;
                    var actualStop = stopReferences[actualStopId];

                    var targetStopTime = {
                        stop: undefined,
                        stopHeadsign: actualStopTime.stopHeadsign,
                        arrivalTime: actualStopTime.arrivalTime,
                        departureTime: actualStopTime.departureTime,
                        predictedArrivalTime: actualStopTime.predictedArrivalTime,
                        predictedDepartureTime: actualStopTime.predictedDepartureTime
                    };

                    // Stop

                    var targetStop =  {
                        id: actualStopId,
                        name: actualStop.name,
                        lat: actualStop.lat,
                        lon: actualStop.lon,
                        direction: actualStop.direction,
                        type: actualStop.type,
                        isCurrent: undefined,
                        isSubsequent: undefined,
                        isFirst: false,
                        isLast: false
                    };

                    targetStopTime.stop = targetStop;

                    targetTrip.stopTimes.push(targetStopTime);
                }

                // Vehicle

                if (angular.isObject(vehicle)) {

                    targetVehicle = {
                        id: vehicle.vehicleId,
                        stopId: vehicle.stopId,
                        bearing: vehicle.bearing,
                        lat: vehicle.location.lat,
                        lon: vehicle.location.lon,
                        licensePlate: vehicle.licensePlate,
                        label: vehicle.label,
                        lastUpdateTime: vehicle.lastUpdateTime,
                        status: vehicle.status
                    };

                    targetTrip.vehicle = targetVehicle;
                }

                // Route

                targetRoute = {
                    id: routeId,
                    shortName: route.shortName,
                    description: route.description,
                    type: route.type,
                    color: route.color,
                    textColor: route.textColor
                };

                targetTrip.route = targetRoute;

                mapModel.trip = targetTrip;


                return mapModel;
            }

            function postProcessMapModel(mapModel, currentStopId) {

                /*
                 * Trip calculated properties
                 */

                if (angular.isDefined(mapModel.trip)) {
                    var actualTrip = mapModel.trip;


                    // Trip properties

                    var polylineBounds = new google.maps.LatLngBounds(actualTrip.polylinePath[0], actualTrip.polylinePath[0]);

                    angular.forEach(actualTrip.polylinePath, function(value) {polylineBounds.extend(value);});

                    var polylineCenter = polylineBounds.getCenter();

                    actualTrip.polylineCenterLat = polylineCenter.lat();
                    actualTrip.polylineCenterLon = polylineCenter.lng();


                    // Stop properties

                    var actualStopTimeArray = actualTrip.stopTimes;

                    var isCurrent = false;
                    var isSubsequent = false;

                    angular.forEach(actualStopTimeArray, function(stopTime, index) {
                        var actualStop = stopTime.stop;

                        isSubsequent = isCurrent || isSubsequent;
                        isCurrent = (actualStop.id == currentStopId);

                        actualStop.isCurrent = isCurrent;
                        actualStop.isSubsequent = isSubsequent;
                        actualStop.isFirst = (index == 0);
                        actualStop.isLast = (index == (actualStopTimeArray.length - 1));
                    });

                }


                return mapModel;
            }

            function transformMapModelToPresentation(mapModel, zoomChangedListener, markerClickListener) {
                var actualTrip = mapModel.trip;
                var actualRoute = actualTrip.route;
                var actualStopTimes = actualTrip.stopTimes;
                var actualVehicle = actualTrip.vehicle;

                var mapPresentation = {
                    map: undefined,
                    trip: undefined,
                    baseTime: mapModel.baseTime,
                    baseTimeType: mapModel.baseTimeType,
                    buildTime: new Date(),
                    needToRecompile: false
                };


                /*
                 * Map
                 */

                var targetMap = {
                    center: {
                        latitude: actualTrip.polylineCenterLat,
                        longitude: actualTrip.polylineCenterLon
                    },
                    pan: false,
                    zoom: MAP.DEFAULT_ZOOM_LEVEL,
                    bounds: {
                        northeast: {
                            latitude: undefined,
                            longitude: undefined
                        },
                        southwest: {
                            latitude: undefined,
                            longitude: undefined
                        }
                    },
                    options: {
                        mapTypeControl: false,
                        streetViewControl: false,
                        styles: [
                            {
                                'featureType': 'transit.station',
                                'stylers': [
                                    {
                                        'visibility': 'off'
                                    }
                                ]
                            }
                        ]
                    },
                    events: {
                        zoom_changed: zoomChangedListener
                    },
                    control: {}
                };

                mapPresentation.map = targetMap;


                /*
                 * Trip
                 */

                var targetTrip = {
                    tripHeadsign: actualTrip.headsign,
                    routeName: actualRoute.shortName,
                    routeColor: ngServiceBkkFutar.convertColor(actualRoute.color),
                    routeTextColor: ngServiceBkkFutar.convertColor(actualRoute.textColor),
                    tripPolyline: {
                        path: actualTrip.polylinePath,
                        stroke: {
                            color: ngServiceBkkFutar.convertColor(actualRoute.color)
                        },
                        fit: true,
                        static: true
                    },
                    stopMarkers: {
                        models: [],
                        coords: 'coords',
                        icon: 'icon',
                        options: 'options',
                        click: markerClickListener
                    },
                    vehicleMarker: undefined
                };

                // StopMarkers

                for (stopTimeIndex = 0; stopTimeIndex < actualStopTimes.length; stopTimeIndex++) {
                    var actualStopTime = actualStopTimes[stopTimeIndex];
                    var actualStop = actualStopTime.stop;

                    var aggrStopTime = ngServiceBkkFutar.aggregateStopTime(actualStopTime);

                    var targetStopMarkerModel = {
                        id: actualStop.id,
                        coords: {
                            latitude: actualStop.lat,
                            longitude: actualStop.lon
                        },
                        icon: angular.copy(MAP.SYMBOL_NAVIGATION),
                        options: {
                            //labelClass: undefined,
                            labelContent: undefined
                        },
                        stopName: actualStop.name,
                        stopTime: aggrStopTime.stopTime,
                        stopTimeString: aggrStopTime.stopTimeString,
                        isCurrent: actualStop.isCurrent,
                        isSubsequent: actualStop.isSubsequent,
                        isFirst: actualStop.isFirst,
                        isLast: actualStop.isLast,
                        labelExpansionLevel: undefined,
                        needToRecompile: false
                    }

                    // Set stop marker icon direction
                    targetStopMarkerModel.icon.rotation = targetStopMarkerModel.icon.rotation + parseInt(actualStop.direction);

                    targetStopMarkerModel = generateTripStopMarkerLabel(targetStopMarkerModel, mapPresentation.baseTime, mapPresentation.map.zoom);

                    targetTrip.stopMarkers.models.push(targetStopMarkerModel);
                }

                // VehicleMarker

                if (angular.isDefined(actualVehicle)) {

                    var targetVehicleMarkerModel = {
                        idKey: actualVehicle.id,
                        coords: {
                            latitude: actualVehicle.lat,
                            longitude: actualVehicle.lon,
                        },
                        icon: angular.copy(MAP.SYMBOL_DIRECTIONS_TRANSIT),
                        options: {
                            //animation: google.maps.Animation.BOUNCE,
                            zIndex: 1000
                            //labelClass: labelClass,
                            //labelContent: actualStop.stopTimeString + ' - ' + actualStop.name
                        }
                    }

                    // Set vehicle marker icon color
                    targetVehicleMarkerModel.icon.fillColor = targetTrip.routeColor;
                    //targetVehicleMarkerModel.icon.strokeColor = targetTrip.routeColor;

                    targetTrip.vehicleMarker = targetVehicleMarkerModel;
                }


                mapPresentation.trip = targetTrip;


                /*
                 * Return
                 */

                return mapPresentation;
            }

            function postProcessMapPresentation(mapPresentation) {

                // Trip
                if (angular.isDefined(mapPresentation.trip)) {
                    var tripStopMarkers = mapPresentation.trip.stopMarkers;
                    var tripStopMarkerModels = tripStopMarkers.models;
                    var needToRecompile = false;

                    // needToRecompile

                    angular.forEach(tripStopMarkerModels, function(model, index, modelArray){
                        needToRecompile = needToRecompile || model.needToRecompile;
                    });

                    mapPresentation.needToRecompile = needToRecompile;

                }

                return mapPresentation;
            }

            function applyPreviousPresentationState(mapPresentation, previousMapPresentation) {

                if (angular.isDefined(previousMapPresentation)) {


                    /*
                     * Map
                     */

                    var map = previousMapPresentation.map.control.getGMap();

                    // Center

                    var mapCenter = map.getCenter();

                    mapPresentation.map.center.latitude = mapCenter.lat();
                    mapPresentation.map.center.longitude = mapCenter.lng();

                    // Zoom

                    var currentZoomLevel = map.getZoom();

                    mapPresentation.map.zoom = currentZoomLevel;

/*
                    // Bounds

                    var bounds = map.getBounds();

                    mapPresentation.map.bounds.northeast.latitude = bounds.getNorthEast().lat();
                    mapPresentation.map.bounds.northeast.longitude = bounds.getNorthEast().lng();
                    mapPresentation.map.bounds.southwest.latitude = bounds.getSouthWest().lat();
                    mapPresentation.map.bounds.southwest.longitude = bounds.getSouthWest().lng();
*/

                    // Control

                    mapPresentation.map.control = previousMapPresentation.map.control;


                    /*
                     * Trip
                     */

                    if (angular.isDefined(mapPresentation.trip)) {

                        // Stop Marker Labels

                        var actualTripStopMarkerModelArray = mapPresentation.trip.stopMarkers.models;

                        angular.forEach(actualTripStopMarkerModelArray, function(model, index, modelArray) {
                            modelArray[index] = generateTripStopMarkerLabel(model, mapPresentation.baseTime, mapPresentation.map.zoom);
                        });

                    }

                }

                return mapPresentation;
            }

            function buildMap(trip, baseTime, zoomChangedListener, markerClickListener, previousMapPresentation) {
                var deferred = $q.defer();

                var baseTimeType = undefined;

                if (angular.isDate(baseTime)) {
                    if (baseTime > new Date()) {
                        baseTimeType = TIMETABLE.BASE_TIME_TYPE_FUTURE;
                    }
                    else {
                        baseTimeType = TIMETABLE.BASE_TIME_TYPE_PAST;
                    }
                }
                else {
                    baseTimeType = TIMETABLE.BASE_TIME_TYPE_LIVE;
                }

                var mapModel = {
                    trip: undefined,
                    baseTime: baseTime,
                    baseTimeType: baseTimeType
                };

                var mapPresentation = undefined;


                /*
                 * Trip Details
                 */

                var promiseTripDetails = ngServiceBkkFutar.getTripDetails(trip.tripId);

                promiseTripDetails.then(

                    // Success
                    function(data) {
                        mapModel = processTripDetails(mapModel, data);
                        mapModel = postProcessMapModel(mapModel, trip.stopId);
                        mapPresentation = transformMapModelToPresentation(mapModel, zoomChangedListener, markerClickListener);
                        mapPresentation = applyPreviousPresentationState(mapPresentation, previousMapPresentation);
                        mapPresentation = postProcessMapPresentation(mapPresentation);

                        deferred.resolve(mapPresentation);
                    },

                    // Error
                    function(status) {
                        deferred.reject('getTripDetails: ' + status);
                    }

                );


                return deferred.promise;
            }


            /*
             * The service instance
             */

            return serviceInstance;

        }
    ]);
