$(document).ready(function() {

    var sublayers = [];
    var $typeMenu = $('input[type=radio][name=ageType]');
    var $geoMenu = $('input[type=radio][name=geography]');
    var $condMenu = $('#conditionMenu');
    var $ageMenu = $('#ageGroupMenu');
    var ageStr;
    var age;

    $('.toggle-link').click(function(e) {
        e.preventDefault();
        $(this).find('span').toggleClass('hidden');
    });

    var layerID = {
        town: 0,
        zip: 1,
        hosp: 2
    };

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
                sql: "SELECT * FROM hospital_areas_shape",
                cartocss: $('#area-css').text()
            }
        ]
    };

    var map_obj = new L.map('map-container', options);

    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        subdomains: 'abcd'
    }).addTo(map_obj);

    cartodb.createLayer(map_obj, layerSource, { https: true })
        .addTo(map_obj)
        .done(function(layer) {

            for (var i = 0; i < layer.getSubLayerCount(); i++) {
                sublayers[i] = layer.getSubLayer(i);
            }
            sublayers[1].hide(); // zips
            sublayers[2].hide(); // hospital area-css
            sublayers[0].setInteraction(true);
            sublayers[1].setInteraction(true);

            var townVars = 'asthma_0_4, bachelors, dental_20_44, dental_45_64, dental_65_74, dental_75_84, dental_age_adjusted, ' +
                'dental_all_ages, diabetes_20_44, diabetes_45_64, diabetes_65_74, diabetes_75_84, diabetes_age_adjusted, ' +
                'diabetes_all_ages, heart_disease_20_44, heart_disease_45_64, heart_disease_65_74, heart_disease_75_84, ' +
                'heart_disease_age_adjusted, heart_disease_all_ages, homicide_0_19, homicide_20_44, homicide_45_64, ' +
                'homicide_65_74, homicide_75_84, homicide_age_adjusted, homicide_all_ages, low_income_children, median_hh_income, ' +
                'severe_housing_burden, substance_abuse_20_44, substance_abuse_45_64, substance_abuse_65_74, substance_abuse_75_84, ' +
                'substance_abuse_age_adjusted, substance_abuse_all_ages, town, personal, financial, qos, walkability';
            var zipVars = townVars + ', town2, zip';
            var townVarsArr = townVars.split(', ');
            var zipVarsArr = zipVars.split(', ');

            sublayers[0].setInteractivity(townVars);
            sublayers[1].setInteractivity(zipVars);
            cdb.vis.Vis.addInfowindow(map_obj, sublayers[0], townVarsArr);
            cdb.vis.Vis.addInfowindow(map_obj, sublayers[1], zipVarsArr);

            sublayers[0].on('featureClick', function(event, latlng, pos, data) {
                updateInfowindow(data);
            });
            sublayers[1].on('featureClick', function(event, latlng, pos, data) {
                updateInfowindow(data);
            });

            getGeography();
            getOptions();
            createAreas(sublayers[2]);

            // add table
            $.tablesorter.themes.bootstrap = {
                header: 'bootstrap-header',
                table: 'table-bordered table-hover',
                /*icons: '',
                iconSortNone: 'bootstrap-icon-unsorted',
                iconSortAsc: 'glyphicon glyphicon-chevron-up',
                iconSortDesc: 'glyphicon glyphicon-chevron-down'*/
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
                    [2, 0]
                ],
                theme: 'bootstrap',
                headerTemplate: '{content} {icon}',
                cssInfoBlock: 'avoid-sort',
                widgets: ['filter', 'uitheme', 'staticRow'],
                widgetOptions: {
                    filter_columnFilters: true,
                    filter_cssFilter: 'form-control'
                }
            }).tablesorterPager({
                container: $('.pager-container'),
                output: '{startRow} to {endRow} of {totalRows}'
            });

        });

    function getGeography() {
        $geoMenu.change(function(e) {
            var geo = $geoMenu.filter(':checked').val();
            var num = layerID[geo];

            for (var i = 0; i < sublayers.length; i++) {
                if (i === num) {
                    sublayers[i].show();
                } else {
                    sublayers[i].hide();
                }
            }
            $('.geo-heading').text(geo);
        });
    }

    function getOptions() {
        var geo;
        var condition;
        $('.query-menu').change(function() {

            geo = $geoMenu.filter(':checked').val();
            condition = $condMenu.val();
            var type = $typeMenu.filter(':checked').val();

            var groupArr = $condMenu.find(':selected').data('group').split('/');

            // if an index is selected as condition, select town for geo and disable zip
            if (geo === 'zip') {
                $condMenu.find('[data-geo="town"]').prop('disabled', true);
            } else {
                $condMenu.find('[data-geo="town"]').prop('disabled', false);
            }
            if ($condMenu.find(':selected').data('geo') === 'town') {
                $('input[type=radio][value=zip]').attr('disabled', true);
            } else {
                $('input[type=radio][value=zip]').attr('disabled', false);
            }

            // if ages = 0-19 and condition is something other than homicide, set age to all ages
            if ($ageMenu.val() === '0_19' & $condMenu.val() !== 'homicide') {
                $ageMenu.val('all_ages');
            }
            // set age after looking at groups
            if (groupArr[0] === 'no_age') {
                $ageMenu.prop({'disabled': true,
                               'selectedIndex': 0
                });
                $typeMenu.first().prop('checked', true); // reset to first radio button when no_age chosen

                age = '';
                $('.age-slider').slideUp();
            } else if (type === 'age_adjusted') {
                $ageMenu.prop('disabled', true);
                age = '_age_adjusted';
                $('.age-slider').slideDown();
            } else {
                // if grouped age, turn off all age groups, turn ones from groupArr back on
                $ageMenu.prop('disabled', false);
                $ageMenu.children().prop('disabled', true);
                $ageMenu.children().filter(function(i) {
                    if ($.inArray($(this).val(), groupArr) > -1) { // if value of this option is in groupArr
                        $(this).prop('disabled', false);
                    }
                });
                age = '_' + $ageMenu.val();
                $('.age-slider').slideDown();
            }

            // build strings for heading
            // replace first underscore with space, replace second with hyphen
            ageStr = age.length > 0 ? ', ' + age.replace('_', '').replace(/_(?=\d)/, '-').replace('_', ' ') : ''; //age.replace(/_/, ' ').replace(/_/, '-') : '';
            //var ageStr = age.replace(/_/, ' ').replace(/_/, '-');
            $('.age-heading').text(ageStr);
            var conditionStr = $condMenu.find('option:selected').text();
            $('.indicator-heading').text(conditionStr);
            // encounter type string, only if data-hosp exists
            //var hosp = $condMenu.find(':selected').data('hosp');
            //var hospStr = hosp ? ' per 10,000 residents, ' + hosp.replace(/_/, ' ') : '';
            //$('#hosp-head').text(hospStr);
            // add class .definition-show to display definition based on value of condition
            $('.definition').removeClass('definition-show'); // clear current definition
            $('#def-' + condition).addClass('definition-show');

            var column = condition + age;

            updateQuery(geo, column);
        });
        // trigger change on one element
        $('.query-menu').eq(0).change();
    }


    function createAreas(layer) {
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

        console.log(layer);
    }

    function updateQuery(geo, column) {
        var layer = sublayers[layerID[geo]];
        var geoStr = geo === 'town' ? 'town' : 'town, town2, zip';

        var colors = ['#0c2c84', '#225ea8', '#1d91c0', '#41b6c4', '#7fcdbb', '#c7e9b4', '#ffffcc'];
        var allCSS = $('#base-css').text();

        var sql = new cartodb.SQL({ user: 'datahaven' });
        var queryBin = "SELECT CDB_JenksBins(array_agg(" + column + "::numeric), 7) FROM chime_" + geo + "_v2_map WHERE " + column + " IS NOT NULL";
        var queryTable = "SELECT " + geoStr + ", " + column + " AS value, cartodb_id FROM chime_" + geo + "_v2_map WHERE " + column + " IS NOT NULL";

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
        $('tbody tr').remove();
        var dataArr = data.rows;

        dataArr.forEach(function(d) {
            d.rateDisplay = d.value === null ? 'Not available' : numeral(d.value).format(format);
            var zip = d.zip ? d.zip : '';
            var town = d.town2 ? d.town2 : ( d.town ? d.town : '' );

            var $row = $('<tr><td>' + town + '</td><td>' + zip + '</td><td class="text-right">' + d.rateDisplay + '</td></tr>');
            $row.data('cartodb_id', d.cartodb_id);
            if (town === 'Connecticut') { // if CT, put row at beginning
                $('#ct-heading').text('Connecticut: ' + d.rateDisplay);
                $row.addClass('highlight');
                //$row.data('row-index', 0);
                //$('tbody').prepend($row);
            } else {
                $row.addClass('clickable');
                //$('tbody').append($row);
            }
            $('tbody').append($row);
            //var town = d.town ? d.town : '';

            /*if (d.zip) {
                $('.hideable').show();
            } else {
                $('.hideable').hide();
            }*/
        });

        $('tr.clickable').click(function(e) {
            // query for entry with this id. Need to get data on geometry:
            var query = "SELECT *, ST_X(ST_Centroid(the_geom)) AS lon, ST_Y(ST_Centroid(the_geom)) AS lat FROM chime_" + geo + "_v2_map WHERE cartodb_id = " + $(this).data('cartodb_id');
            var sql = new cartodb.SQL({ user: 'datahaven' });
            sql.execute(query)
                .done(function(data) {
                    //console.log(data);
                    var lon = data.rows[0].lon;
                    var lat = data.rows[0].lat;
                    //console.log(lon + ', ' + lat);
                    sublayers[layerID[geo]].trigger('featureClick', null, [lat, lon], null, data.rows[0]);
                })
                .error(function(err) {
                    console.log(err);
                });

        });

        $('#hospitalTable').trigger('update');

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
        var town = data.town2 ? data.town2 + ' ' : ( data.town ? data.town + ' ' : '' );

        var rate = data[column] ? numeral(data[column]).format(format) : 'Not available';

        var $h4 = $('<h4 style="color: #333;">' + town + zip + '</h4>');
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
