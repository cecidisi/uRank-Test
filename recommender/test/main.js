(function(){

    var rsTester = new RStester();
    var results = [], stats = [];
    var decPos = 3;

    var $selectNumberTests = $('#select-number-tests'),
        $ckbPopAlg = $('#ckb-pop-alg'),
        $selectPctgTraining = $('#select-pctg-training'),
        $selectRuns = $('#select-runs'),
        $selectRecSize = $('#select-rec-size'),
        $lblTrainingSize = $('#lbl-training-size'),
        $lblTestSize = $('#lbl-test-size'),
        $btnRun = $('#btn-run'),
        $tableResults = $('table#results'),
        $tableStats = $('table#stats'),
        $statusMsg = $('#runing-status'),
        $downloadResultsJson = $('#download-results-json'),
        $downloadResultsCsv = $('#download-results-csv'),
        $downloadStatsJson = $('#download-stats-json'),
        $downloadStatsCsv = $('#download-stats-csv'),
        $downloadLinks = $('.download-link'),
        tbody = 'tbody',
        $testSections = $('.inner.test');

    var testSectionIdPrefix = '#test-';

    var dataSize = 0;
    evaluationResults.forEach(function(d){
        d["tasks-results"].forEach(function(t){
            t["questions-results"].forEach(function(q){
                dataSize += q["selected-items"].length;
            });
        });
    });


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
                        data.push({ user: user, doc: d.id, keywords: usedKeywords, topic: t.topic });
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


    function getStdv(arr, mean) {
        var sum = 0;
        arr.forEach(function(a){
            sum += Math.pow((a - mean), 2);
        });
        return Math.sqrt(sum / arr.length);
    }


    function processStats(metrics){

        var stats = [];
        var tests = _.groupBy(results, function(r){ return r.testNum });
        var testNums = _.keys(tests);

        testNums.forEach(function(testNum){//})

            var aggregatedTest = _.groupBy(tests[testNum], function(t){ return t.recSize });
            _.keys(aggregatedTest).forEach(function(recSize){

                var ceroMeans = {};
                metrics.forEach(function(metric){ ceroMeans[metric] = 0; });

                var means = aggregatedTest[recSize].reduce(function(prev, cur, i, arr){
                    var obj = {};
                    metrics.forEach(function(metric){ obj[metric] = prev[metric] + (cur[metric]/arr.length) });
                    return obj;
                }, ceroMeans);

                stats.push({
                    testNum: testNum,
                    algorithm: tests[testNum][0].algorithm,
                    recSize: recSize,
                    totalRuns: aggregatedTest[recSize].length
                });

                metrics.forEach(function(metric){
                    stats[stats.length - 1][metric + 'Mean'] = Math.roundTo(means[metric], decPos);
                    stats[stats.length - 1][metric + 'Stdv'] = Math.roundTo(getStdv(aggregatedTest[recSize].map(function(l){ return l[metric] }), means[metric]), decPos);
                });
            });
        });

        return stats;
    }


    function fillTable($table, rows) {
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
            if(r1.recSize < r2.recSize) return -1;
            if(r1.recSize > r2.recSize) return 1;
            if(r1.run < r2.run) return -1;
            if(r1.run > r2.run) return 1;
            return 0;
        })

        var keys = ['testNum', 'algorithm', 'recSize', 'run'];
        keys = $.merge(keys, metrics);
        var rows = new Array(results.length);
        results.forEach(function(r, i){
            rows[i] = new Array();
            keys.forEach(function(key, j){
                rows[i].push(r[keys[j]]);
            });
        });
        fillTable($tableResults, rows);

        rows = new Array(stats.length);
        keys = ['testNum', 'algorithm', 'recSize', 'totalRuns'];
        stats = processStats(metrics);
        stats.forEach(function(s, i){
            rows[i] = new Array();
            keys.forEach(function(key, j){
                rows[i].push(s[keys[j]]);
            });
            metrics.forEach(function(metric){
                rows[i].push(s[metric + 'Mean'] + '(' + s[metric + 'Stdv'] + ')');
            });
        });
        fillTable($tableStats, rows);

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
        $tableStats.find(tbody).empty();
        $statusMsg.removeClass('green').addClass('red').text('Runing Test...');
        $downloadLinks.hide();

        var numberTUTests = $selectNumberTests.val(),
            recSizes = $selectRecSize.multipleSelect('getSelects').map(function(value){ return parseInt(value) }),
            runs = $selectRuns.val(),
            pctg = parseFloat($selectPctgTraining.val() / 100),
            betaValues = [],
            conditions = [];

        //  Set conditions por TU tets and add POP test if checkbox is checked
        for(var i=1; i<=numberTUTests; i++ ) {
            betaValues.push(parseFloat($(testSectionIdPrefix+''+i).find('.spinner-beta').val()));
            conditions.push({ alg: 'TU', beta: parseFloat($(testSectionIdPrefix+''+i).find('.spinner-beta').val()) });
        }

        if($ckbPopAlg.is(':checked'))
            conditions.push({ alg: 'POP', beta: '-' });

        var totalToProcess = conditions.length * recSizes.length * runs,
            totalProcessed = 0;

        function process(data, condIndex, recSizeIndex, run) {

            var algorithm = conditions[condIndex].alg,
                beta = conditions[condIndex].beta,
                recSize = recSizes[recSizeIndex],
                trainingData = data.training,
                testData = data.test,
                message = 'Runing... ' + Math.roundTo((++totalProcessed)*100/totalToProcess, 1) + '% processed';

            $statusMsg.text(message);

            setTimeout(function(){

                var rsOptions = { recSize: recSize, beta: beta };
                var result = rsTester.testRecommender(algorithm, trainingData.slice(), testData.slice(), rsOptions);
                //var result = testFunc[algorithm](trainingData.slice(), testData.slice(), rsOptions);
                var algStr = beta != '-' ? algorithm + '(beta=' + beta + ')' : algorithm;

                results.push($.extend({
                    testNum: condIndex + 1,
                    algorithm: algStr,
                    recSize: recSize,
                    run: run
                }, result));

                condIndex++;
                if(condIndex == conditions.length) {
                    condIndex = 0;
                    recSizeIndex++;
                    data = getTrainingAndTestData(pctg);
                }
                if(recSizeIndex == recSizes.length) {
                    condIndex = 0;
                    recSizeIndex = 0;
                    run++
                }
                if(run > runs) {
                    return finishProcessing(_.keys(result));
                }

                return process(data, condIndex, recSizeIndex, run);
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
    $selectRecSize.multipleSelect();
    $selectPctgTraining.on('change', pctgTrainingSelectChanged).trigger('change');

    $downloadResultsJson.click(function(){ downloadData('test_results', 'json', JSON.stringify(results)) });
    $downloadResultsCsv.click(function(){ downloadData('test-results', 'csv', getCsv(results)) });
    $downloadStatsJson.click(function(){ downloadData('statistics', 'json', JSON.stringify(stats)) });
    $downloadStatsCsv.click(function(){ downloadData('statistics', 'csv', getCsv(stats)) });
})();
