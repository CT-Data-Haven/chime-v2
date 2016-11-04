// TODO: bind featureOver, featureOut handlers to highlight polygons

// global variables

var sublayers = [];

var layerID = {
    town: 0,
    zip: 1,
    region: 2
};

var geoStrings = {
    town: ['town', 'region'],
    zip: ['town', 'town2', 'zip', 'region'],
    region: ['region']
};

var hoverLayer;
var highlighted; // holds highlighted polygon

//var $typeMenu = $('input[type=radio][name=ageType]');
//var $conditionsContainer = $('#conditionsContainer');
//var $geoMenu = $('input[type=radio][name=geography]');
//var $geoMenu = $('.geo-menu');
//var $conditions = $('#conditionsContainer');
//var $ageMenu = $('#ageGroupMenu');
var ageStr;
var age;




$(document).ready(function() {
    init();
    $('.toggle-link').click(function(e) {
        e.preventDefault();
        $(this).find('span').toggleClass('hidden');
    });
});

function init() {
    $.getJSON('json/conditions.json')
        .done(function(json) {
            setupConditions(json.selects);
            createMaps(json.selects);
            //bindOptions();

            $(document).ready(function() {
                bindOptions();
                //createMaps(json.selects);
                createTable();
            });
        })
        .fail(function() {
            var $msg = $('<h4>An error occurred. Please reload to try again, or make sure Javascript is enabled.</h4>');
            $('body').prepend($msg);
        });
}

// $('.toggle-link').click(function(e) {
//     e.preventDefault();
//     $(this).find('span').toggleClass('hidden');
// });


// called by getJSON
function setupConditions(selects) {
    $.each(selects.select, function(i, select) {
        var optgroupArr = [];
        $.each(select.optgroup, function(j, optgroup) {
            var $optgroup = $('<optgroup></optgroup>').attr('label', optgroup.label);
            $.each(this.options, function(k, option) {
                $('<option></option>')
                    .val(option.value)
                    .data({
                        'ages': option.ages,
                        'number': option.number
                    })
                    .text(option.name)
                    .appendTo($optgroup);
            });
            optgroupArr.push($optgroup);
        });
        $('#' + this.id).html(optgroupArr);
    });
}

// called by getJSON
function createMaps(selects) {
    var columnArr = [];
    $.each(selects.select, function(i, select) {
        var geo = select.value;
        var opts = [];
        $.each(select.optgroup, function(j, optgroup) {
            $.each(optgroup.options, function(k, option) {
                if (option.ages.length) {
                    $.each(option.ages, function(l, age) {
                        opts.push(option.value + '_' + age);
                    });
                    opts.push(option.value + '_age_adjusted');
                } else {
                    opts.push(option.value);
                }
            });
        });
        opts = opts.concat(geoStrings[geo]);
        // add cartodb_id
        opts.push('cartodb_id');
        columnArr[i] = opts;

    });

    // options
    var options = {
        zoom: 9,
        center: [41.5, -72.70],
        scrollWheelZoom: false
    };

    // layer source
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
        ]
    };

    // bind to container
    var mapObj = new L.map('map-container', options);

    L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
            subdomains: 'abcd'
        }).addTo(mapObj);

    // create layer
    cartodb.createLayer(mapObj, layerSource, {https: true})
        .addTo(mapObj)
        .done(function(layer) {
            for (var i = 0; i < layer.getSubLayerCount(); i++) {
                sublayers[i] = layer.getSubLayer(i);
            }
            $.each(sublayers, function(i, sublayer) {
                sublayer.hide();
                sublayer.setInteraction(true);
                sublayer.setInteractivity(columnArr[i].join(', '));
                cdb.vis.Vis.addInfowindow(mapObj, sublayer, columnArr[i]);
                sublayer.on('featureClick', function(event, latlng, pos, data) {
                    updateInfowindow(data);
                    // add a highlight style
                    //highlightPolygon(data, mapObj, sublayer); // is this legal?
                });
                sublayer.on('featureOver', function(event, latlng, pos, data) {
                    //highlightPolygon(data, mapObj, sublayer);
                });
                sublayer.on('featureOut', function(event, latlng, pos, data) {
                    //removeHighlight(data, mapObj, sublayer);
                });

            });

        })
        .error(function(err) {
            console.log(err);
        });
}


