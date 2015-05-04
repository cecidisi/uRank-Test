(function(){

    var _this = this;
    this.dsm = new datasetManager();

    // Fill dataset select options and bind event handler
    var datasetOptions = "";
    this.dsm.getIDsAndDescriptions().forEach(function(ds){
        datasetOptions += "<option value='" + ds.id + "'>" + ds.description + "</option>";
    });
    $("#select-dataset").html(datasetOptions);


    // Event handler for dataset-select change
    var selectDatasetChanged = function(){

        $('.processing-message').css('visibility', 'visible');
        var datasetId = $("#select-dataset").val();
        _this.urank.clear();
        setTimeout(function(){
            _this.dsm.getDataset(datasetId, function(dataset){
                _this.urank.loadData(dataset);
                $('.processing-message').css('visibility', 'hidden');
            });
        }, 10);
    };

    //  uRank initialization options
    var urankOptions = {
        tagCloudRoot: '#tagcloud',
        tagBoxRoot: '#tagbox',
        contentListRoot: '#contentlist',
        visCanvasRoot: '#viscanvas',
        docViewerRoot: '#docviewer'
        //,style: 'custom'
    };

    // uRank initialization function to be passed as callback
    var init = function(urank){

        _this.urank = urank;
        // Bind event handlers for dataset select
        $("#select-dataset").change(selectDatasetChanged);
        // Bind event handlers for urank specific buttons
        $('#btn-reset').off().on('click', urank.reset);
        $('#btn-sort-by-overall-score').off().on('click', urank.rankByOverallScore);
        $('#btn-sort-by-max-score').off().on('click', urank.rankByMaximumScore);

        $('#select-dataset').trigger('change');
    };

    //  Calling Urank
    UrankLoader(init, urankOptions);

})();

