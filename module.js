
function getLocation() {
    var deferredObject = $.Deferred();

    if(geoPosition.init()) {
        geoPosition.getCurrentPosition(
            function(position) {deferredObject.resolve(position);},
            function(error) {deferredObject.reject(error);},
            {enableHighAccuracy:true});
    } else {
        deferredObject.reject({message: 'You cannot use Geolocation in this device', code: 0});
    }

    return deferredObject.promise();
}

function getStopsForLocation(position) {
    var deferredObject = $.Deferred();

    var url = 'http://futar.bkk.hu/bkk-utvonaltervezo-api/ws/otp/api/where/stops-for-location.json?lat=$LATITIUDE&lon=$LONGITUDE&radius=$RADIUS';
    url = url.replace('$LATITIUDE', position.coords.latitude);
    url = url.replace('$LONGITUDE', position.coords.longitude);
    url = url.replace('$RADIUS', 500);

    console.info('getStopsForLocation URL: ' + url);

    $.ajax({
        url: url,
        jsonp: 'callback',
        dataType: 'jsonp',
        success: function(data) {deferredObject.resolve(data);},
        error: function(xhr, status, errorThrown) {deferredObject.reject(status + ' ' + errorThrown);}
    });

    return deferredObject.promise();
}

function getArrivalsAndDeparturesForStop(stopIds, parentStationIndex) {
    var deferredObject = $.Deferred();

    var url = 'http://futar.bkk.hu/bkk-utvonaltervezo-api/ws/otp/api/where/arrivals-and-departures-for-stop.json';

    if (stopIds.length > 0) {
        url = url + '?stopId=' + stopIds[0];

        for (var i = 1; i < stopIds.length; i++) {
            url = url + '&stopId=' + stopIds[i];
        }
    }

    console.info('getArrivalsAndDeparturesForStop URL: ' + url);

    $.ajax({
        url: url,
        jsonp: 'callback',
        dataType: 'jsonp',
        success: function(data) {
            deferredObject.resolve(data, parentStationIndex);
        },
        error: function(xhr, status, errorThrown) {
            deferredObject.reject(status + ' ' + errorThrown);
        }
    });

    return deferredObject.promise();
}

function organizeStopsToParentStations(data, position) {
    var stops = data.data.list;
    var parentStationArray = [];

    // Sort by parentStationId
    stops.sort(function(a, b){return a.parentStationId.localeCompare(b.parentStationId)});

    // Build parentStationArray
    var actualParentStationId = '';
    for (var i = 0; i < stops.length; i++) {
        var actualStop = stops[i];

        // Create new parentStation
        if (actualParentStationId != actualStop.parentStationId) {
            actualParentStationId = actualStop.parentStationId;
            var actualParentStation = {name: actualStop.name, stopIds: [], routeIds: [], minDistance: 0, stops: [], routes: []};
            parentStationArray.push(actualParentStation);
        }

        // Calculate stop distance
        var fromLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        var toLatLng = new google.maps.LatLng(actualStop.lat, actualStop.lon);

        actualStop.distance = google.maps.geometry.spherical.computeDistanceBetween(fromLatLng, toLatLng);

        // Add stop to parentStation
        parentStationArray[parentStationArray.length - 1].stops.push(actualStop);

    }

    // Sort parentStation stops by ascending distance
    for (var parentStationIndex = 0; parentStationIndex < parentStationArray.length; parentStationIndex++) {
        var actualParentStation = parentStationArray[parentStationIndex];

        // Sort by ascending distance
        actualParentStation.stops.sort(function(a, b){return a.distance - b.distance});

        // Calculate parentStation min distance
        actualParentStation.minDistance = actualParentStation.stops[0].distance;

        // Collect stopIds and routeIds
        for (var stopIndex = 0; stopIndex < actualParentStation.stops.length; stopIndex++) {
            var actualStop = actualParentStation.stops[stopIndex];

            // stopId
            actualParentStation.stopIds.push(actualStop.id);

            // routeId
            for (var routeIdIndex = 0; routeIdIndex < actualStop.routeIds.length; routeIdIndex++) {
                if (actualParentStation.routeIds.indexOf(actualStop.routeIds[routeIdIndex]) < 0) {
                    actualParentStation.routeIds.push(actualStop.routeIds[routeIdIndex]);
                }
            }
        }

    }

    // Sort parentStationArray by ascending minDistance
    parentStationArray.sort(function(a, b){return a.minDistance - b.minDistance});

    return parentStationArray;

}

