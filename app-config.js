angular.module('ngAppGyorsFutar')
    .constant('STATE', {
        'INITIAL': 'initial',
        'LOCATION_DETECTION': 'location-detection',
        'RECENT_LOCATION_LIST': 'recent-location-list',
        'LOCATION_PICKER': 'location-picker',
        'TIMETABLE': 'timetable',
        'TRIP': 'trip'
    })
    .constant('EVENT', {
        'SUCCESS_MESSAGE': 'successMessage',
        'ERROR_MESSAGE': 'errorMessage'
    })
    .config(['$stateProvider', '$urlRouterProvider', 'STATE', function($stateProvider, $urlRouterProvider, STATE) {

        // For any unmatched url, redirect to
        $urlRouterProvider.otherwise('');

        // Now set up the states
        $stateProvider
            .state(STATE.INITIAL, {
                url: ''
            })
            .state(STATE.LOCATION_DETECTION, {
                //url: '/location-detection',
                templateUrl: 'components/location-detection/location-detection.html',
                controller: 'ngControllerLocationDetection',
                params: {
                    locationMode: undefined,
                    initialPosition: undefined,
                    markedPosition: undefined
                }
            })
            .state(STATE.RECENT_LOCATION_LIST, {
                //url: '/recent-location-list',
                templateUrl: 'components/recent-location-list/recent-location-list.html',
                controller: 'ngControllerRecentLocationList',
                params: {
                    initialPosition: undefined,
                    markedPosition: undefined
                }
            })
            .state(STATE.LOCATION_PICKER, {
                //url: '/location-picker',
                templateUrl: 'components/location-picker/location-picker.html',
                controller: 'ngControllerLocationPicker',
                params: {
                    initialPosition: undefined,
                    markedPosition: undefined
                }
            })
            .state(STATE.TIMETABLE, {
                //url: '/timetable',
                templateUrl: 'components/timetable/timetable.html',
                controller: 'ngControllerTimetable',
                params: {
                    location: undefined,
                    baseTime: undefined
                }
            })
            .state(STATE.TRIP, {
                //url: '/trip',
                templateUrl: 'components/trip/trip.html',
                controller: 'ngControllerTrip',
                params: {
                    tripId: undefined,
                    stopId: undefined
                }
            });
    }]);
