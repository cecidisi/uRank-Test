(function(){

    var _this = this;
    this.dsm = new datasetManager();
    this.currentRanking = {};


    // Event handler for dataset-select change
    var selectDatasetChanged = function(){
        $('.processing-message').show();
        var datasetId = $("#select-dataset").val();
        _this.urank.clear();
        setTimeout(function(){
            _this.dsm.getDataset(datasetId, function(dataset){
                _this.urank.loadData(dataset);
                $('.processing-message').hide();
            });
        }, 10);
    };

    //  Event handler for "Download ranking" button
    var btnDownloadClicked = function(event) {

        var scriptURL = '../server/download.php',
            date = new Date(),
            timestamp = date.getFullYear() + '-' + (parseInt(date.getMonth()) + 1) + '-' + date.getDate() + '_' + date.getHours() + '.' + date.getMinutes() + '.' + date.getSeconds(),
            urankState = _this.urank.getCurrentState(),
            gf = $('#select-download').val() == '2files' ?
                [{ filename: 'urank_selected_keywords_' + timestamp + '.txt', content: JSON.stringify(urankState.selectedKeywords) },
                    { filename: 'urank_ranking_' + timestamp + '.txt', content: JSON.stringify(urankState.ranking) }] :
                [{ filename: 'urank_state_' + timestamp + '.txt', content: JSON.stringify(urankState) }];

        gf.forEach(function(f){
            $.generateFile({ filename: f.filename, content: f.content, script: scriptURL });
        });

        event.preventDefault();
    };


    //  uRank initialization options
    var urankOptions = {
        tagCloudRoot: '#tagcloud',
        tagBoxRoot: '#tagbox',
        contentListRoot: '#contentlist',
        visCanvasRoot: '#viscanvas',
        docViewerRoot: '#docviewer'
    };

    this.RS = new RS();

    console.log(this.RS.getDocumentsForKeywords({user_id: 'new', keywords: ['human', 'robot', 'interaction']}));


    // uRank initialization function to be passed as callback
    this.urank = new Urank(urankOptions);

    // Fill dataset select options and bind event handler
    var datasetOptions = "";
    this.dsm.getIDsAndDescriptions().forEach(function(ds){
        datasetOptions += "<option value='" + ds.id + "'>" + ds.description + "</option>";
    });

    // Add dataset options and bind event handlers for dataset select
    $("#select-dataset").html(datasetOptions).change(selectDatasetChanged);

    // Bind event handlers for "download ranking" button
    $('#btn-download').click(btnDownloadClicked);

    // Bind event handlers for urank specific buttons
    $('#btn-reset').off().on('click', this.urank.reset);
    $('#btn-sort-by-overall-score').off().on('click', this.urank.rankByOverallScore);
    $('#btn-sort-by-max-score').off().on('click', this.urank.rankByMaximumScore);

    // Trigger change evt to load first dataset in select options
    $('#select-dataset').trigger('change');


})();

