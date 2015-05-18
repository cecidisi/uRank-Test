window.RS = (function(){

    var _this;


    function RS() {

        _this = this;
        this.bookmarks = [];
        this.userItemMatrix = {};
        this.itemTagMatrix = {};
        this.userTagMatrix = {};

        var kw_aux = [
            { query: 'women in workforce', keywords: ['participation&women&workforce', 'gap&gender&wage', 'inequality&man&salary&wage&woman&workforce']},
            { query: 'robot', keywords: ['autonomous&robot', 'human&interaction&robot', 'control&information&robot&sensor']},
            { query: 'augmented reality', keywords: ['environment&virtual', 'context&object&recognition', 'augmented&environment&image&reality&video&world']},
            { query: 'circular economy', keywords: ['management&waste', 'china&industrial&symbiosis', 'circular&economy&fossil&fuel&system&waste']}];

        evaluationResults().forEach(function(result){

            result["tasks-results"].forEach(function(task) {
                task["questions-results"].forEach(function(question) {
                    question["selected-items"].forEach(function(item) {

                         _this.bookmarks.push({
                            user_id: 'user_' + result.user,
                            doc_id: item.id,
                            doc_title: item.title,
                            keywords: getKeywords(task.query, question["question-number"])
                        });
                    });
                });

            });
        });
      //  console.log(this.bookmarks.length + ' bookarks retrievd');

        function getKeywords(query, questionNumber) {
            var index = _.findIndex(kw_aux, function(kw){ return kw.query == query });
            return kw_aux[index].keywords[questionNumber - 1].split('&');
        }


        evaluationResults().forEach(function(r){
            r['tasks-results'].forEach(function(t){
                t['questions-results'].forEach(function(q){
                    q['selected-items'].forEach(function(d){

                        if(!_this.userItemMatrix[r.user])
                            _this.userItemMatrix[r.user] = {};

                        _this.userItemMatrix[r.user][d.id] = true;

                        if(!_this.itemTagMatrix[d.title])
                            _this.itemTagMatrix[d.title] = {};

                        if(!_this.userTagMatrix[r.user])
                            _this.userTagMatrix[r.user] = {};

                        //  get used keywords
                        getKeywords(t.query, q['question-number']).forEach(function(k){
                            _this.itemTagMatrix[d.title][k] = (!_this.itemTagMatrix[d.title][k]) ? 1 : _this.itemTagMatrix[d.title][k] + 1;
                            _this.userTagMatrix[r.user][k] = (!_this.userTagMatrix[r.user][k]) ? 1 : _this.userTagMatrix[r.user][k] + 1;
                        });
                    });
                });
            });
        });


        console.log('ITEM-TAG MATRIX');
        console.log(_this.itemTagMatrix);
        console.log('USER-TAG MATRIX');
        console.log(_this.userTagMatrix);

    }



    RS.prototype = {

        addBookmark: function(args) {
            var b = $.extend({ user_id: undefined, doc_id: undefined, doc_title: undefined, keywords: undefined }, args);

            if(b.user_id == undefined || b.doc_id == undefined || b.doc_title == undefined || b.keywords == undefined)
                return 'Error -- parameter missing';

            this.bookmarks.push(b);
            return 'Success';
        },

        getDocumentsForKeywords: function(args) {

            var p = $.extend({
                user_id: 'new',
                keywords: []
            }, args);

            var bookmarkedByUser = {},
                bookmakedByOthers = {},
                recs = {}, recSet = {};

            var bookmarksDict = _.groupBy(this.bookmarks, function(b){ return b.doc_id });

            this.bookmarks.forEach(function(b){
                if(b.user_id == p.user_id)      //  delete docs bookmarked by current user
                    delete bookmarksDict[b.doc_id];
            });

            console.log(bookmarksDict);

            function getKeywordString(keywordArray) {
                return _.sortBy(keywordArray, function(term){ return term; }).join('+');
            }


            _.each(_.keys(bookmarksDict), function(doc){



            })





/*            _.each(_.keys(bookmarksDict), function(doc){
                recs[doc] = { total: 0, keywords: {} };

                _.each(bookmarksDict[doc], function(b){
                    var keywordsIn = [];
                    _.each(p.keywords, function(k){
                        if(_.contains(b.keywords, k))
                            keywordsIn.push(k);
                    });

                    if(keywordsIn.length > 0) {
                        recs[doc].total++;
                        var flagNew = false;
                        if(!recs[doc].keywords[keywordsIn.length]) {
                            recs[doc].keywords[keywordsIn.length] = [];
                            flagNew = true;
                        }

                        var i = flagNew ? -1 : _.findIndex(recs[doc].keywords[keywordsIn.length], function(kwSet){ return kwSet.terms == getKeywordString(keywordsIn) });
                        if(i == -1)
                            recs[doc].keywords[keywordsIn.length].push({ count: 1, terms:getKeywordString(keywordsIn) });
                        else
                            recs[doc].keywords[keywordsIn.length][i].count++;

                    }
                });
                if(recs[doc].total == 0)
                    delete recs[doc];
            })*/

            console.log(_.size(recs));



            return recs;
        }


    };

    return RS;
})();
