
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

function getArrivalsAndDeparturesForStop(stopIdArray) {
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

function processStopsForLocationResponse(timetableModel, data) {
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

function processArrivalsAndDeparturesForStopResponse(timetableModel, data) {
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

function transformTimetableModelToPresentation(timetableModel, position) {
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
                routeGroups: {}
            };

        }

        var parentStation = parentStations[actualStop.parentStationId];

        // Recalculate min distance for ParentStation
        if (actualStop.distance < parentStation.minDistance) parentStation.minDistance = actualStop.distance;

        // Merge Routes into ParentStation

        for (routeId in actualStopRoutes) {
            var actualStopRoute = actualStopRoutes[routeId];

            if (parentStation.routeGroups[routeId] == undefined) {
                parentStation.routeGroups[routeId] = {
                    id: actualStopRoute.id,
                    name: actualStopRoute.shortName,
                    description: actualStopRoute.description,
                    minDistance: actualStopRoute.minDistance,
                    tripLeft: [],
                    tripRight: []
                };
            }

            var parentStationRoute = parentStation.routeGroups[routeId];

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

        // Routes to Array
        for (routeId in parentStation.routeGroups) {

            // Sort StopTimes by ascending StopTimes

            parentStation.routeGroups[routeId].tripLeft.sort(function(a, b) {
                return a.stopTime - b.stopTime;
            });

            parentStation.routeGroups[routeId].tripRight.sort(function(a, b) {
                return a.stopTime - b.stopTime;
            });

            // Select actual StopTimes
            var selectedRouteStopTimeTripLeft = undefined;

            for (var i = 0; i < parentStation.routeGroups[routeId].tripLeft.length; i++) {
                var routeStopTime = parentStation.routeGroups[routeId].tripLeft[i];

                if (routeStopTime.stopTime > actualDate) {
                    selectedRouteStopTimeTripLeft = routeStopTime;
                    break;
                }
            }

            parentStation.routeGroups[routeId].tripLeft = selectedRouteStopTimeTripLeft;

            // Select actual StopTimes
            var selectedRouteStopTimeTripRight = undefined;

            for (var i = 0; i < parentStation.routeGroups[routeId].tripRight.length; i++) {
                var routeStopTime = parentStation.routeGroups[routeId].tripRight[i];

                if (routeStopTime.stopTime > actualDate) {
                    selectedRouteStopTimeTripRight = routeStopTime;
                    break;
                }
            }

            parentStation.routeGroups[routeId].tripRight = selectedRouteStopTimeTripRight;
        }

        // Group related Routes into RouteGroups

        var parentStationRouteGroups = {};

        for (routeId in parentStation.routeGroups) {
            var routeGroupId = parentStation.routeGroups[routeId].id.substr(0, 7);

            if (parentStationRouteGroups[routeGroupId] == undefined) {
                parentStationRouteGroups[routeGroupId] = {
                    id: routeGroupId,
                    name: '',
                    descriptions: [],
                    minDistance: 0,
                    tripLeft: undefined,
                    tripRight: undefined,
                    routes: []
                };
            }

            parentStationRouteGroups[routeGroupId].routes.push(parentStation.routeGroups[routeId]);
        }

        // Merge Routes into RouteGroups
        // RouteGroups to Array

        var parentStationRouteGroupArray = [];

        for (routeGroupId in parentStationRouteGroups) {
            var actualRouteGroup = parentStationRouteGroups[routeGroupId];

            // Sort RouteGroup Routes by ascending id
            actualRouteGroup.routes.sort(function(a, b) {return a.id.localeCompare(b.id)});

            var actualRouteGroupRoute = actualRouteGroup.routes[0];

            actualRouteGroup.name = actualRouteGroupRoute.name;
            actualRouteGroup.descriptions.push(actualRouteGroupRoute.description);
            actualRouteGroup.minDistance = actualRouteGroupRoute.minDistance;
            actualRouteGroup.tripLeft = actualRouteGroupRoute.tripLeft;
            actualRouteGroup.tripRight = actualRouteGroupRoute.tripRight;

            if (actualRouteGroup.routes.length > 1) {
                actualRouteGroup.descriptions[0] = '(' + actualRouteGroupRoute.name + ') ' + actualRouteGroup.descriptions[0];
                actualRouteGroup.tripLeft.name = '(' + actualRouteGroupRoute.name + ') ' + actualRouteGroup.tripLeft.name;
                actualRouteGroup.tripRight.name = '(' + actualRouteGroupRoute.name + ') ' + actualRouteGroup.tripRight.name;
            }

            for (var routeIndex = 1; routeIndex < actualRouteGroup.routes.length; routeIndex++) {
                actualRouteGroupRoute = actualRouteGroup.routes[routeIndex];

                actualRouteGroup.name += ' + ' + actualRouteGroupRoute.name;
                actualRouteGroup.descriptions.push('(' + actualRouteGroupRoute.name + ') '  + actualRouteGroupRoute.description);

                if (actualRouteGroupRoute.minDistance < actualRouteGroup.minDistance) {
                    actualRouteGroup.minDistance = actualRouteGroupRoute.minDistance;
                }

                if ((actualRouteGroup.tripLeft == undefined)
                    || ((actualRouteGroupRoute.tripLeft != undefined)
                        && (actualRouteGroup.tripLeft.stopTime > actualRouteGroupRoute.tripLeft.stopTime))) {
                    actualRouteGroup.tripLeft = actualRouteGroupRoute.tripLeft;
                    actualRouteGroup.tripLeft.name = '(' + actualRouteGroupRoute.name + ') ' + actualRouteGroup.tripLeft.name;
                }

                if ((actualRouteGroup.tripRight == undefined)
                    || ((actualRouteGroupRoute.tripRight != undefined)
                    && (actualRouteGroup.tripRight.stopTime > actualRouteGroupRoute.tripRight.stopTime))) {
                    actualRouteGroup.tripRight = actualRouteGroupRoute.tripRight;
                    actualRouteGroup.tripRight.name = '(' + actualRouteGroupRoute.name + ') ' + actualRouteGroup.tripRight.name;
                }

            }


            parentStationRouteGroupArray.push(actualRouteGroup);
        }

        // Sort RouteGroups by ascending min distance
        parentStationRouteGroupArray.sort(function(a, b) {
            return a.minDistance - b.minDistance;
        });

        parentStation.routeGroups = parentStationRouteGroupArray;

        // ParentStations to Array
        timetablePresentation.parentStations.push(parentStation);
    }

    // Sort ParentStations by ascending min distance
    timetablePresentation.parentStations.sort(function(a, b) {
        return a.minDistance - b.minDistance;
    });

    return timetablePresentation;
}

function buildTimetable() {
    var deferredObject = $.Deferred();

    var geoPosition = undefined;
    var timetableModel = {
        getStopIds: function () {
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
        function (position) {

            //TODO Mock location: Orbánhegyi
            position = {coords: {latitude: 47.497418, longitude: 19.013673}};

            geoPosition = position;

            // StopsForLocation
            return getStopsForLocation(geoPosition);

        },

        // Fail
        function (error) {
            deferredObject.reject('getLocation: ' + error.message);
        }
    );

    /*
     * Stops for location
     */

    var promiseArrivalsAndDeparturesForStop = promiseGetStopsForLocation.then(
        // Done
        function (data) {
            //TODO Discover all stops of ParentStations
            timetableModel = processStopsForLocationResponse(timetableModel, data);

            return getArrivalsAndDeparturesForStop(timetableModel.getStopIds());
        },

        // Fail
        function (status) {
            deferredObject.reject('getStopsForLocation: ' + status);
        }
    );

    /*
     * Arrivals and departures for stop
     */

    promiseArrivalsAndDeparturesForStop.then(
        // Done
        function (data) {

            timetableModel = processArrivalsAndDeparturesForStopResponse(timetableModel, data);

            timetablePresentation = transformTimetableModelToPresentation(timetableModel, geoPosition);

            deferredObject.resolve(timetablePresentation);
        },

        // Fail
        function (status) {
            deferredObject.reject('getArrivalsAndDeparturesForStop: ' + status);
        }
    );

    return deferredObject.promise();
}
