
function getLocation() {
    var deferredObject = $.Deferred();

    geolocator.locate(
        // Success
        function(position) {deferredObject.resolve(position);},
        // Error
        function(error) {deferredObject.reject(error);},
        true,
        {enableHighAccuracy: true, timeout: 6000, maximumAge: 0},
        null);

    return deferredObject.promise();
}

function searchStops(query) {
    var deferredObject = $.Deferred();

    var url = 'http://futar.bkk.hu/bkk-utvonaltervezo-api/ws/otp/api/where/search.json?query=$QUERY';
    url = url.replace('$QUERY', query);

    console.info('searchStops URL: ' + url);

    $.ajax({
        url: url,
        jsonp: 'callback',
        dataType: 'jsonp',
        success: function(data) {deferredObject.resolve(data);},
        error: function(xhr, status, errorThrown) {deferredObject.reject(status + ' ' + errorThrown);}
    });

    return deferredObject.promise();
}

function getStopsForLocation(position) {
    var deferredObject = $.Deferred();

    var url = 'http://futar.bkk.hu/bkk-utvonaltervezo-api/ws/otp/api/where/stops-for-location.json?lat=$LATITIUDE&lon=$LONGITUDE&radius=$RADIUS';
    url = url.replace('$LATITIUDE', position.coords.latitude);
    url = url.replace('$LONGITUDE', position.coords.longitude);
    url = url.replace('$RADIUS', position.coords.accuracy);

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

function collectStopsForParentStations(data) {
    //TODO Fix: parent station can have more than one name
    var deferredObject = $.Deferred();

    var stopArray = data.data.list;
    var parentStations = {};

    // Collect parent stations
    for (var stopIndex = 0; stopIndex < stopArray.length; stopIndex++) {
        var actualStop = stopArray[stopIndex];
        var actualParentStationId = actualStop.parentStationId;

        if (parentStations[actualParentStationId] == undefined) {
            parentStations[actualParentStationId] = {
                name: actualStop.name
            };
        }
    }

    var promisesSearchStops = [];

    // Query stops by name
    for (var parentStationId in parentStations) {
        var actualParentStationName = parentStations[parentStationId].name;

        promisesSearchStops.push(searchStops(actualParentStationName));
    }

    if (promisesSearchStops.length > 0) {

        // Process responses
        $.when.apply($, promisesSearchStops).then(
            // Done
            function() {

                var stopsAndRoutes = processStopsForParentStations(arguments);

                //for (var argIndex = 0; argIndex < arguments.length; argIndex++) {
                //    var argData = arguments[argIndex];
                //
                //    data = processStopsForParentStations(data, argData);
                //}

                deferredObject.resolve(stopsAndRoutes[0], stopsAndRoutes[1]);
            },

            // Fail
            function(status) {
                deferredObject.reject('searchStops: ' + status);
            }
        );

    }

    else {
        deferredObject.reject('No stops found');
    }

    return deferredObject.promise();
}

function processStopsForParentStations(dataArray) {
    var targetStops = {};
    var targetRoutes = {};

    // Datas
    for (var dataIndex = 0; dataIndex < dataArray.length; dataIndex++) {
        var data = dataArray[dataIndex];
        var stopIdArray = data.data.entry.stopIds;
        var stopReferences = data.data.references.stops;
        var routeReferences = data.data.references.routes;

        // Stops
        for (var stopIndex = 0; stopIndex < stopIdArray.length; stopIndex++) {
            var stopId = stopIdArray[stopIndex];
            var stop = stopReferences[stopId];

            // Add to stops if not parent station
            if ((stop.locationType == 0) && (targetStops[stopId] == undefined)) {
                var routeIdArray = stop.routeIds;

                targetStops[stopId] = stop;

                // Routes
                for (var routeIndex = 0; routeIndex < routeIdArray.length; routeIndex++) {
                    var routeId = routeIdArray[routeIndex];
                    var route = routeReferences[routeId];

                    // Add to routes
                    if (targetRoutes[routeId] == undefined) {
                        targetRoutes[routeId] = route;
                    }

                }

            }

        }

    }

    return [targetStops, targetRoutes];
}

function processStopsForLocationResponse(timetableModel, stops, routes) {

    // Stops
    for (stopId in stops) {
        var stop = stops[stopId];
        var stopRouteIdArray = stop.routeIds;
        var stopRoutes = {};

        // Stop routes
        for (routeIndex = 0; routeIndex < stopRouteIdArray.length; routeIndex++) {
            var routeId = stopRouteIdArray[routeIndex];
            var route = routes[routeId];

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
            arrivalTime: stopTime.arrivalTime,
            departureTime: stopTime.departureTime,
            predictedArrivalTime:stopTime.predictedArrivalTime,
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

function postProcessTimetableModel(timetableModel, position) {

    // Calculate distances for Stops
    for (stopId in timetableModel.stops) {
        var actualStop = timetableModel.stops[stopId];

        var fromLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        var toLatLng = new google.maps.LatLng(actualStop.lat, actualStop.lon);

        actualStop.distance = google.maps.geometry.spherical.computeDistanceBetween(fromLatLng, toLatLng);

        // Calculate distances for Routes
        for (routeId in actualStop.routes) {
            var actualRoute = actualStop.routes[routeId];

            actualRoute.minDistance = actualStop.distance;
        }

    }

    return timetableModel;
}

function transformTimetableModelToPresentation(timetableModel) {
    var timetablePresentation = {
        parentStations: undefined
    };

    // Group: Stop -> ParentStation
    timetablePresentation.parentStations = groupStopsIntoParentStations(timetableModel.stops);

    return timetablePresentation;
}

// Group: Stop -> ParentStation
function groupStopsIntoParentStations(stops) {
    var stopGroups = {};
    var parentStationArray = [];

    // Group Stops by parentStationIds
    for (stopId in stops) {
        var actualStop = stops[stopId];
        var actualParentStationId = actualStop.parentStationId;
        var actualStopGroup;

        if (stopGroups[actualParentStationId] == undefined) {
            stopGroups[actualParentStationId] = {
                name: actualStop.name,
                minDistance: actualStop.distance,
                stops: []
            };
        }

        actualStopGroup = stopGroups[actualParentStationId];

        if (actualStopGroup.minDistance > actualStop.distance) actualStopGroup.minDistance = actualStop.distance;

        actualStopGroup.stops.push(actualStop);
    }

    // Build ParentStations
    for (parentStationId in stopGroups) {
        var sourceStopGroup = stopGroups[parentStationId];

        var targetParentStation = {
            name: sourceStopGroup.name,
            minDistance: sourceStopGroup.minDistance,
            // Merge: Stop -> RouteGroup
            routeGroups: mergeStopsIntoRouteGroup(sourceStopGroup.stops),
            routeNames: [],
            isExpanded: false
        };

        for (var routeGroupIndex = 0; routeGroupIndex < targetParentStation.routeGroups.length; routeGroupIndex++) {
            var actualRouteGroup = targetParentStation.routeGroups[routeGroupIndex];
            targetParentStation.routeNames = targetParentStation.routeNames.concat(actualRouteGroup.names);
        }

        targetParentStation.routeNames.sort(function(a, b) {return a - b;});

        parentStationArray.push(targetParentStation);
    }

    // Sort: ParentStation (minDistance)
    parentStationArray.sort(function(a, b) {return a.minDistance - b.minDistance});

    return parentStationArray;
}

// Merge: Stop -> RouteGroup
function mergeStopsIntoRouteGroup(stops) {
    var routeGroups = {};
    var routeGroupArray = [];

    // Group Stop Routes by routeGroupIds
    for (stopId in stops) {
        var actualStop = stops[stopId];

        for (routeId in actualStop.routes) {
            var actualRoute = actualStop.routes[routeId];
            var actualRouteGroupId = actualRoute.id.substr(0, 7);

            if (routeGroups[actualRouteGroupId] == undefined) {
                routeGroups[actualRouteGroupId] = {
                    routes: {}
                };
            }

            var actualStopGroup = routeGroups[actualRouteGroupId];

            if (actualStopGroup.routes[routeId] == undefined) {
                actualStopGroup.routes[routeId] = actualRoute;
            }
            else {
                // Merge routes
                actualStopGroup.routes[routeId] = mergeRoutes(actualStopGroup.routes[routeId], actualRoute);
            }

        }

    }

    // Build RouteGroups
    for (routeGroupId in routeGroups) {
        var sourceRouteGroup = routeGroups[routeGroupId];
        var sourceRouteGroupRouteArray = [];
        var targetRouteGroup = {
            id: routeGroupId,
            names: [],
            descriptions: [],
            minDistance: Infinity,
            tripLeft: undefined,
            tripRight: undefined,
            routes: [],
            isGroup: false,
            isExpanded: false
        };


        // RouteGroup Routes to Array
        for (routeId in sourceRouteGroup.routes) {
            sourceRouteGroupRouteArray.push(sourceRouteGroup.routes[routeId]);
        }

        // Sort: Route (id)
        sourceRouteGroupRouteArray.sort(function(a, b) {return a.id.localeCompare(b.id)});

        for (var routeIndex = 0; routeIndex < sourceRouteGroupRouteArray.length; routeIndex++) {
            var actualRoute = sourceRouteGroupRouteArray[routeIndex];

            targetRouteGroup.names.push(actualRoute.shortName);
            targetRouteGroup.descriptions.push(actualRoute.description);
            if (targetRouteGroup.minDistance > actualRoute.minDistance) targetRouteGroup.minDistance = actualRoute.minDistance;
            targetRouteGroup.isGroup = sourceRouteGroupRouteArray.length > 1;
            targetRouteGroup.isExpanded = false;

            // Merge: Trip -> Route
            var targetRoute = mergeTripsIntoRoute(actualRoute);
            targetRouteGroup.routes.push(targetRoute);

            // Update: StopTime -> RouteGroup

            if ((targetRouteGroup.tripLeft == undefined)
                || ((targetRoute.tripLeft != undefined)
                    && (targetRouteGroup.tripLeft.stopTime > targetRoute.tripLeft.stopTime))) {
                targetRouteGroup.tripLeft = targetRoute.tripLeft;
            }

            if ((targetRouteGroup.tripRight == undefined)
                || ((targetRoute.tripRight != undefined)
                && (targetRouteGroup.tripRight.stopTime > targetRoute.tripRight.stopTime))) {
                targetRouteGroup.tripRight = targetRoute.tripRight;
            }

        }

        routeGroupArray.push(targetRouteGroup);
    }

    //TODO Rank back RouteGroups without trips
    // Sort: RouteGroup (minDistance)
    routeGroupArray.sort(function(a, b) {return a.minDistance - b.minDistance});

    return routeGroupArray;
}

function mergeRoutes(route1, route2) {
    var targetRoute = {
        id: route1.id,
        shortName: route1.shortName,
        description: route1.description,
        trips: {},
        minDistance: route1.minDistance < route2.minDistance ? route1.minDistance : route2.minDistance
    };

    // Merge trips
    var mergedTrips = route1.trips;

    for (tripId in route2.trips) {
        var actualTrip = route2.trips[tripId];

        if (mergedTrips[tripId] == undefined) {
            mergedTrips[tripId] = actualTrip;
        }
    }

    targetRoute.trips = mergedTrips;

    return targetRoute;
}

// Merge: Trip -> Route
function mergeTripsIntoRoute(route) {
    var actualDate = new Date();
    var targetRoute = {
        id: route.id,
        name: route.shortName,
        description: route.description,
        minDistance: route.minDistance,
        tripLeft: undefined,
        tripRight: undefined
    };
    var stopTimeGroups = {};

    // Group StopTimes by directions
    for (tripId in route.trips) {
        var actualTrip = route.trips[tripId];
        var actualDirection = actualTrip.directionId;
        var actualStopTime = actualTrip.stopTime;

        if (stopTimeGroups[actualDirection] == undefined) {
            stopTimeGroups[actualDirection] = {
                stopTimes: []
            };
        }

        var actualStopTimeGroup = stopTimeGroups[actualDirection];
        var stopTimeValue = undefined;

        if (actualStopTime.predictedArrivalTime != undefined) stopTimeValue = actualStopTime.predictedArrivalTime
        else if (actualStopTime.arrivalTime != undefined) stopTimeValue = actualStopTime.arrivalTime
        else if (actualStopTime.predictedDepartureTime != undefined) stopTimeValue = actualStopTime.predictedDepartureTime
        else if (actualStopTime.departureTime != undefined) stopTimeValue = actualStopTime.departureTime;

        var stopTimeDate = new Date(stopTimeValue * 1000);

        var targetStopTime = {
            name: actualTrip.tripHeadsign,
            routeName: route.shortName,
            stopTime: stopTimeDate,
            stopTimeString: stopTimeDate.toLocaleTimeString()
        };

        actualStopTimeGroup.stopTimes.push(targetStopTime);
    }

    // Select: StopTime
    for (direction in stopTimeGroups) {
        var actualStopTimeGroup = stopTimeGroups[direction];
        var selectedStopTime = undefined;

        for (var stopTimeIndex = 0; stopTimeIndex < actualStopTimeGroup.stopTimes.length; stopTimeIndex++) {
            var actualStopTime = actualStopTimeGroup.stopTimes[stopTimeIndex];

            if (actualStopTime.stopTime > actualDate) {
                if ((selectedStopTime == undefined)
                    || (actualStopTime.stopTime < selectedStopTime.stopTime)) {
                    selectedStopTime = actualStopTime;
                }
            }
        }

        if (direction == 0) {
            targetRoute.tripLeft = selectedStopTime;
        }
        else if (direction == 1) {
            targetRoute.tripRight = selectedStopTime;
        }
        else {
            if (targetRoute.tripLeft == undefined) {
                targetRoute.tripLeft = selectedStopTime;
            }
            else if (targetRoute.tripRight == undefined) {
                targetRoute.tripRight = selectedStopTime;
            }
        }
    }

    return targetRoute;
}

function applyPreviousPresentationState(timetablePresentation, previousTimetablePresentation) {
    var expandedParentStationName = undefined;
    var expandedRouteGroups = {};

    // Find the only expanded ParentStation
    if (previousTimetablePresentation != undefined) {
        var parentStationArray = previousTimetablePresentation.parentStations;

        for (var parentStationIndex = 0; parentStationIndex < parentStationArray.length; parentStationIndex++) {
            var parentStation = parentStationArray[parentStationIndex];

            if (parentStation.isExpanded) {
                //TODO Fix: Match by id
                expandedParentStationName = parentStation.name;

                // Find the expanded RouteGroups

                var routeGroupArray = parentStation.routeGroups;

                for (var routeGroupIndex = 0; routeGroupIndex < routeGroupArray.length; routeGroupIndex++) {
                    var routeGroup = routeGroupArray[routeGroupIndex];

                    if (routeGroup.isGroup && routeGroup.isExpanded) {
                        expandedRouteGroups[routeGroup.id] = {};
                    }
                }

                break;
            }
        }

    }

    // Expand the selected ParentStation

    var parentStationArray = timetablePresentation.parentStations;

    if (expandedParentStationName != undefined) {

        for (var parentStationIndex = 0; parentStationIndex < parentStationArray.length; parentStationIndex++) {
            var parentStation = parentStationArray[parentStationIndex];

            if (parentStation.name == expandedParentStationName) {
                parentStation.isExpanded = true;

                // Expand the selected RouteGroups

                var routeGroupArray = parentStation.routeGroups;

                for (var routeGroupIndex = 0; routeGroupIndex < routeGroupArray.length; routeGroupIndex++) {
                    var routeGroup = routeGroupArray[routeGroupIndex];

                    if (routeGroup.isGroup && (expandedRouteGroups[routeGroup.id] != undefined)) {
                        routeGroup.isExpanded = true;
                    }
                }

                break;
            }
        }

    }

    else if (parentStationArray.length > 0) {

        // Default
        parentStationArray[0].isExpanded = true;

    }

    return timetablePresentation;
}

function buildTimetable(position, previousTimetablePresentation) {
    //TODO Use Angular JS $q service
    var deferredObject = $.Deferred();

    var geoPosition = position;
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
     * Stops for location
     */

    var promiseGetStopsForLocation = getStopsForLocation(geoPosition);

    var promiseCollectStopsForParentStations = promiseGetStopsForLocation.then(
        // Done
        function (data) {
            return collectStopsForParentStations(data);
        },

        // Fail
        function (status) {
            deferredObject.reject('getStopsForLocation: ' + status);
        }
    );

    /*
     * Extend stops for parent stations
     */

    var promiseArrivalsAndDeparturesForStop = promiseCollectStopsForParentStations.then(
        // Done
        function(stops, routes) {
            timetableModel = processStopsForLocationResponse(timetableModel, stops, routes);

            return getArrivalsAndDeparturesForStop(timetableModel.getStopIds());
        },

        // Fail
        function(status) {
            deferredObject.reject('collectStopsForParentStations: ' + status);
        }
    );

    /*
     * Arrivals and departures for stop
     */

    promiseArrivalsAndDeparturesForStop.then(
        // Done
        function (data) {

            timetableModel = processArrivalsAndDeparturesForStopResponse(timetableModel, data);

            timetableModel = postProcessTimetableModel(timetableModel, geoPosition);

            timetablePresentation = transformTimetableModelToPresentation(timetableModel);

            timetablePresentation = applyPreviousPresentationState(timetablePresentation, previousTimetablePresentation);

            deferredObject.resolve(timetablePresentation);
        },

        // Fail
        function (status) {
            deferredObject.reject('getArrivalsAndDeparturesForStop: ' + status);
        }
    );

    return deferredObject.promise();
}