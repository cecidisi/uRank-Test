window.RS = (function(){

    var _this;

    function randomFromTo(from, to){
        return Math.floor(Math.random() * (to - from + 1) + from);
    }

    function shuffle(o) {
        for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    }

    function RS() {

        _this = this;
        this.userItemMatrix = {};       //  boolean values
        this.itemTagMatrix = {};        //  counts repetitions
        this.userTagMatrix = {};        //  counts repetitions
        this.tagMaxMatrix = {};

        var kw_aux = [
            { query: 'women in workforce', keywords: ['participation&woman&workforce', 'gap&gender&wage', 'inequality&man&salary&wage&woman&workforce']},       // 9
            { query: 'robot', keywords: ['autonomous&robot', 'human&interaction&robot', 'control&information&robot&sensor']},                                   // 7
            { query: 'augmented reality', keywords: ['environment&virtual', 'context&object&recognition', 'augmented&environment&image&reality&video&world']},  // 10
            { query: 'circular economy', keywords: ['management&waste', 'china&industrial&symbiosis', 'circular&economy&fossil&fuel&system&waste']}];           // 10

        function getKeywords(query, questionNumber) {
            var index = _.findIndex(kw_aux, function(kw){ return kw.query == query });
            return kw_aux[index].keywords[questionNumber - 1].split('&');
        }

        evaluationResults.forEach(function(r, i){
            r['tasks-results'].forEach(function(t){
                t['questions-results'].forEach(function(q, j){
                    var keywords = getKeywords(t.query, q['question-number']);
                    var user = (r.user - 1) * 3 + q['question-number'];
                    //console.log('user #' + user + '  ---  r.user = ' + r.user + ', question number = ' + q["question-number"]);

                    q['selected-items'].forEach(function(d){

                        if(!_this.userItemMatrix[user])
                            _this.userItemMatrix[user] = {};

                        _this.userItemMatrix[user][d.id] = true;

                        if(!_this.itemTagMatrix[d.id])
                            _this.itemTagMatrix[d.id] = {};

                        if(!_this.userTagMatrix[user])
                            _this.userTagMatrix[user] = {};

                        var usedKeywords = shuffle(keywords).slice(0, randomFromTo(2,keywords.length));
                       // console.log(usedKeywords);
                        usedKeywords.forEach(function(k){
                            _this.itemTagMatrix[d.id][k] = (!_this.itemTagMatrix[d.id][k]) ? 1 : _this.itemTagMatrix[d.id][k] + 1;
                            _this.userTagMatrix[user][k] = (!_this.userTagMatrix[user][k]) ? 1 : _this.userTagMatrix[user][k] + 1;
                        });
                    });
                });
            });
        });

        //  Get max p(d, k)
        _.values(this.itemTagMatrix).forEach(function(docTags){
            _.keys(docTags).forEach(function(tag){
                if(!_this.tagMaxMatrix[tag] || docTags[tag] > _this.tagMaxMatrix[tag])
                    _this.tagMaxMatrix[tag] = docTags[tag];
            });
        });

        console.log('USER-ITEM MATRIX (' + _.size(_this.userItemMatrix) + ')');
        console.log(_this.userItemMatrix);
        console.log(JSON.stringify(_this.userItemMatrix));
//        console.log('ITEM-TAG MATRIX (' + _.size(_this.itemTagMatrix) + ')');
//        console.log(_this.itemTagMatrix);
//        console.log('USER-TAG MATRIX (' + _.size(_this.userTagMatrix) + ')');
//        console.log(_this.userTagMatrix);
//        console.log('TAG-MAX MATRIX (' + _.size(_this.tagMaxMatrix) + ')');
//        console.log(_this.tagMaxMatrix);

    }



    RS.prototype = {

        addBookmark: function(args) {
            var p = $.extend({ user: undefined, doc: undefined, keywords: undefined }, args);

            if(p.user == undefined || p.doc == undefined || p.keywords == undefined)
                return 'Error -- parameter missing';

            //  update user-item matrix
           if(!_this.userItemMatrix[p.user])
               _this.userItemMatrix[p.user] = {};

            _this.userItemMatrix[p.user][p.doc] = true;

            if(!_this.itemTagMatrix[p.doc])
                _this.itemTagMatrix[p.doc] = {};

            if(!_this.userTagMatrix[p.user])
                _this.userItemMatrix[p.user] = {};

            // update item-tag, user-tag and tagMax matrices
            p.keywords.forEach(function(k){
                _this.itemTagMatrix[p.doc][k.term] = (!_this.itemTagMatrix[p.doc][k.term]) ? 1 : _this.itemTagMatrix[p.doc][k.term] + 1;
                _this.userTagMatrix[p.user][k.term] = (!_this.userTagMatrix[p.user][k.term]) ? 1 : _this.userTagMatrix[p.user][k.term] + 1;

                if(!_this.tagMaxMatrix[k.term] || _this.itemTagMatrix[p.doc][k.term] > _this.tagMaxMatrix[k.term])
                    _this.tagMaxMatrix[k.term] = _this.itemTagMatrix[p.doc][k.term];
            });

            return 'success';
        },

        getRecommendationsForKeywords: function(args) {

            var p = $.extend({
                user: 'new',
                keywords: []
            }, args);

            var recs = [];
            _.keys(_this.itemTagMatrix).forEach(function(d){
                if(!_this.userItemMatrix[p.user] || !_this.userItemMatrix[p.user][d]){
                    var acum = 0, tags = {};
                    p.keywords.forEach(function(k){
                        if(_this.itemTagMatrix[d][k.term]) {
                            var pPrime = _this.itemTagMatrix[d][k.term] / _this.tagMaxMatrix[k.term];
                            var scalingFactor = 1 / (Math.pow(Math.E, (1 / _this.itemTagMatrix[d][k.term])));
                            var tagScore = (pPrime * k.weight * scalingFactor / p.keywords.length).round(3);
                            tags[k.term] = { tagged: _this.itemTagMatrix[d][k.term], score: tagScore };
                            acum += tagScore;
                        }
                    });

                    if(acum) {
                        recs.push({ doc_id: d, score: acum.round(3), tags: tags });
                    }

                }

            });
            recs = recs.sort(function(r1, r2){
                if(r1.score > r2.score) return -1;
                if(r1.score < r2.score) return 1;
                return 0;
            });

            return recs;
        }


    };

    return RS;
})();