function organizeStopTimesToRoutesAndDirections(data, routeIds) {
    var stopTimes = data.data.entry.stopTimes;
    var trips = data.data.references.trips;
    var routes = data.data.references.routes;
    var routeArray = [];

    // Sort by route, direction and departureTime
    stopTimes.sort(
        function(a, b) {
            var tripA = trips[a.tripId];
            var tripB = trips[b.tripId];

            // route
            var routeComparison = tripA.routeId.localeCompare(tripB.routeId);

            // direction
            if (routeComparison == 0) {
                var directionComparison = tripA.directionId - tripB.directionId;

                // departureTime
                if (directionComparison == 0) {
                    var departureTimeA = a.departureTime;
                    var departureTimeB = b.departureTime;

                    if (angular.isDefined(a.predictedDepartureTime)) departureTimeA = a.predictedDepartureTime;
                    if (angular.isDefined(b.predictedDepartureTime)) departureTimeB = b.predictedDepartureTime;

                    var departureTimeComparison = departureTimeA - departureTimeB;

                    return departureTimeComparison;
                }
                else {
                    return directionComparison;
                }
            }
            else {
                return routeComparison;
            }
        });

    // Build routesArray
    var actualRouteId = '';
    var actualDirectionId = '';

    for (var i = 0; i < stopTimes.length; i++) {
        var actualStopTime = stopTimes[i];
        var actualTrip = trips[actualStopTime.tripId];

        // Create new route
        if (actualRouteId != actualTrip.routeId) {
            actualRouteId = actualTrip.routeId;
            actualDirectionId = '';
            var actualRoute = {id: actualRouteId, route: routes[actualRouteId], directions: []};
            routeArray.push(actualRoute);
        }

        // Create new direction
        if (actualDirectionId != actualTrip.directionId) {
            actualDirectionId = actualTrip.directionId;
            var actualDirection = {id: actualDirectionId, stopTimes: []};
            routeArray[routeArray.length - 1].directions.push(actualDirection);
        }

        // Add stopTime to routesArray
        actualStopTime.trip = actualTrip;
        routeArray[routeArray.length - 1].directions[routeArray[routeArray.length - 1].directions.length - 1].stopTimes.push(actualStopTime);

    }

    // Sort routeArray by ascending stop distance of routes
    routeArray.sort(
        function(a, b) {
            return routeIds.indexOf(a.id) - routeIds.indexOf(b.id);
        });

    return routeArray;

}

function buildParentStationModel(parentStationArray, parentStationIndex) {
    /*
     {
     name: '',
     routes: [
     {
     name: '',
     description:'',
     tripLeft: {
     name: '',
     stopTime: 0
     },
     tripRight: {
     name: '',
     stopTime: 0
     }
     }
     ]
     }
     */
    var actualDate = new Date();
    var parentStation = parentStationArray[parentStationIndex];
    var parentStationModel = {name: '', routes: []};

    parentStationModel.name = parentStation.name;

    // routes
    for (var routeIndex = 0; routeIndex < parentStation.routes.length; routeIndex++) {
        var route = parentStation.routes[routeIndex];
        var routeModel = {name: '', description:'', tripLeft: undefined, tripRight: undefined};

        routeModel.name = route.route.shortName
        routeModel.description = route.route.description;

        // trips
        for (var directionIndex = 0; directionIndex < route.directions.length; directionIndex++) {
            var trip = route.directions[directionIndex];
            var tripModel = {name: '', stopTime: 0, stopTimeString: ''};

            // stopTimes
            for (var stopTimeIndex = 0; stopTimeIndex < trip.stopTimes.length; stopTimeIndex++) {
                var stopTime = trip.stopTimes[stopTimeIndex];
                var departureTime = stopTime.departureTime;

                if (angular.isDefined(stopTime.predictedDepartureTime)) departureTime = stopTime.predictedDepartureTime;

                var departureDate = new Date(departureTime * 1000);

                if (departureDate > actualDate) {
                    tripModel.name = stopTime.trip.tripHeadsign;
                    tripModel.stopTime = departureDate;
                    tripModel.stopTimeString = departureDate.toLocaleTimeString();

                    break;
                }

            }

            // tripLeft
            if (trip.id == 0) {
                routeModel.tripLeft = tripModel;
            }
            // tripRight
            else if (trip.id == 1) {
                routeModel.tripRight = tripModel;
            }
            // tripLeft
            else if (routeModel.tripLeft == undefined) {
                routeModel.tripLeft = tripModel;
            }
            // tripRight
            else if (routeModel.tripRight == undefined) {
                routeModel.tripRight = tripModel;
            }

        }

        parentStationModel.routes.push(routeModel);
    }

    return parentStationModel;

}

