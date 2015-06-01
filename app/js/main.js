(function(){

    var _this = this;

    //  Prepare recommender data
    function addDataToRecommender() {

        var kw_aux = [
            { query: 'women in workforce', keywords: ['participation&woman&workforce', 'gap&gender&wage', 'inequality&man&salary&wage&woman&workforce']},       // 9
            { query: 'robot', keywords: ['autonomous&robot', 'human&interaction&robot', 'control&information&robot&sensor']},                                   // 7
            { query: 'augmented reality', keywords: ['environment&virtual', 'context&object&recognition', 'augmented&environment&image&reality&video&world']},  // 10
            { query: 'circular economy', keywords: ['management&waste', 'china&industrial&symbiosis', 'circular&economy&fossil&fuel&system&waste']}];           // 10

        function getKeywords(query, questionNumber) {
            var index = _.findIndex(kw_aux, function(kw){ return kw.query == query });
            return kw_aux[index].keywords[questionNumber - 1].split('&');
        }

        function randomFromTo(from, to){
            return Math.floor(Math.random() * (to - from + 1) + from);
        }

        function shuffle(o) {
            for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
            return o;
        }

        var recData = [];

        evaluationResults.forEach(function(r, i){
            r['tasks-results'].forEach(function(t){
                t['questions-results'].forEach(function(q, j){
                    var keywords = getKeywords(t.query, q['question-number']);
                    var user = (r.user - 1) * 3 + q['question-number'];

                    q['selected-items'].forEach(function(d){
                        var usedKeywords = shuffle(keywords).slice(0, randomFromTo(2,keywords.length));

                        recData.push({ user: user, doc: d.id, keywords: usedKeywords });
                    });
                });
            });
        });

        //  add all evaluation results to recommender
        recData.forEach(function(d){
            _this.RS.addBookmark(d);
        });
    }



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
        event.preventDefault();

        var scriptURL = '../server/download.php',
            date = new Date(),
            timestamp = date.getFullYear() + '-' + (parseInt(date.getMonth()) + 1) + '-' + date.getDate() + '_' + date.getHours() + '.' + date.getMinutes() + '.' + date.getSeconds(),
            urankState = _this.urank.getCurrentState(),
            fileOptions = {
                all: [
                    { filename: 'urank_selected_keywords_' + timestamp + '.txt', content: JSON.stringify(urankState.selectedKeywords) },
                    { filename: 'urank_ranking_' + timestamp + '.txt', content: JSON.stringify(urankState.ranking) },
                    { filename: 'urank_recommendations_' + timestamp + '.txt', content: JSON.stringify(_this.currentRecs) }
                ],
                ranking: [
                    { filename: 'urank_selected_keywords_' + timestamp + '.txt', content: JSON.stringify(urankState.selectedKeywords) }
                ],
                keywords: [
                    { filename: 'urank_ranking_' + timestamp + '.txt', content: JSON.stringify(urankState.ranking) }
                ],
                recs: [
                    { filename: 'urank_recommendations_' + timestamp + '.txt', content: JSON.stringify(_this.currentRecs) }
                ]
            };

        fileOptions[$('#select-download').val()].forEach(function(f){
            $.generateFile({ filename: f.filename, content: f.content, script: scriptURL });
        });
    };

    //  uRank callbacks
    var onUrankChange = function(rankingData, selectedKeywords) {
        console.log('Testing Recommender');
        _this.currentRecs = _this.RS.getRecommendationsForKeywords({ keywords: selectedKeywords });
        console.log(_this.currentRecs);
    };

    var onFaviconClicked = function(documentId){
    };


    //  uRank initialization options
    var urankOptions = {
        tagCloudRoot: '#tagcloud',
        tagBoxRoot: '#tagbox',
        contentListRoot: '#contentlist',
        visCanvasRoot: '#viscanvas',
        docViewerRoot: '#docviewer',
        onChange: onUrankChange
    };


    //  INITIALIZATION
    this.currentRecs = [];
    this.dsm = new datasetManager();
    this.urank = new Urank(urankOptions);
    this.RS = new RS();

    addDataToRecommender();


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

