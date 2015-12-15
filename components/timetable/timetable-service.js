angular.module('ngModuleTimetable')
    .factory('ngServiceTimetable',
    [   '$q',
        'ngServiceBkkFutar',
        'TIMETABLE',
        function($q, ngServiceBkkFutar, TIMETABLE) {

            /*
             * Interface
             */

            var serviceInstance = {
                buildTimetable: function(position, baseTime, previousTimetablePresentation) {return buildTimetable(position, baseTime, previousTimetablePresentation);}
            };


            /*
             * Functions
             */

            function getLocation() {
                var deferred = $q.defer();

                geolocator.locate(
                    // Success
                    function(position) {deferred.resolve(position);},
                    // Error
                    function(error) {deferred.reject(error);},
                    true,
                    {enableHighAccuracy: true, timeout: 6000, maximumAge: 0},
                    null);

                return deferred.promise;
            }

            function collectStopsForParentStations(data) {
                var deferred = $q.defer();

                var stopArray = data.data.list;
                var parentStations = {};

                // Collect parent stations
                for (var stopIndex = 0; stopIndex < stopArray.length; stopIndex++) {
                    var actualStop = stopArray[stopIndex];
                    var actualParentStationId = actualStop.parentStationId;

                    if (actualParentStationId) {

                        // New parent station
                        if (parentStations[actualParentStationId] == undefined) {
                            parentStations[actualParentStationId] = {
                                names: [actualStop.name.toLocaleLowerCase()]
                            };
                        }

                        // Existing parent station
                        else {
                            var actualName = actualStop.name.toLocaleLowerCase();
                            var actualParentStation = parentStations[actualParentStationId];
                            var actualParentStationNames = actualParentStation.names;

                            // Parent station names
                            for (var nameIndex = 0; nameIndex < actualParentStationNames.length; nameIndex++) {

                                // Is found?
                                if (actualName == actualParentStationNames[nameIndex]) {
                                    break;
                                }

                                // Is prefix?
                                else if ((actualName.length < actualParentStationNames[nameIndex].length)
                                    && (actualParentStationNames[nameIndex].substr(0, actualName.length) == actualName)) {

                                    actualParentStationNames[nameIndex] = actualName;
                                    break;
                                }

                                // Is prefix?
                                else if ((actualName.length > actualParentStationNames[nameIndex].length)
                                    && (actualName.substr(0, actualParentStationNames[nameIndex].length) == actualParentStationNames[nameIndex])) {

                                    break;
                                }

                            }

                            // Add new parent station name
                            if (nameIndex == actualParentStationNames.length) {
                                actualParentStationNames.push(actualName);
                            }

                        }
                    }
                }

                var promisesSearchStops = [];

                // Query stops by name
                for (var parentStationId in parentStations) {
                    var actualParentStationNames = parentStations[parentStationId].names;

                    for (var nameIndex = 0; nameIndex < actualParentStationNames.length; nameIndex++) {
                        var actualParentStationName = actualParentStationNames[nameIndex];
                        promisesSearchStops.push(ngServiceBkkFutar.searchStops(parentStationId, actualParentStationName));
                    }
                }

                if (promisesSearchStops.length > 0) {

                    // Process responses
                    $q.all(promisesSearchStops).then(

                        // Success
                        function(dataArray) {
                            var stopsAndRoutes = processStopsForParentStations(dataArray, promisesSearchStops.length);

                            deferred.resolve(stopsAndRoutes);
                        },

                        // Error
                        function(status) {
                            deferred.reject('searchStops: ' + status);
                        }

                    );

                }

                else {
                    deferred.reject('No stops found');
                }

                return deferred.promise;
            }

            function processStopsForParentStations(dataArray, dataCount) {
                var targetStops = {};
                var targetRoutes = {};

                // Datas
                for (var dataIndex = 0; dataIndex < dataArray.length; dataIndex++) {
                    var parentStationId = dataArray[dataIndex].id;
                    var data = dataArray[dataIndex].data;
                    var stopIdArray = data.data.entry.stopIds;
                    var stopReferences = data.data.references.stops;
                    var routeReferences = data.data.references.routes;

                    // Stops
                    for (var stopIndex = 0; stopIndex < stopIdArray.length; stopIndex++) {
                        var stopId = stopIdArray[stopIndex];
                        var stop = stopReferences[stopId];

                        // Add to stops if not parent station
                        if ((stop.locationType == 0) && (stop.parentStationId == parentStationId) && (targetStops[stopId] == undefined)) {
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

                return {stops: targetStops, routes: targetRoutes};
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
                            minDistance: undefined,
                            color: ngServiceBkkFutar.convertColor(route.color),
                            textColor: ngServiceBkkFutar.convertColor(route.textColor),
                            type: route.type
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
                    var stopId = angular.isDefined(stopTime.stopId) ? stopTime.stopId : data.data.entry.stopId;
                    var tripId = stopTime.tripId;
                    var trip = tripReferences[tripId];
                    var routeId = trip.routeId;

                    var tripStopTime = {
                        stopId: stopId,
                        arrivalTime: stopTime.arrivalTime,
                        departureTime: stopTime.departureTime,
                        predictedArrivalTime:stopTime.predictedArrivalTime,
                        predictedDepartureTime: stopTime.predictedDepartureTime,
                        tripId: tripId,
                        stopLat: undefined,
                        stopLon: undefined
                    };

                    // Feed timetableModel
                    if (angular.isDefined(timetableModel.stops[stopId].routes[routeId])) {
                        timetableModel.stops[stopId].routes[routeId].trips[tripId] = {
                            id: trip.id,
                            tripHeadsign: trip.tripHeadsign,
                            directionId: trip.directionId,
                            stopTime: tripStopTime
                        };
                    }

                }

                return timetableModel;
            }

            function processScheduleForStopsResponse(timetableModel, dataArray) {
                var baseTime = angular.isDate(timetableModel.baseTime) ? timetableModel.baseTime : new Date();

                // Data
                angular.forEach(
                    dataArray,
                    function(data) {
                        var stopId = data.data.entry.stopId;

                        // Schedule
                        angular.forEach(
                            data.data.entry.schedules,
                            function(schedule) {
                                var routeId = schedule.routeId;
                                var stopTimeArray = [];

                                // Direction
                                angular.forEach(
                                    schedule.directions,
                                    function(direction) {
                                        var directionId = direction.directionId;
                                        var groups = direction.groups;

                                        // Stop time
                                        angular.forEach(
                                            direction.stopTimes,
                                            function(stopTime) {

                                                // Aggregate stop times
                                                var aggrStopTime = ngServiceBkkFutar.aggregateStopTime(stopTime);

                                                stopTimeArray.push(
                                                    {
                                                        aggrStopTime: aggrStopTime,
                                                        stopTime: stopTime,
                                                        directionId: directionId,
                                                        group: groups[stopTime.groupIds[0]]
                                                    }
                                                )
                                            }
                                        );

                                    }

                                );

                                // Sort by aggrStopTime
                                stopTimeArray.sort(function(a, b) {return a.aggrStopTime.stopTime - b.aggrStopTime.stopTime});

                                // Find the nearest stopTime to baseTime which is greater than baseTime
                                var index = 0;
                                while ((index < stopTimeArray.length) && (stopTimeArray[index].aggrStopTime.stopTime < baseTime)) index++;

                                // Select stopTime just before baseTime
                                if (0 < index) {
                                    var actualStopTime = stopTimeArray[index - 1].stopTime;
                                    var tripId = actualStopTime.tripId;
                                    var headsign = stopTimeArray[index - 1].group.headsign;
                                    var directionId = stopTimeArray[index - 1].directionId;

                                    var tripStopTime = {
                                        stopId: stopId,
                                        arrivalTime: actualStopTime.arrivalTime,
                                        departureTime: actualStopTime.departureTime,
                                        predictedArrivalTime:actualStopTime.predictedArrivalTime,
                                        predictedDepartureTime: actualStopTime.predictedDepartureTime,
                                        tripId: tripId,
                                        stopLat: undefined,
                                        stopLon: undefined
                                    };

                                    // Feed timetableModel
                                    if (angular.isDefined(timetableModel.stops[stopId].routes[routeId])) {
                                        timetableModel.stops[stopId].routes[routeId].trips[tripId] = {
                                            id: tripId,
                                            stopId: stopId,
                                            tripHeadsign: headsign,
                                            directionId: directionId,
                                            stopTime: tripStopTime
                                        };
                                    }
                                }

                                // Select stopTime just after baseTime
                                if (index < stopTimeArray.length) {
                                    var actualStopTime = stopTimeArray[index].stopTime;
                                    var tripId = actualStopTime.tripId;
                                    var headsign = stopTimeArray[index].group.headsign;
                                    var directionId = stopTimeArray[index].directionId;

                                    var tripStopTime = {
                                        stopId: stopId,
                                        arrivalTime: actualStopTime.arrivalTime,
                                        departureTime: actualStopTime.departureTime,
                                        predictedArrivalTime:actualStopTime.predictedArrivalTime,
                                        predictedDepartureTime: actualStopTime.predictedDepartureTime,
                                        tripId: tripId,
                                        stopLat: undefined,
                                        stopLon: undefined
                                    };

                                    // Feed timetableModel
                                    if (angular.isDefined(timetableModel.stops[stopId].routes[routeId])) {
                                        timetableModel.stops[stopId].routes[routeId].trips[tripId] = {
                                            id: tripId,
                                            stopId: stopId,
                                            tripHeadsign: headsign,
                                            directionId: directionId,
                                            stopTime: tripStopTime
                                        };
                                    }
                                }

                            }
                        );

                    }
                );

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

                        // Store Stop locations in StopTimes
                        for (tripId in actualRoute.trips) {
                            var actualTrip = actualRoute.trips[tripId];

                            actualTrip.stopTime.stopLat = actualStop.lat;
                            actualTrip.stopTime.stopLon = actualStop.lon;
                        }

                    }

                }

                return timetableModel;
            }

            function transformTimetableModelToPresentation(timetableModel) {
                var timetablePresentation = {
                    parentStations: undefined,
                    baseTime: timetableModel.baseTime,
                    baseTimeType: timetableModel.baseTimeType,
                    buildTime: new Date()
                };

                // Group: Stop -> ParentStation
                timetablePresentation.parentStations = groupStopsIntoParentStations(timetableModel.stops, timetableModel.baseTime);

                return timetablePresentation;
            }

            // Group: Stop -> ParentStation
            function groupStopsIntoParentStations(stops, baseTime) {
                var stopGroups = {};
                var parentStationArray = [];

                // Group Stops by parentStationIds
                for (stopId in stops) {
                    var actualStop = stops[stopId];
                    var actualParentStationId = actualStop.parentStationId;
                    var actualStopGroup;

                    if (angular.isUndefined(stopGroups[actualParentStationId])) {
                        stopGroups[actualParentStationId] = {
                            names: {},
                            minDistance: actualStop.distance,
                            stops: []
                        };
                    }

                    actualStopGroup = stopGroups[actualParentStationId];

                    if (angular.isUndefined(actualStopGroup.names[actualStop.name])) {
                        actualStopGroup.names[actualStop.name] = {
                            name: actualStop.name,
                            count: 0
                        }
                    }

                    actualStopGroup.names[actualStop.name].count++;

                    if (actualStopGroup.minDistance > actualStop.distance) actualStopGroup.minDistance = actualStop.distance;

                    actualStopGroup.stops.push(actualStop);
                }

                // Build ParentStations
                for (parentStationId in stopGroups) {
                    var sourceStopGroup = stopGroups[parentStationId];

                    var targetParentStation = {
                        id: parentStationId,
                        name: undefined,
                        minDistance: sourceStopGroup.minDistance,
                        // Merge: Stop -> RouteGroup
                        routeGroups: mergeStopsIntoRouteGroup(sourceStopGroup.stops, baseTime),
                        routeNames: [],
                        routeColors: [],
                        routeTextColors: [],
                        isExpanded: false
                    };

                    // Select the most common name for parentStation name

                    var selectedName = undefined;

                    angular.forEach(sourceStopGroup.names, function(sourceName) {
                        if (angular.isUndefined(selectedName) || (selectedName.count < sourceName.count)) {
                            selectedName = sourceName;
                        }
                    });

                    targetParentStation.name = selectedName.name;

                    // Collect Route attributes

                    var routeAttributes = {};

                    for (var routeGroupIndex = 0; routeGroupIndex < targetParentStation.routeGroups.length; routeGroupIndex++) {
                        var actualRouteGroup = targetParentStation.routeGroups[routeGroupIndex];

                        for (var nameIndex = 0; nameIndex < actualRouteGroup.names.length; nameIndex++) {
                            var actualId = actualRouteGroup.id;
                            var actualName = actualRouteGroup.names[nameIndex];
                            var actualColor = actualRouteGroup.colors[nameIndex];
                            var actualTextColor = actualRouteGroup.textColors[nameIndex];
                            var actualType = actualRouteGroup.types[nameIndex];

                            if (routeAttributes[actualName] == undefined) {
                                routeAttributes[actualName] = {
                                    id: actualId,
                                    name: actualName,
                                    color: actualColor,
                                    textColor: actualTextColor,
                                    type: actualType
                                };
                            }
                        }
                    }

                    var routeAttributeArray = [];

                    for (attributeName in routeAttributes) {
                        routeAttributeArray.push(routeAttributes[attributeName]);
                    }

                    routeAttributeArray.sort(function(a, b) {return compareRoutes(a, b);});

                    for (var attributeIndex = 0; attributeIndex < routeAttributeArray.length; attributeIndex++) {
                        var actualRouteAttribute = routeAttributeArray[attributeIndex];

                        targetParentStation.routeNames.push(actualRouteAttribute.name);
                        targetParentStation.routeColors.push(actualRouteAttribute.color);
                        targetParentStation.routeTextColors.push(actualRouteAttribute.textColor);
                    }

                    parentStationArray.push(targetParentStation);
                }

                // Sort: ParentStation (minDistance)
                parentStationArray.sort(function(a, b) {return a.minDistance - b.minDistance});

                return parentStationArray;
            }

            // Merge: Stop -> RouteGroup
            function mergeStopsIntoRouteGroup(stops, baseTime) {
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
                        colors: [],
                        textColors: [],
                        types: [],
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
                        targetRouteGroup.colors.push(actualRoute.color);
                        targetRouteGroup.textColors.push(actualRoute.textColor);
                        targetRouteGroup.types.push(actualRoute.type);
                        if (targetRouteGroup.minDistance > actualRoute.minDistance) targetRouteGroup.minDistance = actualRoute.minDistance;
                        targetRouteGroup.isGroup = sourceRouteGroupRouteArray.length > 1;
                        targetRouteGroup.isExpanded = false;

                        // Merge: Trip -> Route
                        var targetRoute = mergeTripsIntoRoute(actualRoute, baseTime);
                        targetRouteGroup.routes.push(targetRoute);

                        // Update: StopTime -> RouteGroup

                        var baseTime = (!angular.isDate(baseTime)) ? new Date() : baseTime;

                        if (   (angular.isDefined(targetRoute.tripLeft))
                            && (   angular.isUndefined(targetRouteGroup.tripLeft)
                                || ((baseTime <= targetRoute.tripLeft.stopTime) && (targetRoute.tripLeft.stopTime < targetRouteGroup.tripLeft.stopTime))
                                || ((targetRouteGroup.tripLeft.stopTime < baseTime) && (targetRouteGroup.tripLeft.stopTime < targetRoute.tripLeft.stopTime))
                               )
                           )
                        {
                            targetRouteGroup.tripLeft = targetRoute.tripLeft;
                        }

                        if (   (angular.isDefined(targetRoute.tripRight))
                            && (   angular.isUndefined(targetRouteGroup.tripRight)
                                || ((baseTime <= targetRoute.tripRight.stopTime) && (targetRoute.tripRight.stopTime < targetRouteGroup.tripRight.stopTime))
                                || ((targetRouteGroup.tripRight.stopTime < baseTime) && (targetRouteGroup.tripRight.stopTime < targetRoute.tripRight.stopTime))
                               )
                           )
                        {
                            targetRouteGroup.tripRight = targetRoute.tripRight;
                        }

                    }

                    routeGroupArray.push(targetRouteGroup);
                }

                // Sort: RouteGroup (minDistance)
                routeGroupArray.sort(compareRouteGroups);

                return routeGroupArray;
            }

            function mergeRoutes(route1, route2) {
                var targetRoute = {
                    id: route1.id,
                    shortName: route1.shortName,
                    description: route1.description,
                    trips: {},
                    minDistance: route1.minDistance < route2.minDistance ? route1.minDistance : route2.minDistance,
                    color: route1.color,
                    textColor: route1.textColor,
                    type: route1.type
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
            function mergeTripsIntoRoute(route, baseTime) {
                var targetRoute = {
                    id: route.id,
                    name: route.shortName,
                    description: route.description,
                    color: route.color,
                    textColor: route.textColor,
                    type: route.type,
                    minDistance: route.minDistance,
                    tripLeft: undefined,
                    tripRight: undefined
                };
                var stopTimeGroups = {};

                // Base time
                var baseTime = (!angular.isDate(baseTime)) ? new Date() : baseTime;

                // Group StopTimes by stopIds
                for (tripId in route.trips) {
                    var actualTrip = route.trips[tripId];
                    var actualStopId = actualTrip.stopId;
                    var actualStopTime = actualTrip.stopTime;

                    if (stopTimeGroups[actualStopId] == undefined) {
                        stopTimeGroups[actualStopId] = [];
                    }

                    var actualStopTimeGroup = stopTimeGroups[actualStopId];

                    var aggrStopTime = ngServiceBkkFutar.aggregateStopTime(actualStopTime);

                    var targetStopTime = {
                        name: actualTrip.tripHeadsign,
                        routeName: route.shortName,
                        stopId: actualStopTime.stopId,
                        tripId: actualStopTime.tripId,
                        directionId: actualTrip.directionId,
                        stopTime: aggrStopTime.stopTime,
                        stopTimeString: aggrStopTime.stopTimeString,
                        stopLat: actualStopTime.stopLat,
                        stopLon: actualStopTime.stopLon
                    };

                    actualStopTimeGroup.push(targetStopTime);
                }

                // Select: StopTime
                for (stopId in stopTimeGroups) {
                    var actualStopTimeGroup = stopTimeGroups[stopId];
                    var selectedStopTime = undefined;

                    // Find the nearest stopTime to baseTime which is greater than baseTime
                    var stopTimeIndex = 0;
                    while ((stopTimeIndex < actualStopTimeGroup.length) && (actualStopTimeGroup[stopTimeIndex].stopTime < baseTime)) stopTimeIndex++;

                    // Select stopTime just after baseTime
                    if (stopTimeIndex < actualStopTimeGroup.length) {
                        selectedStopTime = actualStopTimeGroup[stopTimeIndex]
                    }

                    // Select stopTime just before baseTime
                    else if (0 < stopTimeIndex) {
                        selectedStopTime = actualStopTimeGroup[stopTimeIndex - 1];
                    };


                    // Select: tripLeft and tripRight

                    if (   (selectedStopTime.directionId == '0')
                        && (   (angular.isUndefined(targetRoute.tripLeft))
                            || (targetRoute.tripLeft.directionId != '0')
                            || ((selectedStopTime.stopTime < targetRoute.tripLeft.stopTime) && (baseTime <= selectedStopTime.stopTime))
                            || ((targetRoute.tripLeft.stopTime < baseTime) && (targetRoute.tripLeft.stopTime < selectedStopTime.stopTime))
                           )
                       )
                    {
                        targetRoute.tripLeft = selectedStopTime;
                    }

                    else if (  (selectedStopTime.directionId == '1')
                            && (   (angular.isUndefined(targetRoute.tripRight))
                                || (targetRoute.tripRight.directionId != '1')
                                || ((selectedStopTime.stopTime < targetRoute.tripRight.stopTime) && (baseTime <= selectedStopTime.stopTime))
                                || ((targetRoute.tripRight.stopTime < baseTime) && (targetRoute.tripRight.stopTime < selectedStopTime.stopTime))
                               )
                            )
                    {
                        targetRoute.tripRight = selectedStopTime;
                    }

                    else if (angular.isUndefined(targetRoute.tripLeft)) {
                        targetRoute.tripLeft = selectedStopTime;
                    }

                    else if (angular.isUndefined(targetRoute.tripRight)) {
                        targetRoute.tripRight = selectedStopTime;
                    }

                }

                return targetRoute;
            }

            function applyPreviousPresentationState(timetablePresentation, previousTimetablePresentation) {
                var expandedParentStationId = undefined;
                var expandedRouteGroups = {};

                // Find the only expanded ParentStation

                if (previousTimetablePresentation != undefined) {
                    var parentStationArray = previousTimetablePresentation.parentStations;

                    for (var parentStationIndex = 0; parentStationIndex < parentStationArray.length; parentStationIndex++) {
                        var parentStation = parentStationArray[parentStationIndex];

                        if (parentStation.isExpanded) {
                            expandedParentStationId = parentStation.id;

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

                if (expandedParentStationId != undefined) {

                    for (var parentStationIndex = 0; parentStationIndex < parentStationArray.length; parentStationIndex++) {
                        var parentStation = parentStationArray[parentStationIndex];

                        if (parentStation.id == expandedParentStationId) {
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

                else if ((angular.isUndefined(previousTimetablePresentation)) && (parentStationArray.length > 0)) {

                    // Default
                    parentStationArray[0].isExpanded = true;

                }

                return timetablePresentation;
            }

            function buildTimetable(position, baseTime, previousTimetablePresentation) {
                var deferred = $q.defer();

                var geoPosition = position;

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

                var timetableModel = {
                    getStopIds: function () {
                        var stopIdArray = [];

                        for (stopId in this.stops) {
                            stopIdArray.push(this.stops[stopId].id);
                        }

                        return stopIdArray;
                    },
                    stops: {},
                    baseTime: baseTime,
                    baseTimeType: baseTimeType
                };

                var timetablePresentation = undefined;


                /*
                 * Stops for location
                 */

                var promiseGetStopsForLocation = ngServiceBkkFutar.getStopsForLocation(geoPosition);

                var promiseCollectStopsForParentStations = promiseGetStopsForLocation.then(

                    // Success
                    function (data) {
                        return collectStopsForParentStations(data);
                    },

                    // Error
                    function (status) {
                        deferred.reject('getStopsForLocation: ' + status);
                    }

                );

                /*
                 * Extend stops for parent stations
                 */

                var promiseArrivalsAndDeparturesForStop = promiseCollectStopsForParentStations.then(

                    // Success
                    function(stopsAndRoutes) {
                        timetableModel = processStopsForLocationResponse(timetableModel, stopsAndRoutes.stops, stopsAndRoutes.routes);

                        return ngServiceBkkFutar.getScheduleForStops(timetableModel.getStopIds(), timetableModel.baseTime);
                    },

                    // Error
                    function(status) {
                        deferred.reject('collectStopsForParentStations: ' + status);
                    }

                );

                /*
                 * Arrivals and departures for stop
                 */

                promiseArrivalsAndDeparturesForStop.then(

                    // Success
                    function (dataArray) {

                        timetableModel = processScheduleForStopsResponse(timetableModel, dataArray);

                        timetableModel = postProcessTimetableModel(timetableModel, geoPosition);

                        timetablePresentation = transformTimetableModelToPresentation(timetableModel);

                        timetablePresentation = applyPreviousPresentationState(timetablePresentation, previousTimetablePresentation);

                        deferred.resolve(timetablePresentation);
                    },

                    // Error
                    function (status) {
                        deferred.reject('getArrivalsAndDeparturesForStop: ' + status);
                    }

                );

                return deferred.promise;
            }

            function compareRouteNames(a, b) {
                var aAsNumber = Number(a);
                var bAsNumber = Number(b);
                var aAsString = String(a);
                var bAsString = String(b);
                var aIsNumber = !isNaN(aAsNumber);
                var bIsNumber = !isNaN(bAsNumber);
                var ret = undefined;

                // Compare as numbers
                if (aIsNumber && bIsNumber) {
                    ret = a - b;
                }

                // Try prefix
                else if (aIsNumber || bIsNumber) {
                    ret = 0;

                    // Try prefix
                    if (aIsNumber && bAsString.length > 1) {
                        var prefix = bAsString.slice(0, -1);
                        ret = compareRouteNames(aAsNumber, prefix);
                    }

                    // Try prefix
                    else if (bIsNumber && aAsString.length > 1) {
                        var prefix = aAsString.slice(0, -1);
                        ret = compareRouteNames(prefix, bAsNumber);
                    }

                    // Numbers comes first
                    if (ret == 0) {
                        ret = Number(!aIsNumber) - Number(!bIsNumber);
                    }

                }

                // Compare as strings
                else  {
                    ret = 0;

                    // Try prefixes
                    if ((aAsString.length > 1) && (bAsString.length > 1)) {
                        var aPrefix = aAsString.slice(0, -1);
                        var bPrefix = bAsString.slice(0, -1);

                        ret = compareRouteNames(aPrefix, bPrefix);
                    }

                    // As strings
                    if (ret == 0) {
                        ret = aAsString.localeCompare(bAsString);
                    }
                }

                return ret;
            }

            function compareRoutes(a, b) {
                var ret = undefined;

                // Day/night transport

                var aNightTransport = ngServiceBkkFutar.isNightTransport(a) ? 1 : 0;
                var bNightTransport = ngServiceBkkFutar.isNightTransport(b) ? 1 : 0;

                ret = aNightTransport - bNightTransport;

                // Type

                if (ret == 0) {
                    var aTypeOrder = TIMETABLE.ROUTE_TYPE_ORDER.indexOf(a.type);
                    var bTypeOrder = TIMETABLE.ROUTE_TYPE_ORDER.indexOf(b.type);

                    aTypeOrder = (aTypeOrder >= 0) ? aTypeOrder : Number.MAX_VALUE;
                    bTypeOrder = (bTypeOrder >= 0) ? bTypeOrder : Number.MAX_VALUE;

                    ret = aTypeOrder - bTypeOrder;
                }

                // Name

                if (ret == 0) {
                    ret = compareRouteNames(a.name, b.name);
                }

                return ret;
            }

            function compareRouteGroups(a, b) {
                var ret = undefined;

                // RouteGroups with Trips first

                var aHasTrips = (a.tripLeft != undefined) || (a.tripRight != undefined);
                var bHasTrips = (b.tripLeft != undefined) || (b.tripRight != undefined);

                ret = Number(!aHasTrips) - Number(!bHasTrips);

                // Order by route comparison

                if (ret == 0) {
                    var aRoute = {id: a.id, type: a.types[0], name: a.names[0]};
                    var bRoute = {id: b.id, type: b.types[0], name: b.names[0]};

                    ret = compareRoutes(aRoute, bRoute);
                }

/*
                // Order by minDistance
                if (ret == 0) {
                    ret = a.minDistance - b.minDistance;
                }
*/

                return ret;
            }


            /*
             * The service instance
             */

            return serviceInstance;

        }
    ]);
