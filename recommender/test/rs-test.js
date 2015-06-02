(function(){

    var rec = new RS();
    var results = [], stats = [];

    var $selectPctgTraining = $('#select-pctg-training'),
        $selectRuns = $('#select-runs'),
        $selectRecSize = $('#select-rec-size'),
        $lblTrainingSize = $('#lbl-training-size'),
        $lblTestSize = $('#lbl-test-size'),
        $btnRun = $('#btn-run'),
        $tableResults = $('table#results'),
        $tableStats = $('table#stats'),
        $statusMsg = $('#runing-status'),
        $spinner = $('#spinner'),
        $downloadResults = $('#download-results'),
        $downloadStats = $('#download-stats'),
        tbody = 'tbody';

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
                        data.push({ user: user, doc: d.id, keywords: usedKeywords });
                    });
                });
            });
        });

        //  Add training data to RS and compute precision/recall for test data
        var cutIndex = parseInt(data.length * pctg);
        var shuffledData = shuffle(data);
        var trainingData = shuffledData.slice(0, cutIndex);
        var testData = shuffledData.slice(cutIndex, shuffledData.length);

        return { training: trainingData, test: testData };
    }


    function getStdv(arr, mean) {
        var sum = 0;
        arr.forEach(function(a){
            sum += Math.pow((a - mean), 2);
        });
        return Math.sqrt(sum / arr.length);
    }


    var runTest = function() {
        results = [];
        stats = [];

        var recSizes = $selectRecSize.multipleSelect('getSelects').map(function(value){ return parseInt(value) }),
            runs = $selectRuns.val(),
            pctg = parseFloat($selectPctgTraining.val() / 100);

        $tableResults.find(tbody).empty();
        $tableStats.find(tbody).empty();
        $statusMsg.text('Runing Test...');
        $spinner.show();
        $downloadResults.hide();
        $downloadStats.hide();

        setTimeout(function(){

            recSizes.forEach(function(recSize){
                var recallMean = 0, hitsMean = 0, localStats = [];
                for(var run = 1; run<=runs; ++run) {
                   // console.log('Runing run #' + run + ' for recommendation size = ' + recSize);
                    //$statusMsg.text('Runing run #' + run + ' for recommendation size = ' + recSize);


                    var data = getTrainingAndTestData(pctg);
                    var trainingData = data.training;
                    var testData = data.test;

                    testData.forEach(function(d){
                        d.keywords = d.keywords.map(function(k){ return {term: k, weight: 1}; });
                    });

                    var rsOptions = { recSize: recSize, beta: 0.5 };
                    //  Test accuracy/precision/recall with tets data
                    var result = rec.testRecommender(trainingData, testData, rsOptions);
                    var rObj = { recSize: recSize, run: run, recall: result.recall, hits: result.hits  };

                    results.push(rObj);
                    localStats.push(rObj);

                    recallMean += result.recall;
                    hitsMean += result.hits;
                }

                recallMean = recallMean/runs;
                hitsMean = hitsMean/runs;
                stats.push({
                    recSize: recSize,
                    totalRuns: runs,
                    recallMean: Math.roundTo(recallMean, 3),
                    recallStdv: Math.roundTo(getStdv(localStats.map(function(l){ return l.recall }), recallMean), 3),
                    hitsMean: Math.roundTo(hitsMean, 3),
                    hitsStdv: Math.roundTo(getStdv(localStats.map(function(l){ return l.hits }), hitsMean), 3)
                });
            });

           // console.log('test finished');
            $statusMsg.text('Test finished!');
            $spinner.hide();
            $downloadResults.show();
            $downloadStats.show();

            fillTestTable(results, $tableResults);
//
//            results.forEach(function(r, i){
//                var $row = $('<tr/>').appendTo($tableResults.find(tbody));
//                $row.append('<td>' + r.recSize + '</td>');
//                $row.append('<td>' + r.run + '</td>');
//                $row.append('<td>' + r.recall + '</td>');
//                $row.append('<td>' + r.hits + '</td>');
//            });

            stats.forEach(function(s){
                var $row = $('<tr/>').appendTo($tableStats.find(tbody));
                $row.append('<td>' + s.recSize + '</td>');
                $row.append('<td>' + s.totalRuns + '</td>');
                $row.append('<td>' + s.recallMean + '(' + s.recallStdv + ')</td>');
                $row.append('<td>' + s.hitsMean + '(' + s.hitsStdv + ')</td>');
            });

        }, 10);
    };


    function fillTestTable(testResults, $table) {

        $table.find(tbody).empty();
        testResults.forEach(function(r){
            var $row = $('<tr/>').appendTo($table.find(tbody));
            $row.append('<td>' + r.recSize + '</td>');
            $row.append('<td>' + r.run + '</td>');
            $row.append('<td>' + r.recall + '</td>');
            $row.append('<td>' + r.hits + '</td>');
        });
    }


    var pctgTrainingSelectChanged = function() {
        var pctg = $selectPctgTraining.val() / 100;
        $lblTrainingSize.text(parseInt(dataSize * pctg));
        $lblTestSize.text(parseInt(dataSize * (1 - pctg)));
    };



    var downloadData = function(filename, content) {
        var scriptURL = '../../server/download.php',
            date = new Date(),
            timestamp = date.getFullYear() + '-' + (parseInt(date.getMonth()) + 1) + '-' + date.getDate() + '_' + date.getHours() + '.' + date.getMinutes() + '.' + date.getSeconds();

        $.generateFile({ filename: filename+'_'+timestamp+'.txt', content: content, script: scriptURL });
    };



    //  Bind event handlers
    $selectPctgTraining.on('change', pctgTrainingSelectChanged);
    $selectRecSize.multipleSelect();
    $btnRun.on('click', runTest);
    $downloadResults.click(function(){ downloadData('test_results', JSON.stringify(results)) });
    $downloadStats.click(function(){ downloadData('statistics', JSON.stringify(stats)) });

    $selectPctgTraining.trigger('change');
})();
