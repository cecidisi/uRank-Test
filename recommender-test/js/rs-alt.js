/*******************************************************************************
*
*   softmax normaliaztion on tag and user scores, no normalization on final score
*
********************************************************************************/

if(!Math.roundTo)
    Math.roundTo = function(value, places) {
        return +(Math.round(value + "e+" + places)  + "e-" + places);
    }


    if(!Math.log2)
        Math.log2 = function(value) {
            return (Math.log(value) / Math.log(2));
        }



        window.RS_ALT = (function(){

            var _this;
            //  cosntructor
            function RS_ALT() {
                _this = this;
                this.userItemMatrix = {};       //  boolean values
                this.itemTagMatrix = {};        //  counts repetitions
                this.userTagMatrix = {};        //  counts repetitions
                this.maxTagAcrossDocs = {};     //  highest frequency of each tag in a document. Depends on item-tag matrix
                this.maxTagAccrossUsers = {};   //  highest frequency of each tag for a user. Depends on user-tag matrix

                this.sumTagAcrossDocs = {};
                this.sumTagAcrossUsers = {};
            }


            RS_ALT.prototype = {

                addBookmark: function(args) {
                    var p = $.extend({ user: undefined, doc: undefined, keywords: undefined }, args);

                    if(!p.user || !p.doc || !p.keywords)
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
                                var userTagsExpSum = Object.keys(_this.userTagMatrix[user]).map(function(tag){
                                    return  parseFloat(Math.pow(Math.E, parseInt(_this.userTagMatrix[user][tag])))
                                }).reduce(function(val1, val2){ return (val1 + val2) });
                                
                                p.keywords.forEach(function(k){
                                    if(_this.userTagMatrix[user][k.term]) {
                                        var normalizedFreq = Math.pow(Math.E, _this.userTagMatrix[user][k.term]) / userTagsExpSum;
                                        //var scalingFactor = 1 / (Math.pow(Math.E, (1 / _this.userTagMatrix[user][k.term])));
                                        userScore += ((normalizedFreq * k.weight * alpha(_this.userTagMatrix[user][k.term])) / p.keywords.length);
                                    }
                                });
                                if(userScore)
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
                        //  Checks that current user is new or that s/he has not selected the doc yet
                        if(!_this.userItemMatrix[p.user] || !_this.userItemMatrix[p.user][doc]){

                            var tagBasedScore = 0,
                                userBasedScore = 0,
                                tags = {}, users = 0;
                            var itemTagsExpSum = Object.keys(_this.itemTagMatrix[doc]).map(function(tag){
                                return Math.pow(Math.E, _this.itemTagMatrix[doc][tag])
                            }).reduce(function(val1, val2){ return (val1  +  val2) });
   
                            //  Compute tag-based score
                            if(p.options.beta > 0) {
                                p.keywords.forEach(function(k){
                                    if(_this.itemTagMatrix[doc][k.term]) {
                                        var normalizedFreq = Math.pow(Math.E, _this.itemTagMatrix[doc][k.term]) / itemTagsExpSum;           // normalized item-tag frequency
                                        //                                var scalingFactor = 1 / (Math.pow(Math.E, (1 / _this.itemTagMatrix[doc][k.term])));   // raises final score of items bookmarked many times
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

                            //                    if((p.options.and && userBasedScore > 0 && tagBasedScore > 0) || finalScore > 0) {
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

                    var size = p.options.k ? p.options.k : recs.length;
                    return recs.slice(0, size);
                },

                clear: function() {
                    this.userItemMatrix = {};
                    this.itemTagMatrix = {};
                    this.userTagMatrix = {};
                    this.maxTagAcrossDocs = {};
                    this.maxTagAccrossUsers = {};
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

            return RS_ALT;
        })();