function buildTimetable() {
    var deferredObject = $.Deferred();

    var geoPosition = undefined;
    var parentStationArray = undefined;
    var timetableModel = undefined;

    /*
     * Geolocation
     */

    var promiseGetLocation = getLocation();
    var promiseGetStopsForLocation = promiseGetLocation.then(

        // Done
        function(position) {

            //TODO Mock location: Orbánhegyi
            position = {coords: {latitude: 47.497418, longitude: 19.013673}};

            geoPosition = position;

            // StopsForLocation
            return getStopsForLocation(geoPosition);

        },

        // Fail
        function(error) {
            deferredObject.reject('getLocation: ' + error.message);
        }

    );

    /*
     * Stops for location
     */

    var promiseArrivalsAndDeparturesForStop = promiseGetStopsForLocation.then(

        // Done
        function(data) {
            parentStationArray = organizeStopsToParentStations(data, geoPosition);
            var promiseArrayArrivalsAndDeparturesForStop = [];

            for (var i = 0; i < parentStationArray.length; i++) {

                // ArrivalsAndDeparturesForStop
                promiseArrayArrivalsAndDeparturesForStop.push(getArrivalsAndDeparturesForStop(
                    parentStationArray[i].stopIds,
                    i));

            }

            return $.when.apply($, promiseArrayArrivalsAndDeparturesForStop);
        },

        // Fail
        function(status) {
            deferredObject.reject('getStopsForLocation: ' + status);
        }

    );

    /*
     * Arrivals and departures for stop
     */

    promiseArrivalsAndDeparturesForStop.then(

        // Done
        function() {
            for (var argIndex = 0; argIndex < arguments.length; argIndex++) {
                var data = arguments[argIndex][0];
                var parentStationIndex = arguments[argIndex][1];

                var routeArray = organizeStopTimesToRoutesAndDirections(data, parentStationArray[parentStationIndex].routeIds);

                parentStationArray[parentStationIndex].routes = routeArray;
                timetableModel[parentStationIndex] = buildParentStationModel(parentStationArray, parentStationIndex);
            }

            deferredObject.resolve(timetableModel);
        },

        // Fail
        function(status) {
            deferredObject.reject('getArrivalsAndDeparturesForStop: ' + status);
        }

    );

    return deferredObject.promise();
}

function _getArrivalsAndDeparturesForStop(stopIdArray) {
    var deferredObject = $.Deferred();

    var url = 'http://futar.bkk.hu/bkk-utvonaltervezo-api/ws/otp/api/where/arrivals-and-departures-for-stop.json';

    if (stopIdArray.length > 0) {
        url = url + '?stopId=' + stopIdArray[0];

        for (var i = 1; i < stopIdArray.length; i++) {
            url = url + '&stopId=' + stopIdArray[i];
        }
    }

    console.info('getArrivalsAndDeparturesForStop URL: ' + url);

    $.ajax({
        url: url,
        jsonp: 'callback',
        dataType: 'jsonp',
        success: function(data) {
            deferredObject.resolve(data);
        },
        error: function(xhr, status, errorThrown) {
            deferredObject.reject(status + ' ' + errorThrown);
        }
    });

    return deferredObject.promise();
}

function _processStopsForLocationResponse(timetableModel, data) {
    var stopArray = data.data.list;
    var routeReferences = data.data.references.routes;

    // Stops
    for (stopIndex = 0; stopIndex < stopArray.length; stopIndex++) {
        var stop = stopArray[stopIndex];
        var stopRouteIdArray = stop.routeIds;
        var stopRoutes = {};

        // Stop routes
        for (routeIndex = 0; routeIndex < stopRouteIdArray.length; routeIndex++) {
            var routeId = stopRouteIdArray[routeIndex];
            var route = routeReferences[routeId];

            stopRoutes[routeId] = {
                id: route.id,
                shortName: route.shortName,
                description: route.description,
                trips: {},
                minDistance: undefined
            };
        }

        // Feed timetableModel
        timetableModel.stops[stop.id] = {
            id: stop.id,
            name: stop.name,
            parentStationId: stop.parentStationId,
            routes: stopRoutes,
            lat: stop.lat,
            lon: stop.lon,
            distance: undefined
        };

    }

    return timetableModel;
}

