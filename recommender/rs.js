
//if(!Number.prototype.round)
//    Number.prototype.round = function(places) {
//        return +(Math.round(this + "e+" + places)  + "e-" + places);
//    }

if(!Math.roundTo)
    Math.roundTo = function(value, places) {
        return +(Math.round(value + "e+" + places)  + "e-" + places);
    }


window.RS = (function(){

    var _this;
    //  cosntructor
    function RS() {
        _this = this;
        this.userItemMatrix = {};       //  boolean values
        this.itemTagMatrix = {};        //  counts repetitions
        this.userTagMatrix = {};        //  counts repetitions
        this.maxTagAcrossDocs = {};
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
                _this.userTagMatrix[p.user] = {};

            // update item-tag, user-tag and tagMax matrices
            p.keywords.forEach(function(k){
                _this.itemTagMatrix[p.doc][k] = (_this.itemTagMatrix[p.doc][k]) ? _this.itemTagMatrix[p.doc][k] + 1 : 1;
                _this.userTagMatrix[p.user][k] = (_this.userTagMatrix[p.user][k]) ? _this.userTagMatrix[p.user][k] + 1 : 1;

                if(!_this.maxTagAcrossDocs[k] || _this.itemTagMatrix[p.doc][k] > _this.maxTagAcrossDocs[k])
                    _this.maxTagAcrossDocs[k] = _this.itemTagMatrix[p.doc][k];
            });
            return 'success';
        },

        getRecommendationsForKeywords: function(args) {

            var p = $.extend({
                user: 'new',
                keywords: [],
                beta: 0.5
            }, args);

            var recs = [];
            _.keys(_this.itemTagMatrix).forEach(function(d){
                if(!_this.userItemMatrix[p.user] || !_this.userItemMatrix[p.user][d]){
                    var tagBasedScore = 0, tags = {};
                    p.keywords.forEach(function(k){
                        if(_this.itemTagMatrix[d][k.term]) {
                            var pPrime = _this.itemTagMatrix[d][k.term] / _this.maxTagAcrossDocs[k.term];           // normalized item-tag frequency
                            var scalingFactor = 1 / (Math.pow(Math.E, (1 / _this.itemTagMatrix[d][k.term])));   // raises final score of items bookmarked many times
                            var tagScore = (pPrime * k.weight * scalingFactor / p.keywords.length);
                            tags[k.term] = { tagged: _this.itemTagMatrix[d][k.term], score: tagScore };
                            tagBasedScore += tagScore;
                        }
                    });

                    if(tagBasedScore)
                        recs.push({ doc: d, score: Math.roundTo(tagBasedScore, 3), tags: tags });

                }

            });
            recs = recs.sort(function(r1, r2){
                if(r1.score > r2.score) return -1;
                if(r1.score < r2.score) return 1;
                return 0;
            });
            return recs;
        },

        clear: function() {
            this.userItemMatrix = {};
            this.itemTagMatrix = {};
            this.userTagMatrix = {};
            this.maxTagAcrossDocs = {};
        },

        testRecommender: function(trainingData, testData, recSize) {
            recSize = recSize || 5;

            this.clear();

            trainingData.forEach(function(d){
                _this.addBookmark(d);
            });

            //  Case/Prediction matrix
            var m = { tp: 0, fp: 0,         // <- all recommended items
                      fn: 0, tn: 0 };
            //         |-> all good items

            var hits = 0;

            testData.forEach(function(d){
                var recs = _this.getRecommendationsForKeywords(d).slice(0, recSize);
                if(_.findIndex(recs, function(r){ return r.doc == d.doc }) > -1)
                    hits++;
            });
            return { hits: hits, recall: Math.roundTo(hits/testData.length, 3) };
        },

        //  Miscelaneous

        getUserItemMatrix: function() {
            return this.userItemMatrix;
        },

        getUserTagMatrix: function() {
            return this.userTagMatrix;
        },

        getItemTagMatrix: function() {
            return this.itemTagMatrix;
        }

    };

    return RS;
})();
