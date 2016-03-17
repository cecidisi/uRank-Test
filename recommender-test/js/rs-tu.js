
/*******************************************************************************
*
*   avg normaliaztion on tag and user scores, no normalization on final score
*
********************************************************************************/

if(!Math.roundTo)
    Math.roundTo = function(value, places) {
        return +(Math.round(value + "e+" + places)  + "e-" + places);
    }


    window.RS_TU = (function(){

        var _this;
        //  cosntructor
        function RS_TU() {
            _this = this;
            this.userItemMatrix = {};       //  boolean values
            this.itemTagMatrix = {};        //  counts repetitions
            this.userTagMatrix = {};        //  counts repetitions
            this.sumTagAcrossDocs = {};
            this.sumTagAcrossUsers = {};
        }


        RS_TU.prototype = {

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

                    // Sum values
                    if(!_this.sumTagAcrossDocs[k])
                        _this.sumTagAcrossDocs[k] = 0;
                    _this.sumTagAcrossDocs[k] += _this.itemTagMatrix[p.doc][k];

                    if(!_this.sumTagAcrossUsers[k])
                        _this.sumTagAcrossUsers[k] = 0;
                    _this.sumTagAcrossUsers[k] += _this.userTagMatrix[p.user][k];
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
                        k: 0
                    }
                }, args);

                var alpha = function(x) { return  parseFloat(1 - Math.pow(Math.E, (-1 * x))) };

                //  Get neighbors
                var neighbors = [];

                if(p.options.beta < 1) {
                    _.keys(_this.userTagMatrix).forEach(function(user){
                        if(user != p.user) {
                            var userScore = 0;
                            p.keywords.forEach(function(k){
                                if(_this.userTagMatrix[user][k.term]) {
                                    var normalizedFreq = _this.userTagMatrix[user][k.term] / _this.sumTagAcrossUsers[k.term];
                                    //var scalingFactor = 1 / (Math.pow(Math.E, (1 / _this.userTagMatrix[user][k.term])));
                                    userScore += (normalizedFreq * k.weight * alpha(_this.userTagMatrix[user][k.term]) / p.keywords.length);
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
                                    var normalizedFreq = _this.itemTagMatrix[doc][k.term] / _this.sumTagAcrossDocs[k.term];           // normalized item-tag frequency
                                    var tagScore = (normalizedFreq * k.weight * alpha(_this.itemTagMatrix[doc][k.term]) / p.keywords.length);
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


                        //                if((p.options.and && userBasedScore > 0 && tagBasedScore > 0) || finalScore > 0) {
                        if(userBasedScore > 0 || tagBasedScore > 0) {
                            recs.push({
                                doc: doc,
                                score: tagBasedScore * p.options.beta + userBasedScore * (1 - p.options.beta),
                                misc: {
                                    tagBasedScore: tagBasedScore,
                                    userBasedScore: userBasedScore,
                                    tags: tags,
                                    users: users
                                }
                            });
                        }

                    }
                });

                recs = recs.sort(function(r1, r2){
                    if(r1.score > r2.score) return -1;
                    if(r1.score < r2.score) return 1;
                    return 0;
                });

                var size = p.options.k == 0 ? recs.length : p.options.k;
                return recs.slice(0, size);
            },

            clear: function() {
                this.userItemMatrix = {};
                this.itemTagMatrix = {};
                this.userTagMatrix = {};
                this.sumTagAcrossDocs = {};
                this.sumTagAcrossUsers = {};
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
            },

            stats: function(){
                var uTags = 0;
                Object.keys(_this.userTagMatrix).forEach(function(u){
                    uTags += Object.keys(_this.userTagMatrix[u]).length;
                });

                var dTags = 0;
                Object.keys(_this.itemTagMatrix).forEach(function(d){
                    dTags += Object.keys(_this.itemTagMatrix[d]).length;
                });

                return {
                    users: Object.keys(_this.userItemMatrix).length,
                    docs: Object.keys(_this.itemTagMatrix).length,
                    uTags: uTags,
                    dTags: dTags
                }
            }

        };

        return RS_TU;
    })();
