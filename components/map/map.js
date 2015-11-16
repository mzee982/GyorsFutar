angular
    .module('ngModuleMap', [])
    .constant('MAP', {
        'AUTO_UPDATE_DELAY': 15000,
        'DEFAULT_ZOOM_LEVEL': 12,
        'SYMBOL_NAVIGATION': {
            anchor: {x: 12, y: 12},
            fillColor: '#000000',
            fillOpacity: 1,
            path: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z',
            rotation: 0,
            scale: 0.5,
            strokeColor: '#000000',
            strokeOpacity: 1,
            strokeWeight: 0.5
        },
        'SYMBOL_DIRECTIONS_TRANSIT': {
            anchor: {x: 12, y: 12},
            fillColor: '#000000',
            fillOpacity: 1,
            path: 'M12 2c-4.42 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm5.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6h-5V6h5v5z',
            rotation: 0,
            scale: 1,
            strokeColor: '#000000',
            strokeOpacity: 1,
            strokeWeight: 1
        }
    });