function bindOptions() {
    // variables
    var condition;
    var column;
    var $geoMenu = $('.geo-menu');
    var geo = $geoMenu.filter(':selected').val();
    var $conditions = $('#conditionsContainer'); // holds all three selects
    var $ageMenu = $('#ageGroupMenu');
    var $typeMenu = $('input[type=radio][name=ageType]');
    //var $condMenu = $conditions.find($('#' + geo + 'Select'));
    var $condMenu;

    $geoMenu.change(function() {
        geo = $geoMenu.filter(':checked').val();
        $('#' + geo + 'Select').find('option').eq(0).prop('selected', true); // reset to first condition available

        for (var i = 0; i < sublayers.length; i++) {
            if (i === layerID[geo]) {
                $('.conditions-menu').eq(i).removeClass('hidden');
                sublayers[i].show();
            } else {
                $('.conditions-menu').eq(i).addClass('hidden');
                sublayers[i].hide();
            }
        }
        $('.geo-heading').text(geo);

        $ageMenu.find('option').eq(0).prop('selected', true);
        $typeMenu.eq(0).prop('checked', true); // reset ages
    });


    $('.query-menu').change(function() {
        // trigger click on infowindow close button
        $('.cartodb-infowindow').addClass('hidden');

        $condMenu = $conditions.find($('#' + geo + 'Select'));

        var type = $typeMenu.filter(':checked').val();
        var agesArray = $condMenu.find(':selected').data('ages');

        if (agesArray && agesArray.length) {
            $('.age-slider').slideDown();

            // disable ages based on condition
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

        condition = $condMenu.find(':selected').val();
        ageStr = age.length > 0 ? ', ' + age.replace('_', '').replace(/_(?=\d)/, '-').replace('_', ' ') : '';
        $('.age-heading').text(ageStr);
        $('.indicator-heading').text($condMenu.find(':selected').text());
        $('.definition').addClass('hidden').filter($('#def-' + condition)).removeClass('hidden');

        column = condition + age;

        updateQuery(geo, column);

        // reset table back to first page
        $('#hospitalTable').trigger('pageSet', 1);

        // need to clear highlighted layer

    });

    // when condition changes, set ages back to defaults--age-adjusted, ages menu = all ages
    $conditions.find($('#' + geo + 'Select')).change(function(d) {
        $ageMenu.find('option').eq(0).prop('selected', true);
        $typeMenu.eq(0).prop('checked', true);
    });



    // trigger first input--town radio button
    $('.query-menu').eq(0).change();
}



function createTable() {
    // set up tablesorter properties
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
        container: $('#pager-form'),
        output: '{startRow} to {endRow} of {totalRows}',
        savePages: false
    });
}

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
            buildLegend(breaks, colors, geo);
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
    var $condMenu = $('#' + geo + 'Select');
    var format = $condMenu.find(':selected').data('number');
    var $hospitalTable = $('#hospitalTable');

    var $tbody = $hospitalTable.find('tbody').empty().detach();
    //$('tbody tr').remove();
    var dataArr = data.rows;
    $('#ct-heading').text('');

    dataArr.forEach(function(d) {
        d.rateDisplay = d.value === null ? 'Not available' : numeral(d.value).format(format);
        var zip = d.zip ? d.zip : '';
        //var town = d.town2 ? d.town2 : ( d.town ? d.town : '' );
        var town = d.town2 && d.town ? d.town + '/' + d.town2 : ( d.town ? d.town : '' );
        var region = d.region ? d.region : '';

        var row = '<tr><td class="region-col">' + region + '</td>' +
                    '<td class="town-col">' + town + '</td>' +
                    '<td class="zip-col">' + zip + '</td>' +
                    '<td class="text-right">' + d.rateDisplay + '</td></tr>';
        var $row = $(row);

        //var $row = $('<tr><td>' + region + '</td><td>' + town + '</td><td>' + zip + '</td><td class="text-right">' + d.rateDisplay + '</td></tr>');
        $row.data('cartodb_id', d.cartodb_id);
        if (town === 'Connecticut' || region === 'Connecticut') { // if CT, put row at beginning--currently not staying frozen at top
            $('#ct-heading').text('Connecticut: ' + d.rateDisplay);
            $row.addClass('highlight');
        } else {
            $row.addClass('clickable');
        }
        $tbody.append($row);
    });


    $tbody.find('tr.clickable').click(function(e) {

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
        // scroll back to #map-row
        $('html, body').stop().animate({
            scrollTop: $('#indicator-h4').offset().top
        }, 400);

    });

    $tbody.appendTo($hospitalTable);

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
        $.each($('tr'), function() { // need to find td's within tbody, but also thead because of tablesorter filter row
            $(this).find('th, td').eq(idx).addClass('hidden');
        });
    });
    // change th Town to say Community if geo = zip
    // want better way to do this--I hate having things hard-coded. maybe a global params object by geography?
    if (geo === 'zip') {
        $('th.town-col').text('Community');
    } else {
        $('th.town-col').text('Town');
    }

    $hospitalTable.trigger('update');
}

