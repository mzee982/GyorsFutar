angular
    .module('ngModuleTimetable', [])
    .constant('TIMETABLE', {
        'AUTO_UPDATE_DELAY': 60000,
        'BASE_TIME_EDIT_VALIDATION_DELAY': 1500,
        'BASE_TIME_EDIT_MINSTEP_RESET_DELAY': 1000,
        'BASE_TIME_TYPE_LIVE': 'LIVE',
        'BASE_TIME_TYPE_PAST': 'PAST',
        'BASE_TIME_TYPE_FUTURE': 'FUTURE',
        'ROUTE_TYPE_ORDER': ['SUBWAY', 'TRAM', 'BUS', 'TROLLEYBUS', 'RAIL', 'FERRY']
    });
