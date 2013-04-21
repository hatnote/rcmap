var country_name_map = {
         'Brunei Darussalam': 'Brunei',
         'Congo': 'Republic of the Congo',
         'Congo, The Democratic Republic of the': 'Democratic Republic of the Congo',
         "Cote D'Ivoire": 'Ivory Coast',
         'Falkland Islands (Malvinas)': 'Falkland Islands',
         'French Southern Territories': 'French Southern and Antarctic Lands',
         'Guinea-Bissa': 'Guinea Bissau',
         'Iran, Islamic Republic of': 'Iran',
         "Korea, Democratic People's Republic of": 'North Korea',
         'Korea, Republic of': 'South Korea',
         "Lao People's Democratic Republic": 'Laos',
         'Moldova, Republic of': 'Moldova',
         'Palestinian Territory': 'West Bank',
         'Russian Federation': 'Russia',
         'Serbia': 'Republic of Serbia',
         'Syrian Arab Republic': 'Syria',
         'Tanzania, United Republic of': 'United Republic of Tanzania',
         'Timor-Leste': 'East Timor',
         'United States': 'United States of America'
};

var total_edits = 0;
var edits_per_minute = [];
var world_map;

var log_rc = function(rc_str, limit) {
    $('#rc-list').prepend('<li>' + rc_str + '</li>');
    if($('#rc-list li').length > limit) {
        $('#rc-list li').slice(limit, limit + 1).remove();
    }
};

var highlight_country = function(country_name) {
    return d3.select('path[data-country-name="' + country_name + '"]')
                      .style('fill', '#eddc4e')
                      .transition()
                      .duration(5000)
                      .style('fill', '#ccc');
};

var get_country_names = function() {
    var ret = [];
    d3.selectAll('path[data-country-name]')
      .each(function(d) {
        ret.push(d.properties.name);
      });
    return ret;
};

var addBubbles = function(bubbles) {
    var self = this;
    if (_.isUndefined(bubbles.length)) {
        bubbles = [];
    }

    var projection = this._map.get('projection');
    var options = this.options.bubble_config;

    var bubbleContainer = this.svg.append('g').attr('class', 'bubbles');
    bubbleContainer
        .selectAll('circle.bubble')
        .data(bubbles)
        .enter()
        .append('svg:circle')
        .on('mouseover', function(datum) {
            var hoverover = self.$el.find('.hoverover');
            var eventData = {
                data: datum
            };

            hoverover.css({position:'absolute'})
            .html(options.popupTemplate( eventData )).show();

            hoverover.data('width', self.$el.find('.hoverover').width());

            if (options.highlightOnHover) {
                d3.select(this)
                .style('fill', options.highlightFillColor)
                .style('stroke', options.highlightBorderColor)
                .style('stroke-width', options.highlightBorderWidth)
                .style('fill-opacity', options.highlightFillOpacity);
            }
            self.$el.trigger($.Event("bubble-mouseover"), eventData);
        })
        .on('mousemove', function() {
            self.updateHoverOverPosition(this);
        })
        .on('mouseout', function(datum) {
            self.$el.find('.hoverover').hide();
            var eventData = {
                data: datum
            };

            self.$el.trigger($.Event("bubble-mouseout"), eventData);

            if (options.highlightOnHover) {
              var el = d3.select(this);
                el.style('fill', el.attr('data-fill'))
                  .style('stroke', options.borderColor)
                  .style('stroke-width', options.borderWidth)
                  .style('fill-opacity', options.fillOpacity);
            }
        })
        .on('touchstart', function(datum) {
            self.$el.trigger($.Event("bubble-touchstart"), {data: datum});
        })
        .on('click', function(datum) {
            self.$el.trigger($.Event("bubble-click"), {data: datum});
        })
        .attr('cx', function(datum) {
            return projection([datum.longitude, datum.latitude])[0];
        })
        .attr('cy', function(datum, index) {
            return projection([datum.longitude, datum.latitude])[1];
        })
        .style('fill', function(datum) {
            var fillColor = self.getFillColor(datum);
            d3.select(this).attr('data-fill', fillColor);
            return fillColor;
        })
        .style('stroke', function(datum) {
            return options.borderColor; //self.getFillColor(datum);
        })
        .attr('class', 'bubble')
        .style('stroke-width', options.borderWidth)
        .attr('fill-opacity', options.fillOpacity)
        .attr('r', 0)
        .transition()
        .duration(400)
        .attr('r', function(datum) {
            return datum.radius;
        })
        .each(function(d){
            total_edits += 1;
            edits_per_minute.push(new Date().getTime())
            /*
            for (var i=0;i<edits_per_minute.length;i++) {
                var now = new Date().getTime()
                if (edits_per_minute[i] < (now - 60000)) {
                    edits_per_minute.pop(i)
                }
            }
            */
            if (total_edits == 1) {
                $('#edit_counter').html('You have seen <span>' + total_edits + ' edit</span>.')
            } else {
                $('#edit_counter').html('You have seen a total of <span>' + total_edits + ' edits</span>.')
            }
            var x = projection([d.longitude, d.latitude])[0];
            var y = projection([d.longitude, d.latitude])[1];
            var div = $('<div />').css({
                                        position:'absolute',
                                        'top': y + 5,
                                        'left': x,
                                        })
                                .addClass('popup-box')
                                .animate({opacity: 0}, 4000, null, function() {
                                    this.remove();
                                });

            div.html(d.page_title);
            $('#map').append(div);
        });
};