function updateInfowindow(d) {

    var geo = $('input[type=radio][name=geography]').filter(':checked').val();
    var $condMenu = $('#conditionsContainer').find('#' + geo + 'Select');
    var $condition = $('#' + geo + 'Select').find('option:selected');
    var condition = $condition.val();
    var condStr = $condition.text();
    var format = $condition.data('number');

    var column = condition + age;

    var zip = d.zip ? d.zip : '';
    //var town = data.town2 ? data.town2 : ( data.town ? data.town : '' );
    var town = d.town2 && d.town ? d.town + '/' + d.town2 : ( d.town ? d.town : '' );

    var region = d.region && geo !== 'zip' ? d.region : ''; // don't need region if geo is zip--find better way
    if (d.town && d.zip) {
        town = '(' + town + ')';
    }
    if (d.town && region.length > 0) {
        region = '(' + region + ')';
    }

    var rate = d[column] !== undefined ? numeral(d[column]).format(format) : 'Not available';

    var $h4 = $('<h4 style="color: #333;">' + zip + ' ' + town + ' ' + region + '</h4>');
    var $h5 = $('<h5 style="color: #666;">' + condStr + ageStr + '</h5>');
    var $p = $('<p>' + rate + '</p>');
    var $div = $('<div></div>').append($h4, $h5, $p);

    $('.cartodb-popup-content').html($div);

    // make only this infowindow visible
    $('.cartodb-infowindow').eq(layerID[geo]).removeClass('hidden');
}

function buildLegend(breaks, colors, geo) {
    $('.cartodb-legend').remove();
    var $condition = $('#' + geo + 'Select').find('option:selected');

    var format = $condition.data('number');
    if (format === '0,0.00') { format = '0,0'; }

    var left = breaks.length - 1;
    var leftVal = numeral(breaks[left]).format(format);
    var rightVal = numeral(breaks[0]).format(format);
    var legend = new cdb.geo.ui.Legend.Choropleth({
        title: $condition.text(),
        left: leftVal,
        right: rightVal,
        colors: colors.reverse()
    });
    $('#map-container').append(legend.render().el);
}

function highlightPolygon(d, map, sublayer) {
    var id = d.cartodb_id;
    var highlightCSS = {
        border: '2px solid #000',
        fillOpacity: 0,
        opacity: 1
    };

    var sql = new cartodb.SQL({ user: 'datahaven', format: 'geojson' });
    var query = "SELECT cartodb_id, ST_Simplify(the_geom, 0.005) AS the_geom FROM (" + sublayer.getSQL() + " WHERE cartodb_id = " + id + ") AS wrapper";

    /*hoverLayer = L.geoJson(null, {
        style: {
            color: 'purple',
            fillColor: 'transparent',
            //opacity: 0,
            weight: 1
        }
    }).addTo(map);*/

    sql.execute(query)
        .done(function(geojson) {
            if (highlighted) {
                map.removeLayer(highlighted);
            }
            highlighted = L.geoJson(geojson, {
                style: {
                    color: '#000',
                    fillColor: 'transparent',
                    weight: 2,
                    opacity: 1
                }
            }).addTo(map);
            /*hoverLayer.addData(geojson);
            hoverLayer.on('featureClick', function(e) {
                console.log(e);
                e.layer.setStyle(highlightCSS);
            });*/
        });

}

function removeHighlight(d, map, sublayer) {
    if (highlighted) {
        map.removeLayer(highlighted);
    }

}
