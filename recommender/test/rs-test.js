(function(){

    var rsTU = new RS();
    var rsPOP = new RSpop();
    var results = [], stats = [];

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

        return { training: trainingData, test: testData };
    }


    function getStdv(arr, mean) {
        var sum = 0;
        arr.forEach(function(a){
            sum += Math.pow((a - mean), 2);
        });
        return Math.sqrt(sum / arr.length);
    }


    function fillTestTable(testResults, $table) {

        $table.find(tbody).empty();
        testResults.forEach(function(r){
            var $row = $('<tr/>').appendTo($table.find(tbody));
            $row.append('<td>' + r.testNum + '</td>');
            $row.append('<td>' + r.algorithm.replace('beta', 'β') + '</td>');
        //    $row.append('<td>' + r.beta + '</td>');
            $row.append('<td>' + r.recSize + '</td>');
            $row.append('<td>' + r.run + '</td>');
            $row.append('<td>' + r.recall + '</td>');
            $row.append('<td>' + r.hits + '</td>');
            $row.append('<td>' + r.timeLapse + '</td>');
        });
    }


    function processStats(){

        var tests = _.groupBy(results, function(r){ return r.testNum });
        var testNums = _.keys(tests);

        testNums.forEach(function(testNum){//})

            var aggregatedTest = _.groupBy(tests[testNum], function(t){ return t.recSize });
            _.keys(aggregatedTest).forEach(function(recSize){

                var recallMean = aggregatedTest[recSize].reduce(function(prev, cur, i, arr){ return prev + (cur.recall/arr.length) }, 0);
                var hitsMean = aggregatedTest[recSize].reduce(function(prev, cur, i, arr){ return prev + (cur.hits/arr.length) }, 0);
                var timeMean = aggregatedTest[recSize].reduce(function(prev, cur, i, arr){ return prev + (cur.timeLapse/arr.length) }, 0);

                stats.push({
                    testNum: testNum,
                    algorithm: tests[testNum][0].algorithm,
                   // beta: tests[testNum][0].beta,
                    recSize: recSize,
                    totalRuns: aggregatedTest[recSize].length,
                    recallMean: Math.roundTo(recallMean, 3),
                    recallStdv: Math.roundTo(getStdv(aggregatedTest[recSize].map(function(l){ return l.recall }), recallMean), 3),
                    hitsMean: Math.roundTo(hitsMean, 3),
                    hitsStdv: Math.roundTo(getStdv(aggregatedTest[recSize].map(function(l){ return l.hits }), hitsMean), 3),
                    timeLapseMean: Math.roundTo(timeMean, 3),
                    timeLapseStdv: Math.roundTo(getStdv(aggregatedTest[recSize].map(function(l){ return l.timeLapse }), timeMean), 3)
                });
            });
        });

        stats.forEach(function(s){
            var $row = $('<tr/>').appendTo($tableStats.find(tbody));
            $row.append('<td>' + s.testNum + '</td>');
            $row.append('<td>' + s.algorithm.replace('beta', 'β') + '</td>');
        //    $row.append('<td>' + s.beta + '</td>');
            $row.append('<td>' + s.recSize + '</td>');
            $row.append('<td>' + s.totalRuns + '</td>');
            $row.append('<td>' + s.recallMean + '(' + s.recallStdv + ')</td>');
            $row.append('<td>' + s.hitsMean + '(' + s.hitsStdv + ')</td>');
            $row.append('<td>' + s.timeLapseMean + '(' + s.timeLapseStdv + ')</td>');
        });

    }


    function finishProcessing(betaValues){

        results = _.sortBy(results, function(r){ return r.testNum });

        fillTestTable(results, $tableResults);
        processStats(betaValues);

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
        stats = [];

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

        var testFunc = {
            TU: function(trainingData, testData, rsOptions) {
                return rsTU.testRecommender(trainingData, testData, rsOptions);
            },
            POP: function(trainingData, testData, rsOptions) {
                return rsPOP.testRecommender(trainingData, testData, rsOptions);
            }
        };

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
                var result = testFunc[algorithm](trainingData.slice(), testData.slice(), rsOptions);
                var algStr = beta != '-' ? algorithm + '(beta=' + beta + ')' : algorithm;

                var rObj = {
                    testNum: condIndex + 1,
                    algorithm: algStr,
                    //beta: beta,
                    recSize: recSize,
                    run: run,
                    recall: result.recall,
                    hits: result.hits,
                    timeLapse: result.timeLapse
                };
                results.push(rObj);

                //  Update loop values before calling recursively
                condIndex++;
                if(condIndex == conditions.length) {
                    condIndex = 0;
                    run++
                    data = getTrainingAndTestData(pctg);
                }
                if(run > runs) {
                    run = 1;
                    condIndex = 0;
                    recSizeIndex++;
                }
                if(recSizeIndex == recSizes.length) {
                    return finishProcessing();
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
