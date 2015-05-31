ymaps.ready(function () {
    var DEFAULT_DATA = [];
    var DEFAULT_ZOOM = 4;
    var URL_HEATMAP_POINTS = 'data.json';
    var DELAY_REDRAW = 200000000;

    var map = new ymaps.Map('YMapsID', {
            center: [58.634927373343615, 57.1701054234582],
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
                heatmap.setData(response);
            }, function(){
                alert('К сожалению произошла странная ошибка. Осторожно обновите страницу.');
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
            var $dfd = $.Deferred();

            var onSuccess = function(data){
                for(var i = 0; i < data.length; i++) {
                    var item = data[i];
                    items.push({
                        'route_id': item[0],
                        'transport_id': item[1]
                    });
                }
                $dfd.resolve(items);
            };
            $.ajax({
                url: 'info',
                dataType: 'json',
                data: {
                    x: coords[1],
                    y: coords[0]
                },
                success: onSuccess,
                error: function(){
                    alert('Ошибка!');
                    $dfd.fail();
                }
            });
            return $dfd.promise();
        };

        var createBalloonContentFrom = function(items) {
            var used_routes = [];
            var content = '';
            for(var i = 0; i < items.length; i++) {
                if(used_routes.indexOf(items[i].route_id) === -1) {
                    content += [
                        'Маршрут:', items[i].route_id, '<br>',
                        'Транспорт:', items[i].transport_id, '<br><br>'
                    ].join(' ');
                    used_routes.push(items[i].route_id)
                }
            }
            return content;
        };

//        map.events.add('contextmenu', function (e) {
//            // change cords
//            var coords = e.get('coords');
//
//            getBaloonItems(coords).done(function(items){
//                if(items.length) {
//                    var content = createBalloonContentFrom(items);
//                    map.balloon.open([coords[0].toFixedDown(2), coords[1].toFixedDown(2)], content);
//                }
//            });
//        });

        // draw heatmap points when map is loaded
        map.events.fire('boundschange', {'newZoom': DEFAULT_ZOOM, 'delay': false});
    });
});