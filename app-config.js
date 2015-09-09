angular.module('ngAppGyorsFutar')
    .constant('STATE', {
        'REDIRECT': 'redirect',
        'APP': 'app',
        'INITIAL': 'app.initial',
        'LOCATION_DETECTION': 'app.location-detection',
        'RECENT_LOCATION_LIST': 'app.recent-location-list',
        'LOCATION_PICKER': 'app.location-picker',
        'TIMETABLE': 'app.timetable',
        'TRIP': 'app.trip',
        'SCHEDULE': 'app.schedule',
        'MAP': 'app.map'
    })
    .constant('STATE_URL', {
        'REDIRECT': '/redirect',
        'APP': '/ngAppGyorsFutar'
    })
    .constant('EVENT', {
        'SUCCESS_MESSAGE': 'successMessage',
        'ERROR_MESSAGE': 'errorMessage',
        'ADJUST_HEIGHT': 'adjustHeight'
    })
    .config(['$stateProvider', '$urlRouterProvider', 'STATE', 'STATE_URL', function($stateProvider, $urlRouterProvider, STATE, STATE_URL) {

        //
        $urlRouterProvider.when(STATE_URL.APP,
            [   '$state',
                function ($state) {

                    /*
                     * APP's nested state -> Nothing to do
                     */

                    if ($state.includes(STATE.APP)) {
                        return true;
                    }


                    /*
                     * No state -> redirect to REDIRECT
                     *
                     * Detect page refresh/reload action
                     * Redirect to REDIRECT temporary state
                     *
                     */

                    else {
                        return STATE_URL.REDIRECT;
                    }

                }
            ]);

        // For any unmatched url, redirect to REDIRECT
        $urlRouterProvider.otherwise(STATE_URL.REDIRECT);

        // Now set up the states
        $stateProvider
            .state(STATE.REDIRECT, {
                url: STATE_URL.REDIRECT,
                data: {
                    parentState: undefined,
                    backStackable: false,
                    singleInstance: true
                }
            })
            .state(STATE.APP, {
                abstract: true,
                url: STATE_URL.APP,
                template: '<ui-view/>'
            })
            .state(STATE.INITIAL, {
                data: {
                    parentState: undefined,
                    backStackable: false,
                    singleInstance: true
                }
            })
            .state(STATE.LOCATION_DETECTION, {
                templateUrl: 'components/location-detection/location-detection.html',
                controller: 'ngControllerLocationDetection',
/*
                params: {
                    locationMode: undefined,
                    initialPosition: undefined,
                    markedPosition: undefined
                },
*/
                data: {
                    parentState: STATE.INITIAL,
                    backStackable: false,
                    singleInstance: true
                }
            })
            .state(STATE.RECENT_LOCATION_LIST, {
                templateUrl: 'components/recent-location-list/recent-location-list.html',
                controller: 'ngControllerRecentLocationList',
/*
                params: {
                    initialPosition: undefined,
                    markedPosition: undefined
                },
*/
                data: {
                    parentState: STATE.LOCATION_DETECTION,
                    backStackable: false,
                    singleInstance: true
                }
            })
            .state(STATE.LOCATION_PICKER, {
                templateUrl: 'components/location-picker/location-picker.html',
                controller: 'ngControllerLocationPicker',
/*
                params: {
                    initialPosition: undefined,
                    markedPosition: undefined
                },
*/
                data: {
                    parentState: STATE.LOCATION_DETECTION,
                    backStackable: false,
                    singleInstance: true
                }
            })
            .state(STATE.TIMETABLE, {
                templateUrl: 'components/timetable/timetable.html',
                controller: 'ngControllerTimetable',
/*
                params: {
                    location: undefined,
                    baseTime: undefined
                },
*/
                data: {
                    parentState: STATE.INITIAL,
                    backStackable: true,
                    singleInstance: true
                }
            })
            .state(STATE.TRIP, {
                templateUrl: 'components/trip/trip.html',
                controller: 'ngControllerTrip',
/*
                params: {
                    tripId: undefined,
                    stopId: undefined,
                    baseTime: undefined
                },
*/
                data: {
                    parentState: STATE.TIMETABLE,
                    backStackable: true,
                    singleInstance: true
                }
            })
            .state(STATE.SCHEDULE, {
                templateUrl: 'components/schedule/schedule.html',
                controller: 'ngControllerSchedule',
/*
                params: {
                    stopId: undefined,
                    routeIds: undefined,
                    baseTime: undefined
                },
*/
                data: {
                    parentState: STATE.TIMETABLE,
                    backStackable: true,
                    singleInstance: true
                }
            })
            .state(STATE.MAP, {
                templateUrl: 'components/map/map.html',
                controller: 'ngControllerMap',
/*
                params: {
                    trip: undefined,
                    baseTime: undefined
                },
*/
                data: {
                    parentState: STATE.TIMETABLE,
                    backStackable: true,
                    singleInstance: true
                }
            });
    }]);
/*
    .config(['uiGmapGoogleMapApiProvider', function(uiGmapGoogleMapApiProvider) {
        uiGmapGoogleMapApiProvider.configure({
            v: '3.20',
            libraries: 'geometry,places'
        });
    }]);
*/
