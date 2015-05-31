ymaps.ready(function () {
    var DEFAULT_DATA = [];
    var DEFAULT_ZOOM = 4;
    var URL_HEATMAP_POINTS = 'data.json';
    var DELAY_REDRAW = 200000000;
    var TRUNC_ACCURACY = 0; // used for comparing coordinates on right click

    var map = new ymaps.Map('YMapsID', {
            center: [54.292472, 45.041209],
            controls: ['zoomControl', 'typeSelector',  'fullscreenControl'],
            zoom: DEFAULT_ZOOM, type: 'yandex#satellite'
        }),

        buttons = {
            dissipating: new ymaps.control.Button({
                data: {
                    content: 'Toggle dissipating'
                },
                options: {
                    selectOnClick: false,
                    maxWidth: 150
                }
            }),
            opacity: new ymaps.control.Button({
                data: {
                    content: 'Change opacity'
                },
                options: {
                    selectOnClick: false,
                    maxWidth: 150
                }
            }),
            radius: new ymaps.control.Button({
                data: {
                    content: 'Change radius'
                },
                options: {
                    selectOnClick: false,
                    maxWidth: 150
                }
            }),
            gradient: new ymaps.control.Button({
                data: {
                    content: 'Reverse gradient'
                },
                options: {
                    selectOnClick: false,
                    maxWidth: 150
                }
            }),
            heatmap: new ymaps.control.Button({
                data: {
                    content: 'Toggle Heatmap'
                },
                options: {
                    selectOnClick: false,
                    maxWidth: 150
                }
            })
        },

        gradients = [{
            0.1: 'rgba(128, 255, 0, 0.7)',
            0.2: 'rgba(255, 255, 0, 0.8)',
            0.7: 'rgba(234, 72, 58, 0.9)',
            1.0: 'rgba(162, 36, 25, 1)'
        }, {
            0.1: 'rgba(162, 36, 25, 0.7)',
            0.2: 'rgba(234, 72, 58, 0.8)',
            0.7: 'rgba(255, 255, 0, 0.9)',
            1.0: 'rgba(128, 255, 0, 1)'
        }],
        radiuses = [5, 10, 20, 30],
        opacities = [0.4, 0.6, 0.8, 1];

    ymaps.modules.require(['Heatmap'], function (Heatmap) {
        var heatmap = new Heatmap(DEFAULT_DATA, {
            gradient: gradients[0],
            radius: radiuses[1],
            opacity: opacities[2]
        });
        heatmap.setMap(map);

        buttons.dissipating.events.add('press', function () {
            heatmap.options.set(
                'dissipating', !heatmap.options.get('dissipating')
            );
        });
        buttons.opacity.events.add('press', function () {
            var current = heatmap.options.get('opacity'),
                index = opacities.indexOf(current);
            heatmap.options.set(
                'opacity', opacities[++index == opacities.length ? 0 : index]
            );
        });
        buttons.radius.events.add('press', function () {
            var current = heatmap.options.get('radius'),
                index = radiuses.indexOf(current);
            heatmap.options.set(
                'radius', radiuses[++index == radiuses.length ? 0 : index]
            );
        });
        buttons.gradient.events.add('press', function () {
            var current = heatmap.options.get('gradient');
            heatmap.options.set(
                'gradient', current == gradients[0] ? gradients[1] : gradients[0]
            );
        });
        buttons.heatmap.events.add('press', function () {
            heatmap.setMap(
                heatmap.getMap() ? null : map
            );
        });

        for (var key in buttons) {
            if (buttons.hasOwnProperty(key)) {
                map.controls.add(buttons[key]);
            }
        }

        var __baloon_data = [];
        var setBalloonData = function(data){
            __baloon_data = data;
        };

        var getBaloonData = function(){
            return __baloon_data;
        };

        var redraw = function(params){
            var sendAjaxRequest = function(successCallback, errorCallback){
                $.ajax({
                    dataType: "json",
                    url: URL_HEATMAP_POINTS,
                    data: params,
                    success: successCallback,
                    error: errorCallback
                });
            };

            sendAjaxRequest(function(response){
//                setBalloonData(response);
                heatmap.setData(response);
            }, function(){
                alert('Ошибка при загрузке файла');
            });
        };

        var timer = 0;
        map.events.add('boundschange', function (event) {
            function run(){
                var bounds = map.getBounds();
                var params = {
                    p1x: bounds[0][1],
                    p1y: bounds[0][0],
                    p2x: bounds[1][0],
                    p2y: bounds[1][1],
                    zoom: event.get('newZoom')
                };
                redraw(params);
            }
            if(event.get('delay') == false) {
                run();
            } else {
                clearTimeout(timer);
                timer = setTimeout(run, DELAY_REDRAW);
            }
        });

        Number.prototype.toFixedDown = function(digits) {
            var re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)"),
                m = this.toString().match(re);
            return m ? parseFloat(m[1]) : this.valueOf();
        };

        var getBaloonItems = function(coords){
            var items = [];
            var data = getBaloonData();

            for(var i = 0; i < data.length; i++) {
                var item = data[i];

                for(var j = 0; j < item['points'].length; j++) {
                    if(item['points'][j][0].toFixedDown(TRUNC_ACCURACY) == coords[0].toFixedDown(TRUNC_ACCURACY)
                        && item['points'][j][1].toFixedDown(TRUNC_ACCURACY) == coords[1].toFixedDown(TRUNC_ACCURACY)
                    ) {
                        items.push({
                            'route_id': item['route_id'],
                            'transport_id': item['transport_id'],
                            'points': [
                                item['points'][j][0].toFixedDown(3),
                                item['points'][j][1].toFixedDown(3)
                            ]
                        });
                        break;
                    }
                }
            }
            return items;
        };

        var createBalloonContentFrom = function(items) {
            var used_routes = [];
            var content = '';
            for(var i = 0; i < items.length; i++) {
                if(used_routes.indexOf(items[i].route_id) === -1) {
                    content += [
                        'Маршрут:', items[i].route_id, '<br>',
                        'Транспорт:', items[i].transport_id, '<br>',
                        'Координаты:', '['  + items[i].points.join(', ') + ']', '<br><br>'
                    ].join(' ');
                    used_routes.push(items[i].route_id)
                }
            }
            return content;
        };

        map.events.add('contextmenu', function (e) {
            // change cords
            var coords = e.get('coords');
            var items = getBaloonItems(coords);
            if(items.length) {
                var content = createBalloonContentFrom(items);
                map.balloon.open([coords[0].toFixedDown(2), coords[1].toFixedDown(2)], content);
            }
        });

        // draw heatmap points when map is loaded
        map.events.fire('boundschange', {'newZoom': DEFAULT_ZOOM, 'delay': false});
    });
});