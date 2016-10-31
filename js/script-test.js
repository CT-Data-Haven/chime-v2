(function() {
    ////////////////////////// set up variables needed in other functions
    var sublayers = [];

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
    ///////////////////////// end of variables

    var $typeMenu = $('input[type=radio][name=ageType]');
    //var $geoMenu = $('.geo-menu');
    var $conditionsContainer = $('#conditionsContainer');
    var $conditions = $('.conditions-menu');
    var $ageMenu = $('#ageGroupMenu');
    var ageStr;
    var age;

    // bind click events to toggles

    $('.toggle-link').click(function(e) {
        e.preventDefault();
        $(this).find('span').toggleClass('hidden');
    });

    $.getJSON('json/conditions.json')
        .done(function(json) {
            setupConditions(json);
            bindOptions();
            $(document).ready(function() {
                createMaps(json);
                //bindOptions();
            });
        })
        .fail(function() {
            var $msg = $('<h4>An error occurred. Please reload to try again, or make sure javascript is enabled.</h4>').addClass('bg-danger');
            $('body').prepend($msg);
        });

    $(document).ready(function() {

        //bindOptions();
        createTable();
    });









    function setupConditions(json) {
        // don't rebuild select each time geography changes--make one select per geography, then hide / unhide according to $geoMenu
        // each has same class 'conditions-menu', add id to match type of geography selected
        // held by #conditions-container
        $.each(json.selects.select, function(i, select) {
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

    function bindOptions() {
        // variables
        var condition;
        var column;
        var geo;
        var $geoMenu = $('.geo-menu');

        $geoMenu.change(function() {
            geo = $geoMenu.filter(':checked').val();
            console.log($(this).attr('id'));
            for (var i = 0; i < sublayers.length; i++) {
                if (i === layerID[geo]) {
                    sublayers[i].show();
                } else {
                    sublayers[i].hide();
                }
            }
            $('.geo-heading').text(geo);
        });

        $('.query-menu').change(function() {
            //geo = $geoMenu.filter(':checked').val();
            console.log(geo);
            //console.log($(this).attr('id'));
            //var $condMenu = $conditions.filter($('#' + geo + 'Select'));
            //var $condMenu = $('#townSelect');
            //console.log(geo);
            //console.log($(this).attr('id'));
            //console.log($('input[type=radio][name=geography]').filter(':checked').val());
            //console.log($condMenu.val());
            //console.log($('#' + geo + 'Select').val()); /////////////////////////////////////////// <- troubleshooting here

            /*var type = $typeMenu.filter(':checked').val();
            var agesArray = $condMenu.find(':selected').data('ages');
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

            condition = $condMenu.find(':selected').val();
            ageStr = age.length > 0 ? ', ' + age.replace('_', '').replace(/_(?=\d)/, '-').replace('_', ' ') : '';
            $('#age-head').text(ageStr);
            $('.indicator-heading').text($condMenu.find(':selected').text());
            $('.definition').addClass('hidden').filter($('#def' + condition)).removeClass('hidden');

            column = condition + age;

            updateQuery(geo, column);*/
        });

        $('.query-menu').eq(0).change();

    }

    function createMaps(json) {
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
                        opts.push(option.value + '_age_adjusted');
                    } else {
                        opts.push(option.value);
                    }
                });
            });
            opts = opts.concat(geoStrings[geo]);
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
                sublayers = _.map(layerID, function(i) {
                    return layer.getSubLayer(i);
                });
                $.each(sublayers, function(i, sublayer) {
                    sublayer.hide();
                    sublayer.setInteraction(true);
                    sublayer.setInteractivity(columnArr[i].join(', '));
                    sublayer.on('featureClick', function(event, latlng, pos, data) {
                            updateInfowindow(data);
                        });
                    cdb.vis.Vis.addInfowindow(mapObj, sublayer, columnArr[i]);
                });
            })
            .error(function(err) {
                console.log(err);
            });
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
            output: '{startRow} to {endRow} of {totalRows}'
        });
    }

    function updateQuery(geo, column) {

    }

    function updateTable(data, geo, column) {

    }

    function updateInfowindow(data) {

    }

    function buildLegend(breaks, colors) {

    }

})();
