angular.module('ngModuleTrip')
    .factory('ngServiceTrip',
    [   '$q',
        'ngServiceBkkFutar',
        function($q, ngServiceBkkFutar) {

            /*
             * Interface
             */

            var serviceInstance = {
                buildTrip: function(id, currentStopId, baseTime) {return buildTrip(id, currentStopId, baseTime);}
            };


            /*
             * Functions
             */

            function processTripDetails(tripModel, data) {
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

                tripModel.tripId = tripId;
                tripModel.tripHeadsign = trip.tripHeadsign;
                tripModel.tripPolylinePoints = entry.polyline.points;

                // StopTimes

                tripModel.stopTimes = [];

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
                        direction: actualStop.direction
                    };

                    targetStopTime.stop = targetStop;

                    tripModel.stopTimes.push(targetStopTime);
                }

                // Vehicle

                if (angular.isObject(vehicle)) {

                    tripModel.vehicle = {
                        id: vehicle.vehicleId,
                        stopId: vehicle.stopId,
                        bearing: vehicle.bearing,
                        lat: vehicle.location.lat,
                        lon: vehicle.location.lon,
                        lastUpdateTime: vehicle.lastUpdateTime,
                        status: vehicle.status,
                        stopDistancePercent: vehicle.stopDistancePercent
                    };

                }

                else {

                    tripModel.vehicle = undefined;

                }

                // Route

                tripModel.route = {
                    id: routeId,
                    shortName: route.shortName,
                    description: route.description,
                    color: route.color,
                    textColor: route.textColor
                };

                return tripModel;
            }

            function transformTripModelToPresentation(tripModel, currentStopId, baseTime) {
                var tripPresentation = {
                    tripHeadsign: undefined,
                    tripPolylinePoints: undefined,
                    stopTimes: [],
                    routeName: undefined,
                    routeDescription: undefined,
                    routeColor: undefined,
                    routeTextColor: undefined,
                    baseTime: baseTime,
                    buildTime: new Date()
                };

                // Trip

                tripPresentation.tripHeadsign = tripModel.tripHeadsign;
                tripPresentation.tripPolylinePoints = tripModel.tripPolylinePoints;

                // StopTimes

                var actualVehicle = tripModel.vehicle;
                var currentStopTime = undefined;

                for (var stopTimeIndex = 0; stopTimeIndex < tripModel.stopTimes.length; stopTimeIndex++) {
                    var actualStopTime = tripModel.stopTimes[stopTimeIndex];
                    var actualStop = actualStopTime.stop;

                    var aggrStopTime = ngServiceBkkFutar.aggregateStopTime(actualStopTime);

                    var targetStopTime = {
                        stopId: actualStop.id,
                        stopName: actualStop.name,
                        stopLat: actualStop.lat,
                        stopLon: actualStop.lon,
                        stopDirection: actualStop.direction,
                        stopTime: aggrStopTime.stopTime,
                        stopTimeString: aggrStopTime.stopTimeString,
                        stopTimeDiff: undefined,
                        vehicle: undefined,
                        isCurrent: undefined,
                        isSubsequent: undefined
                    };

                    // Vehicle
                    if (angular.isDefined(actualVehicle) && (actualVehicle.stopId == actualStop.id)) {
                        var targetVehicle = {
                            id: actualVehicle.id,
                            bearing: actualVehicle.bearing,
                            lat: actualVehicle.lat,
                            lon: actualVehicle.lon,
                            lastUpdateTime: ngServiceBkkFutar.convertDate(actualVehicle.lastUpdateTime),
                            status: actualVehicle.status,
                            stopDistancePercent: actualVehicle.stopDistancePercent
                        };

                        targetStopTime.vehicle = targetVehicle;
                    }

                    // Current StopTime
                    if (angular.isUndefined(currentStopTime) && ((actualStop.id == currentStopId) || (angular.isUndefined(currentStopId)))) {
                        currentStopTime = targetStopTime;
                    }

                    tripPresentation.stopTimes.push(targetStopTime);
                }

                // StopTimes calculated properties

                var isCurrent = false;
                var isSubsequent = false;

                for (var stopTimeIndex = 0; stopTimeIndex < tripPresentation.stopTimes.length; stopTimeIndex++) {
                    var actualStopTime = tripPresentation.stopTimes[stopTimeIndex];

                    isSubsequent = isCurrent || isSubsequent;
                    isCurrent = (actualStopTime.stopId == currentStopTime.stopId);

                    actualStopTime.isCurrent = isCurrent;
                    actualStopTime.isSubsequent = isSubsequent;

                    var minutesString = Math.round(Math.abs(actualStopTime.stopTime - currentStopTime.stopTime) / 1000 / 60) + '\'';

                    if (!isCurrent) {
                        actualStopTime.stopTimeDiff = minutesString;
                    }
                    else {
                        actualStopTime.stopTimeDiff = undefined;
                    }
                }

                // Route

                var actualRoute = tripModel.route;

                tripPresentation.routeName = actualRoute.shortName;
                tripPresentation.routeDescription = actualRoute.description;
                tripPresentation.routeColor = ngServiceBkkFutar.convertColor(actualRoute.color);
                tripPresentation.routeTextColor = ngServiceBkkFutar.convertColor(actualRoute.textColor);


                return tripPresentation;
            }

            function buildTrip(id, currentStopId, baseTime) {
                var deferred = $q.defer();

                var tripModel = {
                    tripId: undefined,
                    tripHeadsign: undefined,
                    tripPolylinePoints: undefined,
                    stopTimes: {},
                    vehicle: undefined,
                    route: undefined
                };
                var tripPresentation = undefined;


                /*
                 * Trip Details
                 */

                var promiseTripDetails = ngServiceBkkFutar.getTripDetails(id);

                promiseTripDetails.then(

                    // Success
                    function(data) {
                        tripModel = processTripDetails(tripModel, data);
                        tripPresentation = transformTripModelToPresentation(tripModel, currentStopId, baseTime);

                        deferred.resolve(tripPresentation);
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