function _processArrivalsAndDeparturesForStopResponse(timetableModel, data) {
    var stopTimeArray = data.data.entry.stopTimes;
    var tripReferences = data.data.references.trips;

    // StopTimes
    for (stopTimeIndex = 0; stopTimeIndex < stopTimeArray.length; stopTimeIndex++) {
        var stopTime = stopTimeArray[stopTimeIndex];
        var stopId = stopTime.stopId;
        var tripId = stopTime.tripId
        var trip = tripReferences[tripId];
        var routeId = trip.routeId;

        var tripStopTime = {
            stopId: stopTime.stopId,
            departureTime: stopTime.departureTime,
            predictedDepartureTime: stopTime.predictedDepartureTime
        };

        // Feed timetableModel
        timetableModel.stops[stopId].routes[routeId].trips[tripId] = {
            id: trip.id,
            tripHeadsign: trip.tripHeadsign,
            directionId: trip.directionId,
            stopTime: tripStopTime
        };

    }

    return timetableModel;
}

function _transformTimetableModelToPresentation(timetableModel, position) {
    var actualDate = new Date();
    var timetablePresentation = {
        parentStations: []
    };
    var stops = timetableModel.stops;
    var parentStations =  {};

    /*
     * Merge Stops into ParentStations
     * Calculate distances for Stops, Routes and ParentStations
     * Merge Trips and StopTimes into Routes
     */

    for (stopId in stops) {
        var actualStop = stops[stopId];

        // Calculate distances for Stops

        var fromLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        var toLatLng = new google.maps.LatLng(actualStop.lat, actualStop.lon);

        actualStop.distance = google.maps.geometry.spherical.computeDistanceBetween(fromLatLng, toLatLng);

        // Calculate min distances for Routes

        var actualStopRoutes = actualStop.routes;

        for (routeId in actualStopRoutes) {
            actualStopRoutes[routeId].minDistance = actualStop.distance;
        }

        // Merge Stops into ParentStations

        if (parentStations[actualStop.parentStationId] == undefined) {
            parentStations[actualStop.parentStationId] = {
                name: actualStop.name,
                minDistance: actualStop.distance,
                routes: {}
            };

        }

        var parentStation = parentStations[actualStop.parentStationId];

        // Recalculate min distance for ParentStation
        if (actualStop.distance < parentStation.minDistance) parentStation.minDistance = actualStop.distance;

        // Merge Routes into ParentStation

        for (routeId in actualStopRoutes) {
            var actualStopRoute = actualStopRoutes[routeId];

            if (parentStation.routes[routeId] == undefined) {
                parentStation.routes[routeId] = {
                    name: actualStopRoute.shortName,
                    description: actualStopRoute.description,
                    minDistance: actualStopRoute.minDistance,
                    tripLeft: [],
                    tripRight: []
                };
            }

            var parentStationRoute = parentStation.routes[routeId];

            // Recalculate min distance for Route
            if (actualStopRoute.minDistance < parentStationRoute.minDistance) parentStationRoute.minDistance = actualStopRoute.minDistance;

            // Merge Trips and StopTimes into Routes

            for (tripId in actualStopRoute.trips) {
                var actualRouteTrip = actualStopRoute.trips[tripId];
                var actualTripStopTime = actualRouteTrip.stopTime;

                var stopTime = (actualTripStopTime.predictedDepartureTime == undefined) ?
                    actualTripStopTime.departureTime : actualTripStopTime.predictedDepartureTime;
                var stopTimeDate = new Date(stopTime * 1000);

                var routeStopTime = {
                    name: actualRouteTrip.tripHeadsign,
                    stopTime: stopTimeDate,
                    stopTimeString: stopTimeDate.toLocaleTimeString()
                };

                if (actualRouteTrip.directionId == 0) {
                    parentStationRoute.tripLeft.push(routeStopTime);
                }
                else if (actualRouteTrip.directionId == 1) {
                    parentStationRoute.tripRight.push(routeStopTime);
                }
                else {
                    //TODO Check
                    parentStationRoute.tripLeft.push(routeStopTime);
                }

            }

        }

    }

    /*
     * Convert Objects (Associative Array) to Arrays
     * Sort presentation data
     * Select StopTimes
     */

    for (parentStationId in parentStations) {
        var parentStation = parentStations[parentStationId];
        var parentStationRouteArray = [];

        // Routes to Array
        for (routeId in parentStation.routes) {

            // Sort StopTimes by ascending StopTimes

            parentStation.routes[routeId].tripLeft.sort(function(a, b) {
                return a.stopTime - b.stopTime;
            });

            parentStation.routes[routeId].tripRight.sort(function(a, b) {
                return a.stopTime - b.stopTime;
            });

            // Select actual StopTimes
            var selectedRouteStopTimeTripLeft = undefined;

            for (var i = 0; i < parentStation.routes[routeId].tripLeft.length; i++) {
                var routeStopTime = parentStation.routes[routeId].tripLeft[i];
                var routeStopTimeMillis = new Date(routeStopTime.stopTime * 1000);

                if (routeStopTimeMillis > actualDate) {
                    selectedRouteStopTimeTripLeft = routeStopTime;
                    break;
                }
            }

            parentStation.routes[routeId].tripLeft = selectedRouteStopTimeTripLeft;

            // Select actual StopTimes
            var selectedRouteStopTimeTripRight = undefined;

            for (var i = 0; i < parentStation.routes[routeId].tripRight.length; i++) {
                var routeStopTime = parentStation.routes[routeId].tripRight[i];
                var routeStopTimeMillis = new Date(routeStopTime.stopTime * 1000);

                if (routeStopTimeMillis > actualDate) {
                    selectedRouteStopTimeTripRight = routeStopTime;
                    break;
                }
            }

            parentStation.routes[routeId].tripRight = selectedRouteStopTimeTripRight;

            //
            parentStationRouteArray.push(parentStation.routes[routeId]);
        }

        // Sort Routes by ascending min distance
        parentStationRouteArray.sort(function(a, b) {
            return a.minDistance - b.minDistance;
        });

        parentStation.routes = parentStationRouteArray;

        // ParentStations to Array
        timetablePresentation.parentStations.push(parentStation);
    }

    // Sort ParentStations by ascending min distance
    timetablePresentation.parentStations.sort(function(a, b) {
        return a.minDistance - b.minDistance;
    });

    return timetablePresentation;
}