function enWikipediaSocket() {

}

enWikipediaSocket.init = function() {
    // Terminate previous connection, if any
    if (this.connection)
      this.connection.close();

    if ('WebSocket' in window) {
        var connection = new ReconnectingWebSocket(WS_URL);
        this.connection = connection;

        connection.onopen = function() {
            console.log('Connection open!');
        };

        connection.onclose = function() {
            console.log('Connection closed ...')
        };

        connection.onerror = function(error) {
            console.log('Connection Error: ' + error);
        };

        connection.onmessage = function(resp) {
            try {
                var data = JSON.parse(resp.data);
                var fill_key;
                if (data.change_size > 0) {
                    fill_key = 'add';
                } else {
                    fill_key = 'subtract';
                }
                req_url = 'http://freegeoip.net/json/' + data.user;
                $.getJSON(req_url, null, function(fgi_resp) {
                    world_map.options.bubbles = world_map.options.bubbles.slice(-20);
                    loc_str = fgi_resp.country_name;
                    if (fgi_resp.region_name) {
                        loc_str = fgi_resp.region_name + ', ' + loc_str;
                    }
                    if (fgi_resp.city) {
                        loc_str = fgi_resp.city + ' (' + loc_str + ')';
                    }
                    log_rc_str = 'Someone in <span class="loc">' + loc_str + '</span> edited "<a href="' + data.url + '" target="_blank">' + data.page_title + '</a>"';
                    log_rc(log_rc_str, RC_LOG_SIZE);
                    //console.log('An editor in ' + loc_str + ' edited "' + data.page_title + '"')
                    $('.bubbles')
                        .animate({opacity: 0,
                            radius: 10},
                            40000,
                            null,
                            function(){
                                this.remove();
                            });
                    world_map
                        .addBubbles([{radius: 4,
                            latitude: fgi_resp.latitude,
                            longitude: fgi_resp.longitude,
                            page_title: data.page_title,
                            fillKey: fill_key,
                        }])
                    country_hl = highlight_country(fgi_resp.country_name)

                    if (!country_hl[0][0]) {
                        country_hl = highlight_country(country_name_map[fgi_resp.country_name])
                        if (!country_hl[0][0]) {
                            console.log('Could not highlight country: ' + fgi_resp.country_name)
                        }
                    }
                })
            } catch (e) {
              console.log(resp);
            }
        }
    };
}

enWikipediaSocket.close = function() {
    if (this.connection)
        this.connection.close();
};
