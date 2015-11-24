angular
    .module('ngModuleLocationPicker', [])
    .constant('LOCATION_PICKER', {
        'MAP_RESIZE_TIMEOUT': 500,
        'CLICK_CANCELLATION_TIMEOUT': 500,
        'SYMBOL_DIRECTIONS_WALK': {
            anchor: {x: 12, y: 12},
            fillColor: '#000000',
            fillOpacity: 1,
            path: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7',
            rotation: 0,
            scale: 1,
            strokeColor: '#000000',
            strokeOpacity: 1,
            strokeWeight: 0
        },
        'SYMBOL_PIN_DROP': {
            anchor: {x: 12, y: 12},
            fillColor: '#000000',
            fillOpacity: 1,
            path: 'M18 8c0-3.31-2.69-6-6-6S6 4.69 6 8c0 4.5 6 11 6 11s6-6.5 6-11zm-8 0c0-1.1.9-2 2-2s2 .9 2 2-.89 2-2 2c-1.1 0-2-.9-2-2zM5 20v2h14v-2H5z',
            rotation: 0,
            scale: 1,
            strokeColor: '#000000',
            strokeOpacity: 1,
            strokeWeight: 0
        }
    });