function _buildTimetable() {
    var deferredObject = $.Deferred();

    var geoPosition = undefined;
    var timetableModel = {
        getStopIds: function() {
            var stopIdArray = [];

            for (stopId in this.stops) {
                stopIdArray.push(this.stops[stopId].id);
            }

            return stopIdArray;
        },
        stops: {}
    };
    var timetablePresentation = undefined;


    /*
     * Geolocation
     */

    var promiseGetLocation = getLocation();
    var promiseGetStopsForLocation = promiseGetLocation.then(

        // Done
        function(position) {

            //TODO Mock location: Orbánhegyi
            position = {coords: {latitude: 47.497418, longitude: 19.013673}};

            geoPosition = position;

            // StopsForLocation
            return getStopsForLocation(geoPosition);

        },

        // Fail
        function(error) {
            deferredObject.reject('getLocation: ' + error.message);
        }

    );

    /*
     * Stops for location
     */

    var promiseArrivalsAndDeparturesForStop = promiseGetStopsForLocation.then(

        // Done
        function(data) {
            timetableModel = _processStopsForLocationResponse(timetableModel, data);

            return _getArrivalsAndDeparturesForStop(timetableModel.getStopIds());
        },

        // Fail
        function(status) {
            deferredObject.reject('getStopsForLocation: ' + status);
        }

    );

    /*
     * Arrivals and departures for stop
     */

    promiseArrivalsAndDeparturesForStop.then(

        // Done
        function(data) {

            timetableModel = _processArrivalsAndDeparturesForStopResponse(timetableModel, data);

            timetablePresentation = _transformTimetableModelToPresentation(timetableModel, geoPosition);

            deferredObject.resolve(timetablePresentation);
        },

        // Fail
        function(status) {
            deferredObject.reject('getArrivalsAndDeparturesForStop: ' + status);
        }

    );

    return deferredObject.promise();
}
