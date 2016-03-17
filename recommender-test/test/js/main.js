(function(){

    var rsTester = new RStester();
    var results = [], stats = [];
    var decPos = 3;

    var $selectNumberTests = $('#select-number-tests'),
        $ckbPopAlg = $('#ckb-pop-alg'),
        $ckbCbAlg = $('#ckb-cb-alg'),
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

    var documents = [];
    var dataSize = 0;
    evaluationResults.forEach(function(d){
        d["tasks-results"].forEach(function(t){
            t["questions-results"].forEach(function(q){
                dataSize += q["selected-items"].length;
            });
        });
    });


    function loadDocumentsAndExtractKeywords(cb) {

        var dsm = new DatasetManager();
        var keywordExtractor = new KeywordExtractor();
        var ds = dsm.getIDsAndDescriptions();
        var done = 0;

        for(var i=0; i<ds.length;++i) {
            dsm.getDataset(ds[i].id, function(data){
                documents = $.merge(documents, data);
                if(++done === ds.length) {

                    cb();
                }
            });
        }
    }


    function getTrainingAndTestData(pctg) {

        var kwcount = 0;
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

        var data = [];

        evaluationResults.forEach(function(r, i){
            r['tasks-results'].forEach(function(t){
                t['questions-results'].forEach(function(q, j){
                    var keywords = getKeywords(t.query, q['question-number']);
                    var user = (r.user - 1) * 3 + q['question-number'];

                    q['selected-items'].forEach(function(d){
                        var usedKeywords = shuffle(keywords).slice(0, randomFromTo(2,keywords.length));
                        data.push({ user: user, doc: d.id, keywords: usedKeywords, topic: t.topic, task: (q['question-number'] < 3) ? 'focus' : 'broad' });
                        kwcount += usedKeywords.length;
                    });
                });
            });
        });

        //  Add training data to RS and compute precision/recall for test data
        var cutIndex = parseInt(data.length * pctg);
        var shuffledData = shuffle(data);
        var trainingData = shuffledData.slice(0, cutIndex);
        var testData = shuffledData.slice(cutIndex, shuffledData.length);
        testData.forEach(function(d){
            d.keywords = d.keywords.map(function(k){ return { term: k, weight: 1 }; });
        });

        console.log(kwcount);
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
            betaValues = [],    //  array of float
            conditions = [];    //  array { alg:string, beta:float }

        //  Set conditions por TU tets and add POP test if checkbox is checked
        for(var i=1; i<=numberTUTests; i++ ) {
            betaValues.push(parseFloat($(testSectionIdPrefix+''+i).find('.spinner-beta').val()));
            conditions.push({ alg: 'TU', beta: parseFloat($(testSectionIdPrefix+''+i).find('.spinner-beta').val()) });
            conditions.push({ alg: 'TU_ALT', beta: parseFloat($(testSectionIdPrefix+''+i).find('.spinner-beta').val()) });
        }

        if($ckbPopAlg.is(':checked'))
            conditions.push({ alg: 'POP', beta: 0 });
//        if($ckbCbAlg.is(':checked'))
//            conditions.push({ alg: 'CB', beta: 0 })

        var totalToProcess = conditions.length * topNarray.length * iterations,
            totalProcessed = 0;

        function process(data, condIndex, kIndex, iteration) {

            var algorithm = conditions[condIndex].alg,
                beta = conditions[condIndex].beta,
                k = topNarray[kIndex],
                trainingData = data.training,
                testData = data.test,
                message = 'Runing... ' + Math.roundTo((++totalProcessed)*100/totalToProcess, 1) + '% processed';

            $statusMsg.text(message);

            setTimeout(function(){

                var rsOptions = { k: k, beta: beta };
                var result = rsTester.testRecommender(algorithm, trainingData.slice(), testData.slice(), rsOptions, iteration);
                var algStr = beta ? algorithm + '(beta=' + beta + ')' : algorithm;

                results = $.merge(results, result);
//                results.push($.extend({
//                    testNum: condIndex + 1,
//                    algorithm: algStr,
//                    k: k,
//                    iteration: iteration
//                }, result));

                condIndex++;
                if(condIndex == conditions.length) {
                    condIndex = 0;
                    kIndex++;
                    data = getTrainingAndTestData(pctg);
                }
                if(kIndex == topNarray.length) {
                    condIndex = 0;
                    kIndex = 0;
                    iteration++
                }
                if(iteration > iterations) {
                    //return finishProcessing(_.keys(result));
                    results = results.sort(function(r1, r2){
                        if(r1.testNum < r2.testNum) return -1;
                        if(r1.testNum > r2.testNum) return 1;
                        if(r1.k < r2.k) return -1;
                        if(r1.k > r2.k) return 1;
                        if(r1.iteration < r2.iteration) return -1;
                        if(r1.iteration > r2.iteration) return 1;
                        return 0;
                    });

                    $statusMsg.removeClass('red').addClass('green').text('Test finished!');
                    $downloadLinks.show();
                    return;
                }

                return process(data, condIndex, kIndex, iteration);
            }, 1);
        }


        process(getTrainingAndTestData(pctg), 0, 0, 1);
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
        var scriptURL = '../../server/download.php',
            date = new Date(),
            timestamp = date.getFullYear() + '-' + (parseInt(date.getMonth()) + 1) + '-' + date.getDate() + '_' + date.getHours() + '.' + date.getMinutes() + '.' + date.getSeconds();

        $.generateFile({ filename: filename+'_'+timestamp+'.'+fileExtension, content: content, script: scriptURL });
    };



    //  Bind event handlers

    $btnRun.on('click', runTest);
    $selectNumberTests.on('change', selectNumberTestsChanged).trigger('change');
    $testSections.find('.spinner-beta').spinner({ min: 0, max: 1, step: 0.05 });
    $selectTopN.multipleSelect();
    $selectPctgTraining.on('change', pctgTrainingSelectChanged).trigger('change');

    $downloadResultsJson.click(function(){ downloadData('test_results', 'json', JSON.stringify(results)) });
    $downloadResultsCsv.click(function(){ downloadData('test-results', 'csv', getCsv(results)) });

})();