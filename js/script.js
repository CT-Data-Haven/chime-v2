

$(document).ready(function() {

    var sublayers = [];
    var $typeMenu = $('input[type=radio][name=ageType]');
    var $geoMenu = $('input[type=radio][name=geography]');
    var $condMenu = $('#conditionMenu');
    var $ageMenu = $('#ageGroupMenu');
    var ageStr;
    var age;
    //var json;

    var layerID = {
        town: 0,
        zip: 1,
        region: 2
    };

    var geoStrings = {
        town: ['town', 'region'],
        zip: ['town', 'town2', 'zip'],
        region: ['region']
    };



    $('.toggle-link').click(function(e) {
        e.preventDefault();
        $(this).find('span').toggleClass('hidden');
    });

    $.getJSON('json/conditions.json')
        .done(function(data) {
            setup(data);
        })
        .fail(function() {
            var $msg = $('<h4>An error occurred. Please reload to try again. </h4>').addClass('bg-danger');
            $('body').prepend($msg);
        });





    function setup(json) {

        var options = {
            zoom: 9,
            //center: [41.369852, -72.682523]
            center: [41.5, -72.70],
            scrollWheelZoom: false
        };

        var layerSource = {
            user_name: 'datahaven',
            type: 'cartodb',
            legends: true,
            sublayers: [
                {
                    sql: "SELECT * FROM chime_town_v2_map",
                    cartocss: $('#base-css').text()
                },
                {
                    sql: "SELECT * FROM chime_zip_v2_map",
                    cartocss: $('#base-css').text()
                },
                {
                    sql: "SELECT * FROM chime_region_v2_map",
                    cartocss: $('#base-css').text()
                }
                /*,
                {
                    sql: "SELECT * FROM hospital_areas_shape",
                    cartocss: $('#area-css').text()
                }*/
            ]
        };

        var map_obj = new L.map('map-container', options);

        L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
            subdomains: 'abcd'
        }).addTo(map_obj);

        cartodb.createLayer(map_obj, layerSource, { https: true })
            .addTo(map_obj)
            .done(function(layer) {

                // need to store set of columns available for each geography--needed to set up interactivity for each layer
                var columnArr = [];
                $.each(json.selects.select, function(i, select) {
                    var geo = select.value;
                    var opts = [];

                    $.each(select.optgroup, function(j, optgroup) {
                        $.each(optgroup.options, function(k, option) {
                            if (option.ages.length) {
                                $.each(option.ages, function(l, age) {
                                    opts.push(option.value + '_' + age);
                                });
                                opts.push(option.value + '_age_adjusted'); // don't have age adjusted in json
                            } else {
                                opts.push(option.value);
                            }

                        });
                    });

                    opts = opts.concat(geoStrings[geo]);
                    columnArr[geo] = opts;

                });

                var geos = ['town', 'zip', 'region'];
                for (var i = 0; i < layer.getSubLayerCount(); i++) {
                    sublayers[i] = layer.getSubLayer(i);
                    sublayers[i].hide();
                }
                for (var j = 0; j < layer.getSubLayerCount(); j++) {
                    sublayers[j].setInteraction(true);
                    sublayers[j].setInteractivity(columnArr[geos[j]].join(', '));
                    cdb.vis.Vis.addInfowindow(map_obj, sublayers[j], columnArr[geos[j]]);
                }
                sublayers.forEach(function(sublayer) {
                    sublayer.on('featureClick', function(event, latlng, pos, data) {
                        updateInfowindow(data);
                    });
                });

                //getGeography();
                getOptions(json);
                //createAreas(sublayers[layerID.hosp]);

                // add table
                $.tablesorter.themes.bootstrap = {
                    header: 'bootstrap-header',
                    table: 'table-bordered table-hover',

                    sortNone     : '',
                    sortAsc      : '',
                    sortDesc     : '',
                    active       : '', // applied when column is sorted
                    hover        : '', // custom css required - a defined bootstrap style may not override other classes
                    // icon class names
                    icons        : '', // add "icon-white" to make them white; this icon class is added to the <i> in the header
                    iconSortNone : 'bootstrap-icon-unsorted', // class name added to icon when column is not sorted
                    iconSortAsc  : 'glyphicon glyphicon-chevron-up', // class name added to icon when column has ascending sort
                    iconSortDesc : 'glyphicon glyphicon-chevron-down', // class name added to icon when column has descending sort
                    filterRow    : '', // filter row class; use widgetOptions.filter_cssFilter for the input/select element

                };
                $('#hospitalTable').tablesorter({
                    //widthFixed: true,
                    sortList: [
                        [3, 0]
                    ],
                    theme: 'bootstrap',
                    headerTemplate: '{content} {icon}',
                    //cssInfoBlock: 'avoid-sort',
                    widgets: ['filter', 'uitheme'],
                    widgetOptions: {
                        filter_columnFilters: true,
                        filter_cssFilter: 'form-control'
                    }
                }).tablesorterPager({
                    container: $('.pager-container'),
                    output: '{startRow} to {endRow} of {totalRows}'
                });

            });
    }


    function getOptions(json) {

        var condition;
        var column;
        var geo;

        $geoMenu.change(function() {
            $condMenu.empty().detach();
            geo = $geoMenu.filter(':checked').val();

            $.each(json.selects.select, function(i, select) {
                if (select.value === geo) {
                    $.each(select.optgroup, function(j, optgroup) {
                        var $optgroup = $('<optgroup></optgroup>').attr('label', optgroup.label);
                        $.each(this.options, function(k, option) {
                            // create option
                            $('<option></option>')
                                .val(option.value)
                                .data({
                                    'ages': option.ages,
                                    'number': option.number
                                })
                                .text(option.name)
                                .appendTo($optgroup);
                        });
                        $optgroup.appendTo($condMenu);
                    });
                }
            });
            $condMenu.appendTo($('#condition-container'));
            
            for (var i = 0; i < sublayers.length; i++) {
                if (i === layerID[geo]) {
                    sublayers[i].show();
                } else {
                    sublayers[i].hide();
                }
            }
            $('.geo-heading').text(geo);
        });

        $typeMenu.change(function() {

        });

        $condMenu.change(function() {

        });

        $('.query-menu').change(function() {
            var type = $typeMenu.filter(':checked').val();

            var agesArray = $condMenu.find(':selected').data('ages');
            // if agesArray has length
            if (agesArray.length) {
                $('.age-slider').slideDown();
                $ageMenu.prop('disabled', false);
                $ageMenu.children()
                    .prop('disabled', true)
                    .filter(function(d) {
                        if ($.inArray($(this).val(), agesArray) !== -1) {
                            $(this).prop('disabled', false);
                        }
                    });

                if (type === 'age_adjusted') {
                    age = '_age_adjusted';
                    $ageMenu.prop('disabled', true);
                } else {
                    age = '_' + $ageMenu.val();
                }
            } else {
                $('.age-slider').slideUp();
                $ageMenu.prop('disabled', true);
                age = '';
            }

            // set headings
            condition = $condMenu.val();
            ageStr = age.length > 0 ? ', ' + age.replace('_', '').replace(/_(?=\d)/, '-').replace('_', ' ') : '';
            $('#age-head').text(ageStr);
            $('.indicator-heading').text($condMenu.find(':selected').text());
            $('.definition').addClass('hidden');
            $('.definition#def-' + condition).removeClass('hidden');

            column = condition + age;

            updateQuery(geo, column);

        });

        $('.query-menu').eq(0).change();

    }


    /*function createAreas(layer) {
        $('#hospButton').click(function(e) {
            e.preventDefault();
            drawAreas(layer);
            //updateTable();
        });
        $('#resetButton').click(function(e) {
            e.preventDefault();
            $('input[name=area]').prop('checked', false);
            drawAreas(layer);
        });
    }

    function updateAreas() {
        var arr = [];
        $.each($('input[name=area]:checked'), function() {
            var area = "'Greater " + $(this).val().replace(/_/g, ' ') + "'";
            arr.push(area);
        });
        var areas = arr.length > 0 ? '(' + arr.join() + ')' : "('')";
        return areas;
    }

    function drawAreas(layer) {
        var areas = updateAreas();
        var query = "SELECT * FROM hospital_areas_shape WHERE hospital_area IN " + areas;

        layer.set({
            sql: query,
            cartocss: $('#area-css').text()
        });
        layer.show();

    }*/

    function updateQuery(geo, column) {
        var layer = sublayers[layerID[geo]];
        var geoStr = geoStrings[geo].join(', ');

        var colors = ['#0c2c84', '#225ea8', '#1d91c0', '#41b6c4', '#7fcdbb', '#c7e9b4', '#ffffcc'];
        var allCSS = $('#base-css').text();

        var sql = new cartodb.SQL({ user: 'datahaven' });
        var queryBin = "SELECT CDB_JenksBins(array_agg(" + column + "::numeric), 7) FROM chime_" + geo + "_v2_map WHERE " + column + " IS NOT NULL";
        var queryTable = "SELECT " + column + " AS value, " +  geoStr + ", cartodb_id FROM chime_" + geo + "_v2_map WHERE " + column + " IS NOT NULL";
        console.log(queryTable);

        sql.execute(queryBin)
            .done(function(data) {
                var breaks = data.rows[0].cdb_jenksbins;
                breaks.reverse().forEach(function(val, i) {
                    var color = colors[i];
                    allCSS += ' #chime_' + geo + '_v2_map [ ' + column + ' <= ' + val + ' ] { polygon-fill: ' + color + '; }';
                });
                layer.setCartoCSS(allCSS);
                buildLegend(breaks, colors);
            })
            .error(function(err) {
                console.log(err);
            });
        sql.execute(queryTable)
            .done(function(data) {
                updateTable(data, geo, column);
            })
            .error(function(err) {
                console.log(err);
            });
    }

    function updateTable(data, geo, column) {
        var format = $condMenu.find(':selected').data('number');
        var $hospitalTable = $('#hospitalTable');

        var $tbody = $hospitalTable.find('tbody').empty().detach();
        //$('tbody tr').remove();
        var dataArr = data.rows;
        $('#ct-heading').text('');

        dataArr.forEach(function(d) {
            d.rateDisplay = d.value === null ? 'Not available' : numeral(d.value).format(format);
            var zip = d.zip ? d.zip : '';
            var town = d.town2 ? d.town2 : ( d.town ? d.town : '' );
            var region = d.region ? d.region : '';

            var $row = $('<tr><td>' + region + '</td><td>' + town + '</td><td>' + zip + '</td><td class="text-right">' + d.rateDisplay + '</td></tr>');
            $row.data('cartodb_id', d.cartodb_id);
            if (town === 'Connecticut' || region === 'Connecticut') { // if CT, put row at beginning--currently not staying frozen at top
                $('#ct-heading').text('Connecticut: ' + d.rateDisplay);
                $row.addClass('highlight');
            } else {
                $row.addClass('clickable');
            }
            $tbody.append($row);
        });



        // want better way to do this: hide table columns based on geo
        $hospitalTable.find('th, td').removeClass('hidden');
        //$('#hospitalTable th, #hospitalTable td').removeClass('hidden'); // show all th & td
        var $hiddenCol;
        if (geo === 'town') {
            $hiddenCol = $('.zip-col');
        } else if (geo === 'region') {
            $hiddenCol = $('.zip-col, .town-col');
        } else {
            $hiddenCol = $();
        }
        $.each($hiddenCol, function() {
            var idx = $(this).index();
            $.each($('tr'), function() {
                $(this).find('td').eq(idx).addClass('hidden');
            });
        });
        $hiddenCol.addClass('hidden');

        $('tr.clickable').click(function(e) {
            // query for entry with this id. Need to get data on geometry:
            var query = "SELECT *, ST_X(ST_Centroid(the_geom)) AS lon, ST_Y(ST_Centroid(the_geom)) AS lat FROM chime_" + geo + "_v2_map WHERE cartodb_id = " + $(this).data('cartodb_id');
            var sql = new cartodb.SQL({ user: 'datahaven' });
            sql.execute(query)
                .done(function(data) {
                    var lon = data.rows[0].lon;
                    var lat = data.rows[0].lat;
                    sublayers[layerID[geo]].trigger('featureClick', null, [lat, lon], null, data.rows[0]);
                })
                .error(function(err) {
                    console.log(err);
                });

        });

        $tbody.appendTo($hospitalTable);

        $hospitalTable.trigger('update');

    }

    function updateInfowindow(data) {
        $('.cartodb-popup-content').text('');

        var type = $typeMenu.filter(':checked').val();
        var geo = $geoMenu.filter(':checked').val();
        var condition = $condMenu.val();
        var condStr = $condMenu.find('option:selected').text();
        var format = $condMenu.find('option:selected').data('number');

        var column = condition + age;

        var zip = data.zip ? data.zip : '';
        var town = data.town2 ? data.town2 : ( data.town ? data.town : '' );
        var region = data.region ? data.region : '';
        if (data.town && data.zip) {
            town = '(' + town + ')';
        }
        if (data.town && data.region) {
            region = '(' + region + ')';
        }

        var rate = data[column] ? numeral(data[column]).format(format) : 'Not available';

        var $h4 = $('<h4 style="color: #333;">' + zip + ' ' + town + ' ' + region + '</h4>');
        var $h5 = $('<h5 style="color: #666;">' + condStr + ageStr + '</h5>');
        var $p = $('<p>' + rate + '</p>');
        $('.cartodb-popup-content').append($h4, $h5, $p);
    }

    function buildLegend(breaks, colors) {
        $('.cartodb-legend').remove();

        var format = $condMenu.find('option:selected').data('number');
        if (format === '0,0.00') { format = '0,0'; }

        var left = breaks.length - 1;
        var leftVal = numeral(breaks[left]).format(format);
        var rightVal = numeral(breaks[0]).format(format);
        var legend = new cdb.geo.ui.Legend.Choropleth({
            title: $condMenu.find('option:selected').text(),
            left: leftVal,
            right: rightVal,
            colors: colors.reverse()
        });
        $('#map-container').append(legend.render().el);
    }

});
