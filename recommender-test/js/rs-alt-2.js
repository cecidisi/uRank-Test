/******************************************************************************************
*
*   softmax normaliaztion on tag and user scores, softmax normalization on final score
*   computes pseude tag and user scores based on 5 most similar documents when actual score doesnt exist
*
*******************************************************************************************/

window.RS_ALT_2 = (function(){

    var _this;
    //  cosntructor
    function RS_ALT_2() {
        _this = this;
        this.userItemMatrix = {};       //  boolean values
        this.itemTagMatrix = {};        //  counts repetitions
        this.userTagMatrix = {};        //  counts repetitions
        this.docSimilarityMatrix = {};
        this.data = window.documents;
        this.docIDs = Object.keys(this.data);

       for(var i=0; i<_this.docIDs.length-1; ++i){
           for(var j=i+1; j<_this.docIDs.length; ++j) {
               var id1 = _this.docIDs[i], id2 = _this.docIDs[j],
                   d1 = _this.data[id1], d2 = _this.data[id2],
                   d1Norm = getEuclidenNorm(d1.keywords), d2Norm = getEuclidenNorm(d2.keywords),
                   unionTerms = _.union(Object.keys(d1.keywords), Object.keys(d2.keywords)),
                   docSimilarity = 0;

               unionTerms.forEach(function(term) {
                   var tfidf1 = d1.keywords[term] || 0.0,
                       tfidf2 = d2.keywords[term] || 0.0
                   docSimilarity += parseFloat((tfidf1 * tfidf2) / (d1Norm * d2Norm ));
               });
                docSimilarity = parseFloat(docSimilarity/unionTerms.length)
               if(docSimilarity) {
                   if(!_this.docSimilarityMatrix[id1]) _this.docSimilarityMatrix[id1] = [];
                   if(!_this.docSimilarityMatrix[id2]) _this.docSimilarityMatrix[id2] = [];
                   _this.docSimilarityMatrix[id1].push({ id: id2, similarity: docSimilarity })
                   _this.docSimilarityMatrix[id2].push({ id: id1, similarity: docSimilarity })
               }
           }
       }

        _this.docIDs.forEach(function(doc){
            _this.docSimilarityMatrix[doc] = _this.docSimilarityMatrix[doc].sort(function(d1, d2){
                if(d1.similarity > d2.similarity) return -1;
                if(d1.similarity < d2.similarity) return 1;
                return 0;
            })
       });
    }


    RS_ALT_2.prototype = {

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
                _this.itemTagMatrix[p.doc][k.stem] = (_this.itemTagMatrix[p.doc][k.stem]) ? _this.itemTagMatrix[p.doc][k.stem] + 1 : 1;
                _this.userTagMatrix[p.user][k.stem] = (_this.userTagMatrix[p.user][k.stem]) ? _this.userTagMatrix[p.user][k.stem] + 1 : 1;
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
                    simDocuments: 5,
                    and: false,
                    k: 0
                }
            }, args);

            var growthFun = function(x) { return  parseFloat(1 - Math.pow(Math.E, (-1 * x))) };
            var expSumTags = 0, expSumUsers = 0;

            //  Get Neighbors
            var neighbors = [];
            Object.keys(_this.userTagMatrix).forEach(function(user){
                if(user != p.user) {
                    var userSim = 0;
                    var userTagsExpSum = Object.keys(_this.userTagMatrix[user]).map(function(tag){
                        return  parseFloat(Math.pow(Math.E, _this.userTagMatrix[user][tag]));
                    }).reduce(function(val1, val2){ return (val1 + val2) });

                    p.keywords.forEach(function(k){
                        if(_this.userTagMatrix[user][k.stem]) {
                            var normalizedFreq = parseFloat(Math.pow(Math.E, _this.userTagMatrix[user][k.stem]) / userTagsExpSum);
                            userSim += parseFloat((normalizedFreq * k.weight * growthFun(_this.userTagMatrix[user][k.stem])) / p.keywords.length);
                        }
                    });
                    if(userSim)
                        neighbors.push({ user: user, score: userSim });
                }
            });

            neighbors = neighbors.sort(function(u1, u2){
                if(u1.score > u2.score) return -1;
                if(u1.score < u2.score) return 1;
                return 0;
            }).slice(0, p.options.neighborhoodSize);


            var recs = [];
            //   Keys are doc ids
            Object.keys(_this.itemTagMatrix).forEach(function(doc){
                //  Checks that current user is new or that s/he has not selected the doc yet
                if(!_this.userItemMatrix[p.user] || !_this.userItemMatrix[p.user][doc]){

                    var tagScore = 0.0, userScore = 0.0,
                        tags = {}, users = 0;
                    var itemTagsExpSum = Object.keys(_this.itemTagMatrix[doc]).map(function(tag){
                        return Math.pow(Math.E, _this.itemTagMatrix[doc][tag])
                    }).reduce(function(val1, val2){ return (val1  +  val2) });

                    //  Compute tag-based score
                    p.keywords.forEach(function(k) {
                        // Check if current document has been tagged with current tag
                        if(_this.itemTagMatrix[doc][k.stem]) {
                            var normalizedFreq = Math.pow(Math.E, _this.itemTagMatrix[doc][k.stem]) / itemTagsExpSum;           // normalized item-tag frequency
                            var singleTagScore = (normalizedFreq * k.weight * growthFun(_this.itemTagMatrix[doc][k.stem]) / p.keywords.length);
                            tags[k.stem] = { tagged: _this.itemTagMatrix[doc][k.stem], score: singleTagScore, term: k.term };
                            tagScore += singleTagScore;
                        }
                        //  Check if similar documents have been tagged with current tag
                        else {
                            var singleTagScore = 0.0;
                            for(var i=0; i<p.options.simDocuments; ++i) {
                                var simDoc = _this.docSimilarityMatrix[doc][i];
                                if(_this.itemTagMatrix[simDoc.id] && _this.itemTagMatrix[simDoc.id][k.stem]) {
                                    var freq = parseFloat(_this.itemTagMatrix[simDoc.id][k.stem] * simDoc.similarity);
                                    var normalizedFreq = Math.pow(Math.E, (freq)) / itemTagsExpSum;           // normalized item-tag frequency
                                    singleTagScore = parseFloat(normalizedFreq * k.weight * growthFun(freq) / p.keywords.length);
                                    tagScore += singleTagScore;
                                }
                            }
                        }


                    });
                    expSumTags += Math.pow(Math.E, tagScore);


                    //  Compute user-based score => neighbor similarity * 1 | 0
                    neighbors.forEach(function(v) {
                        var singleUserScore = 0;
                        // check if neighbour has bookmarked current document
                        if(_this.userItemMatrix[v.user][doc]) {
                            singleUserScore += v.score;
                            users++;
                        }
                        // check if neighbour has bookmarked similar documents
                        else {
                            for(var i=0; i<p.options.simDocuments; ++i) {
                                var simDoc = _this.docSimilarityMatrix[doc][i];
                                if(_this.userItemMatrix[v.user][simDoc.id]) {
                                    singleUserScore += parseFloat((v.score * simDoc.similarity) / p.options.simDocuments);
                                }
                            }
                        }
                        userScore += parseFloat(singleUserScore / neighbors.length);
                    });
                    expSumUsers += Math.pow(Math.E, userScore);

                    if(userScore > 0 || tagScore > 0) {
                        recs.push({
                            doc: doc,
                            misc: {
                                tagScore: tagScore,
                                userScore: userScore,
                                tags: tags,
                                users: users
                            }
                        });
                    }
                }
            });

            recs.forEach(function(r){
                var tagScore = parseFloat(r.misc.tagScore/expSumTags) || 0.0,
                    userScore = parseFloat(r.misc.userScore/expSumUsers) || 0.0;
                r.score = tagScore * p.options.beta + userScore * (1 - p.options.beta);
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

    return RS_ALT_2;
})();
