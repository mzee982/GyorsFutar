angular.module('ngModuleSchedule')
    .factory('ngServiceSchedule',
    [   '$q',
        'ngServiceBkkFutar',
        function($q, ngServiceBkkFutar) {

            /*
             * Interface
             */

            var serviceInstance = {
                buildSchedule: function(stopId, routeIds, baseTime, previousSchedulePresentation) {return buildSchedule(stopId, routeIds, baseTime, previousSchedulePresentation);}
            };


            /*
             * Functions
             */

            function processScheduleForStop(scheduleModel, data) {
                var entry = data.data.entry;
                var scheduleArray = entry.schedules;
                var stopReferences = data.data.references.stops;
                var routeReferences = data.data.references.routes;
                var stopId = entry.stopId;
                var stop = stopReferences[stopId];

                // Stop

                scheduleModel.stop = {
                    id: stop.id,
                    name: stop.name,
                    lat: stop.lat,
                    lon: stop.lon,
                    direction: stop.direction
                };

                // Schedules

                scheduleModel.schedules = [];

                for (var scheduleIndex = 0; scheduleIndex < scheduleArray.length; scheduleIndex++) {
                    var actualSchedule = scheduleArray[scheduleIndex];
                    var actualRoute = routeReferences[actualSchedule.routeId];
                    var actualDirectionArray = actualSchedule.directions;

                    var targetSchedule = {
                        route: undefined,
                        directions: undefined
                    };

                    // Route

                    var targetRoute = {
                        id: actualRoute.id,
                        shortName: actualRoute.shortName,
                        description: actualRoute.description,
                        color: actualRoute.color,
                        textColor: actualRoute.textColor
                    };

                    targetSchedule.route = targetRoute;

                    // Directions

                    targetSchedule.directions = [];

                    for (var directionIndex = 0; directionIndex < actualDirectionArray.length; directionIndex++) {
                        var actualDirection = actualDirectionArray[directionIndex];
                        var actualGroups = actualDirection.groups;
                        var actualStopTimeArray = actualDirection.stopTimes;

                        var targetDirection = {
                            id: actualDirection.directionId,
                            stopTimes: undefined
                        };

                        // StopTimes

                        targetDirection.stopTimes = [];

                        for (var stopTimeIndex = 0; stopTimeIndex < actualStopTimeArray.length; stopTimeIndex++) {
                            var actualStopTime = actualStopTimeArray[stopTimeIndex];
                            var actualGroupIdArray = actualStopTime.groupIds;

                            var targetStopTime = {
                                arrivalTime: actualStopTime.arrivalTime,
                                departureTime: actualStopTime.departureTime,
                                predictedArrivalTime: actualStopTime.predictedArrivalTime,
                                predictedDepartureTime: actualStopTime.predictedDepartureTime,
                                groups: undefined
                            };

                            // Groups

                            targetStopTime.groups = [];

                            for (var groupIdIndex = 0; groupIdIndex < actualGroupIdArray.length; groupIdIndex++) {
                                var actualGroupId = actualGroupIdArray[groupIdIndex];
                                var actualGroup = actualGroups[actualGroupId];

                                var targetGroup = {
                                    id: actualGroup.groupId,
                                    headsign: actualGroup.headsign,
                                    description: actualGroup.description
                                };

                                targetStopTime.groups.push(targetGroup);
                            }

                            targetDirection.stopTimes.push(targetStopTime);
                        }

                        targetSchedule.directions.push(targetDirection);
                    }

                    scheduleModel.schedules.push(targetSchedule);
                }


                return scheduleModel;
            }

            function transformScheduleModelToPresentation(scheduleModel, routeIds, baseTime) {
                var schedulePresentation = {
                    stopName: undefined,
                    stopTimes: [],
                    routes: [],
                    visibleStopTimeLowerIndex: undefined,
                    visibleStopTimeUpperIndex: undefined,
                    baseTime: baseTime,
                    buildTime: new Date()
                };
                var actualStop = scheduleModel.stop;

                // Stop

                schedulePresentation.stopName = actualStop.name;

                // Schedules

                for (var scheduleIndex = 0; scheduleIndex < scheduleModel.schedules.length; scheduleIndex++) {
                    var actualSchedule = scheduleModel.schedules[scheduleIndex];
                    var actualRoute = actualSchedule.route;
                    var actualDirectionArray = actualSchedule.directions;

                    // Filter for route id
                    if (!angular.isArray(routeIds) || (angular.isArray(routeIds) && (routeIds.indexOf(actualRoute.id) > -1))) {

                        // Routes

                        var targetRoute = {
                            shortName: actualRoute.shortName,
                            description: actualRoute.description,
                            color: ngServiceBkkFutar.convertColor(actualRoute.color),
                            textColor: ngServiceBkkFutar.convertColor(actualRoute.textColor)
                        };

                        schedulePresentation.routes.push(targetRoute);

                        // Directions

                        for (var directionIndex = 0; directionIndex < actualDirectionArray.length; directionIndex++) {
                            var actualDirection = actualDirectionArray[directionIndex];
                            var actualStopTimeArray = actualDirection.stopTimes;

                            // StopTimes

                            for (var stopTimeIndex = 0; stopTimeIndex < actualStopTimeArray.length; stopTimeIndex++) {
                                var actualStopTime = actualStopTimeArray[stopTimeIndex];
                                var actualGroupArray = actualStopTime.groups;

                                var aggrStopTime = ngServiceBkkFutar.aggregateStopTime(actualStopTime);

                                var targetStopTime = {
                                    routeShortName: actualRoute.shortName,
                                    routeColor: ngServiceBkkFutar.convertColor(actualRoute.color),
                                    routeTextColor: ngServiceBkkFutar.convertColor(actualRoute.textColor),
                                    groupHeadsign: actualGroupArray[0].headsign,
                                    stopLat: actualStop.lat,
                                    stopLon: actualStop.lon,
                                    stopTime: aggrStopTime.stopTime,
                                    stopTimeString: aggrStopTime.stopTimeString,
                                    isCurrent: undefined,
                                    isSubsequent: undefined
                                };

                                schedulePresentation.stopTimes.push(targetStopTime);
                            }

                        }

                    }

                }

                // Sort StopTimes

                schedulePresentation.stopTimes.sort(function(a, b) {return a.stopTime - b.stopTime});

                // StopTimes calculated properties

                var isCurrent = false;
                var isSubsequent = false;
                var currentIndex = undefined;

                if (!angular.isDate(baseTime)) baseTime = new Date();

                for (var stopTimeIndex = 0; stopTimeIndex < schedulePresentation.stopTimes.length; stopTimeIndex++) {
                    var actualStopTime = schedulePresentation.stopTimes[stopTimeIndex];

                    isSubsequent = isCurrent || isSubsequent;
                    isCurrent = !isSubsequent && (actualStopTime.stopTime >= baseTime);

                    actualStopTime.isCurrent = isCurrent;
                    actualStopTime.isSubsequent = isSubsequent;

                    if (isCurrent) currentIndex = stopTimeIndex;
                }

                schedulePresentation.visibleStopTimeLowerIndex = Math.max(currentIndex - 3, 0);
                schedulePresentation.visibleStopTimeUpperIndex = Math.min(currentIndex + 3, schedulePresentation.stopTimes.length);


                return schedulePresentation;
            }

            function applyPreviousPresentationState(schedulePresentation, previousSchedulePresentation) {

                if (angular.isDefined(previousSchedulePresentation)) {

                    // StopTime lower index
                    schedulePresentation.visibleStopTimeLowerIndex = previousSchedulePresentation.visibleStopTimeLowerIndex;

                    // StopTime upper index
                    schedulePresentation.visibleStopTimeUpperIndex = Math.min(previousSchedulePresentation.visibleStopTimeUpperIndex, schedulePresentation.stopTimes.length);

                    // Current index
                    var currentIndex;
                    angular.forEach(
                        schedulePresentation.stopTimes,
                        function (value, key, obj) {
                            if (value.isCurrent) currentIndex = key;
                        });

                    // Correct with current index

                    if (schedulePresentation.visibleStopTimeUpperIndex < currentIndex) schedulePresentation.visibleStopTimeUpperIndex = currentIndex;

                }

                return schedulePresentation;
            }

            function buildSchedule(stopId, routeIds, baseTime, previousSchedulePresentation) {
                var deferred = $q.defer();

                var scheduleModel = {
                    stop: undefined,
                    schedules: undefined
                };
                var schedulePresentation = undefined;

                /*
                 * Schedule for stop
                 */

                var promiseScheduleForStop = ngServiceBkkFutar.getScheduleForStop(stopId, baseTime);

                promiseScheduleForStop.then(

                    // Success
                    function(data) {
                        scheduleModel = processScheduleForStop(scheduleModel, data);
                        schedulePresentation = transformScheduleModelToPresentation(scheduleModel, routeIds, baseTime);
                        schedulePresentation = applyPreviousPresentationState(schedulePresentation, previousSchedulePresentation);

                        deferred.resolve(schedulePresentation);
                    },

                    // Error
                    function(status) {
                        deferred.reject('getScheduleForStop: ' + status);
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
