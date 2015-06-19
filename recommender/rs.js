
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
        this.maxTagAcrossDocs = {};     //  highest frequency of each tag in a document. Depends on item-tag matrix
        this.maxTagAccrossUsers = {};   //  highest frequency of each tag for a user. Depends on user-tag matrix
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

            //  item-tag matrix
            if(!_this.itemTagMatrix[p.doc])
                _this.itemTagMatrix[p.doc] = {};

            //  user-tag-matrix
            if(!_this.userTagMatrix[p.user])
                _this.userTagMatrix[p.user] = {};

            // update item-tag, user-tag and tagMax matrices
            p.keywords.forEach(function(k){
                _this.itemTagMatrix[p.doc][k] = (_this.itemTagMatrix[p.doc][k]) ? _this.itemTagMatrix[p.doc][k] + 1 : 1;
                _this.userTagMatrix[p.user][k] = (_this.userTagMatrix[p.user][k]) ? _this.userTagMatrix[p.user][k] + 1 : 1;

                if(!_this.maxTagAcrossDocs[k] || _this.itemTagMatrix[p.doc][k] > _this.maxTagAcrossDocs[k])
                    _this.maxTagAcrossDocs[k] = _this.itemTagMatrix[p.doc][k];

                if(!_this.maxTagAccrossUsers[k] || _this.userTagMatrix[p.user][k] > _this.maxTagAccrossUsers[k])
                    _this.maxTagAccrossUsers[k] = _this.userTagMatrix[p.user][k];
            });
            return 'success';
        },

        getRecommendations: function(args) {

            var p = $.extend(true, {
                user: 'new',
                keywords: [],
                options: {
                    beta: 0.5,
                    neighborhoodSize: 20,
                    and: false,
                    recSize: 0
                }
            }, args);

            //  Get neighbors
            var neighbors = [];

            if(p.options.beta < 1) {
                _.keys(_this.userTagMatrix).forEach(function(user){
                    if(user != p.user) {
                        var userScore = 0;
                        p.keywords.forEach(function(k){
                            if(_this.userTagMatrix[user][k.term]) {
                                var normalizedFreq = _this.userTagMatrix[user][k.term] / _this.maxTagAccrossUsers[k.term];
                                var scalingFactor = 1 / (Math.pow(Math.E, (1 / _this.userTagMatrix[user][k.term])));
                                userScore += (normalizedFreq * k.weight * scalingFactor / p.keywords.length);
                            }
                        });
                        if(userScore > 0)
                            neighbors.push({ user: user, score: Math.roundTo(userScore, 3) });
                    }
                });

                neighbors = neighbors.sort(function(u1, u2){
                    if(u1.score > u2.score) return -1;
                    if(u1.score < u2.score) return 1;
                    return 0;
                }).slice(0, p.options.neighborhoodSize);
            }

            var recs = [];
            //   Keys are doc ids
            _.keys(_this.itemTagMatrix).forEach(function(doc){
                //  Checks that current user has not selected the doc yet
                if(!_this.userItemMatrix[p.user] || !_this.userItemMatrix[p.user][doc]){

                    var tagBasedScore = 0,
                        userBasedScore = 0,
                        tags = {}, users = 0;

                    //  Compute tag-based score
                    if(p.options.beta > 0) {
                        p.keywords.forEach(function(k){
                            if(_this.itemTagMatrix[doc][k.term]) {
                                var normalizedFreq = _this.itemTagMatrix[doc][k.term] / _this.maxTagAcrossDocs[k.term];           // normalized item-tag frequency
                                var scalingFactor = 1 / (Math.pow(Math.E, (1 / _this.itemTagMatrix[doc][k.term])));   // raises final score of items bookmarked many times
                                var tagScore = (normalizedFreq * k.weight * scalingFactor / p.keywords.length);
                                tags[k.term] = { tagged: _this.itemTagMatrix[doc][k.term], score: tagScore };
                                tagBasedScore += tagScore;
                            }
                        });
                    }

                    //  compute user-based score => neighbor similarity * 1 | 0
                    if(p.options.beta < 1) {
                        neighbors.forEach(function(n){
                            if(_this.userItemMatrix[n.user] && _this.userItemMatrix[n.user][doc]) {
                                var userScore = (n.score / neighbors.length);
                                userBasedScore += userScore;
                                users++;
                            }
                        });
                    }

                    var finalScore = tagBasedScore * p.options.beta + userBasedScore * (1 - p.options.beta);
                    if((p.options.and && userBasedScore > 0 && tagBasedScore > 0) || finalScore > 0)
                        recs.push({
                            doc: doc,
                            score: Math.roundTo(finalScore, 3),
                            misc: {
                                tagBasedScore: tagBasedScore,
                                userBasedScore: userBasedScore,
                                tags: tags,
                                users: users
                            }
                        });
                }
            });

            recs = recs.sort(function(r1, r2){
                if(r1.score > r2.score) return -1;
                if(r1.score < r2.score) return 1;
                return 0;
            });

            var size = p.options.recSize == 0 ? recs.length : p.options.recSize;
            return recs.slice(0, size);
        },

        clear: function() {
            this.userItemMatrix = {};
            this.itemTagMatrix = {};
            this.userTagMatrix = {};
            this.maxTagAcrossDocs = {};
            this.maxTagAccrossUsers = {};
        },

        testRecommender: function(trainingData, testData, options) {
            var o = $.extend({
                recSize: 0,
                beta: 0.5,
                and: false,
            }, options);

            this.clear();

            trainingData.forEach(function(d){
                _this.addBookmark(d);
            });

            var hits = 0,       // == true positives
                timeLapse = $.now();

            testData.forEach(function(d){
                var args = {
                    user: d.user,
                    keywords: d.keywords,
                    options: o
                };

                var recs = _this.getRecommendations(args);
                hits = (_.findIndex(recs, function(r){ return r.doc == d.doc }) > -1) ? hits + 1 : hits;
            });

            var result = {
                hits: hits,
                recall: Math.roundTo(hits/testData.length, 3),
                precision: Math.roundTo(hits/(testData.length * o.recSize), 3),
                timeLapse: $.now() -  timeLapse
            };
            console.log(result);

            return result;
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
