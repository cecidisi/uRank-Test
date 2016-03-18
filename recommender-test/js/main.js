(function(){

    var rsTester = new RStester();
    var results = [], stats = [];
    var decPos = 3;

    var $selectNumberTests = $('#select-number-tests'),
        $ckbMP = $('#ckb-pop-alg'),
        $ckbCB = $('#ckb-cb-alg'),
        $ckbAlt = $('#ckb-alt-alg'),
        $ckbTUCB = $('#ckb-tucb-alg'),
        $selectPctgTraining = $('#select-pctg-training'),
        $selectIterations = $('#select-iterations'),
        $selectTopN = $('#select-top-n'),
        $lblTrainingSize = $('#lbl-training-size'),
        $lblTestSize = $('#lbl-test-size'),
        $btnRun = $('#btn-run'),
        $tableResults = $('table#results'),
        $statusMsg = $('#runing-status'),
        $downloadResultsJson = $('#download-results-json'),
        $downloadResultsCsv = $('#download-results-csv'),
        $downloadLinks = $('.download-link'),
        tbody = 'tbody',
        $testSections = $('.inner.test');
    var testSectionIdPrefix = '#test-';
    var stemmer = natural.PorterStemmer; //natural.LancasterStemmer;
        stemmer.attach();

    function shuffle(original) {
        var o = original.slice();
        for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    }


    function getInitData() {
        var _data = [];
        var kw_aux = [
            { query: 'women in workforce', keywords: ['participation,woman,workforce', 'gap,gender,wage', 'inequality,man,salary,wage,woman,workforce']},       // 9
            { query: 'robot', keywords: ['autonomous,robot', 'human,interaction,robot', 'control,information,robot,sensor']},                                   // 7
            { query: 'augmented reality', keywords: ['environment,virtual', 'context,object,recognition', 'augmented,environment,image,reality,video,world']},  // 10
            { query: 'circular economy', keywords: ['management,waste', 'china,industrial,symbiosis', 'circular,economy,fossil,fuel,system,waste']}];           // 10

        function getKeywords(query, questionNumber) {
            var index = _.findIndex(kw_aux, function(kw){ return kw.query == query });
            return kw_aux[index].keywords[questionNumber - 1].split(',');
        }

        function randomFromTo(from, to){
            return Math.floor(Math.random() * (to - from + 1) + from);
        }

        evaluationResults.forEach(function(r, i){
            r['tasks-results'].forEach(function(t){
                t['questions-results'].forEach(function(q, j){
                    var keywords = getKeywords(t.query, q['question-number']);
                    var user = (r.user - 1) * 3 + q['question-number'];

                    q['selected-items'].forEach(function(d){
                        var usedKeywords =  keywords.slice().map(function(k){ return { term: k, stem: k.stem(), weight: 1 } });//shuffle(keywords).slice();
//                        if(q["question-number"]>2)
//                            usedKeywords = usedKeywords.slice(0, randomFromTo(3,keywords.length));
                        _data.push({ user: user, doc: d.id, keywords: usedKeywords, topic: t.topic, task: (q['question-number'] < 3) ? 'focus' : 'broad', question: q["question-number"] });
                    });
                });
            });
        });

        return _data;
    }

    var data = getInitData().slice();
//    var data = window.bookmarks.slice();
//    console.log(JSON.stringify(data));
    var dataSize = data.length;

    function getTrainingAndTestData(pctg) {

        data = getInitData();
        //  Add training data to RS and compute precision/recall for test data
        var cutIndex = parseInt(data.length * pctg);
        var shuffledData = shuffle(data.slice());
        var trainingData = shuffledData.slice(0, cutIndex);
        var testData = shuffledData.slice(cutIndex, shuffledData.length);
        return { training: trainingData, test: testData };
    }


//    function getStdv(arr, mean) {
//        var sum = 0;
//        arr.forEach(function(a){
//            sum += Math.pow((a - mean), 2);
//        });
//        return Math.sqrt(sum / arr.length);
//    }
//
//
//    function processStats(metrics){
//
//        var stats = [];
//        var tests = _.groupBy(results, function(r){ return r.testNum });
//        var testNums = _.keys(tests);
//
//        testNums.forEach(function(testNum){//})
//
//            var aggregatedTest = _.groupBy(tests[testNum], function(t){ return t.k });
//            _.keys(aggregatedTest).forEach(function(k){
//
//                var ceroMeans = {};
//                metrics.forEach(function(metric){ ceroMeans[metric] = 0; });
//
//                var means = aggregatedTest[k].reduce(function(prev, cur, i, arr){
//                    var obj = {};
//                    metrics.forEach(function(metric){ obj[metric] = prev[metric] + (cur[metric]/arr.length) });
//                    return obj;
//                }, ceroMeans);
//
//                stats.push({
//                    testNum: testNum,
//                    algorithm: tests[testNum][0].algorithm,
//                    k: k,
//                    iterations: aggregatedTest[k].length
//                });
//
//                metrics.forEach(function(metric){
//                    stats[stats.length - 1][metric + 'Mean'] = Math.roundTo(means[metric], decPos);
//                    stats[stats.length - 1][metric + 'Stdv'] = Math.roundTo(getStdv(aggregatedTest[k].map(function(l){ return l[metric] }), means[metric]), decPos);
//                });
//            });
//        });
//
//        return stats;
//    }


    function fillTable($table, header, rows) {
        $table.find('thead').empty();
        header.forEach(function(h){
            $('<th>'+h+'</th>').appendTo($table.find('thead'))
        });

        $table.find(tbody).empty();
        rows.forEach(function(row){
            var $row = $('<tr/>').appendTo($table.find(tbody));
            row.forEach(function(value){
                $row.append('<td>' + value.toString().replace('beta', 'β') + '</td>');
            });
        });
    }



    function finishProcessing(metrics){

        results = results.sort(function(r1, r2){
            if(r1.testNum < r2.testNum) return -1;
            if(r1.testNum > r2.testNum) return 1;
            if(r1.k < r2.k) return -1;
            if(r1.k > r2.k) return 1;
            if(r1.iteration < r2.iteration) return -1;
            if(r1.iteration > r2.iteration) return 1;
            return 0;
        })

//        var keys = ['testNum', 'algorithm', 'k', 'iteration'];
//        keys = $.merge(keys, metrics);
        var keys = _.keys(results[0]);
        var rows = new Array(results.length);
        results.forEach(function(r, i){
            rows[i] = new Array();
            keys.forEach(function(key, j){
                rows[i].push(r[keys[j]]);
            });
        });
        fillTable($tableResults, keys, rows);

//        rows = new Array(stats.length);
//        keys = ['testNum', 'algorithm', 'k', 'iterations'];
//        stats = processStats(metrics);
//        stats.forEach(function(s, i){
//            rows[i] = new Array();
//            keys.forEach(function(key, j){
//                rows[i].push(s[keys[j]]);
//            });
//            metrics.forEach(function(metric){
//                rows[i].push(s[metric + 'Mean'] + '(' + s[metric + 'Stdv'] + ')');
//            });
//        });
//        fillTable($tableStats, rows);

        $statusMsg.removeClass('red').addClass('green').text('Test finished!');
        $downloadLinks.show();
    }


    function getCsv(arr) {
        var keys = _.keys(arr[0]),
            csv = keys.join(',') + '\n';

        arr.forEach(function(a){
            var values = [];
            keys.forEach(function(key){
                values.push(a[key]);
            });
            csv += values.join(',') + '\n';
        });
        return csv;
    }




    var runTest = function() {
        results = [];
        $tableResults.find(tbody).empty();
//        $tableStats.find(tbody).empty();
        $statusMsg.removeClass('green').addClass('red').text('Runing Test...');
        $downloadLinks.hide();

        var numberTUTests = $selectNumberTests.val(),
            topNarray = $selectTopN.multipleSelect('getSelects').map(function(value){ return parseInt(value) }),
            iterations = $selectIterations.val(),
            pctg = parseFloat($selectPctgTraining.val() / 100),
            betaValues = [0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1],    //  array of float
            conditions = [];    //  array { alg:string, beta:float }
        
        betaValues.forEach(function(beta){
            conditions.push({ alg: 'TU', beta: beta });
            if($ckbAlt.is(':checked')) {
                conditions.push({ alg: 'ALT_1', beta: beta });
                conditions.push({ alg: 'ALT_2', beta: beta });
            }
        })

        if($ckbMP.is(':checked'))
            conditions.push({ alg: 'MP', beta: -1 });
        if($ckbCB.is(':checked'))
            conditions.push({ alg: 'CB', beta: -1 });

        //var totalToProcess = conditions.length * topNarray.length * iterations,
        var totalToProcess = conditions.length * iterations,
            totalProcessed = 0;

        rsTester.clear();

        function process(data, iteration, condIndex) {

            var algorithm = conditions[condIndex].alg,
                beta = conditions[condIndex].beta,
                trainingData = data.training,
                testData = data.test,
                message = 'Runing... ' + Math.roundTo((++totalProcessed)*100/totalToProcess, 1) + '% done';

            $statusMsg.text(message);

            setTimeout(function(){

                var rsOptions = { beta: beta };
                var res = rsTester.testRecommender(algorithm, topNarray, trainingData.slice(), testData.slice(), rsOptions, iteration);
                var algStr = beta > -1 ? algorithm + '(beta=' + beta + ')' : algorithm;

                results = $.merge(results, res);

                condIndex++;
                if(condIndex == conditions.length) {
                    condIndex = 0;
                    iteration++;
                    data = getTrainingAndTestData(pctg);
                }

                if(iteration > iterations) {
                    //return finishProcessing(_.keys(result));
                    results = results.sort(function(r1, r2){
                        if(r1.iteration < r2.iteration) return -1;
                        if(r1.iteration > r2.iteration) return 1;
                        if(r1.rs < r2.rs) return -1;
                        if(r1.rs > r2.rs) return 1;
                        if(r1.beta < r2.beta) return -1;
                        if(r1.beta > r2.beta) return 1;
                        if(r1.k < r2.k) return -1;
                        if(r1.k > r2.k) return 1;

                        return 0;
                    });

                    console.log('results = ' +results.length);
                    //console.log(rsTester.getHitCount());
                    $statusMsg.removeClass('red').addClass('green').text('Test finished!');
                    $downloadLinks.show();
                    return;
                }

                return process(data, iteration, condIndex);
            }, 1);
        }


        process(getTrainingAndTestData(pctg), 1, 0);
    };    


    var selectNumberTestsChanged = function() {
        var maxVisible = parseInt($selectNumberTests.val());
        $testSections.each(function(i, testSection){
            if(i < maxVisible)
                $(testSection).slideDown();
            else
                $(testSection).slideUp();
        });

    };

    var pctgTrainingSelectChanged = function() {
        var pctg = $selectPctgTraining.val() / 100;
        $lblTrainingSize.text(parseInt(dataSize * pctg));
        $lblTestSize.text(parseInt(dataSize * (1 - pctg)));
    };



    var downloadData = function(filename, fileExtension, content) {
        var scriptURL = '../server/download.php',
            date = new Date(),
            timestamp = date.getFullYear() + '-' + (parseInt(date.getMonth()) + 1) + '-' + date.getDate() + '_' + date.getHours() + '.' + date.getMinutes() + '.' + date.getSeconds();
        $.generateFile({ filename: filename+'_'+timestamp+'.'+fileExtension, content: content, script: scriptURL });
    };

    var saveData = function(content, fileExtension) {

        $.post('../server/save.php', { data: content, ext: fileExtension} )
        .done(function(msg){ console.log(msg) })
        .fail(function(jqXHR){ console.log('Error saving data'); console.log(jqXHR) })
    };


    //  Bind event handlers

    $btnRun.on('click', runTest);
    $selectNumberTests.on('change', selectNumberTestsChanged).trigger('change');
    $testSections.find('.spinner-beta').spinner({ min: 0, max: 1, step: 0.1 });
    $selectTopN.multipleSelect();
    $selectPctgTraining.on('change', pctgTrainingSelectChanged).trigger('change');

    $('#download-bookmarks').click(function(){ downloadData('bookmarks', 'json', JSON.stringify(data)) });
    $('#download-recs').click(function(){ downloadData('recs', 'json', JSON.stringify(rsTester.getTop5Lists(data))) });
    $('#download-documents').click(function(evt){ evt.stopPropagation(); downloadData('documents', 'json', JSON.stringify(getDocumentsWithKeywords())); });
    $downloadResultsJson.click(function(){ saveData(JSON.stringify(results), 'json') });
    $downloadResultsCsv.click(function(){ saveData(getCsv(results), 'csv') });
    
    
    ///////////////////////////////////////////////////////////////////////

    var getDocumentsWithKeywords = function() {
        var keywordExtractor = new KeywordExtractor();
        var arr = $.merge([], dataset_AR);
        arr = $.merge(arr, dataset_CE);
        arr = $.merge(arr, dataset_WW);
        arr = $.merge(arr, dataset_Ro);
        
        arr.forEach(function(d,i){
            d.index = i;
            d.title = d.title.clean();
            d.description = d.description.clean();
            var doc = (d.description) ? d.title +'. '+ d.description : d.title;
            keywordExtractor.addDocument(doc);
        });

        keywordExtractor.processCollection();

        var documents = {};
        arr.forEach(function(d, i){
            d.keywords = keywordExtractor.listDocumentKeywords(i);
            documents[d.id] = d            
        });
        return documents;
    };
    

    ///////////////////////////////////////////////////////////////////////
})();
