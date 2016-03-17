/*******************************************************************************
*
*   softmax normaliaztion on tag and user scores, softmax normalization on final score
*
********************************************************************************/



window.RS_TUCB = (function(){

    var _this;
    //  cosntructor
    function RS_TUCB() {
        _this = this;
        this.userItemMatrix = {};       //  boolean values
        this.itemTagMatrix = {};        //  counts repetitions
        this.userTagMatrix = {};        //  counts repetitions
        this.maxTagAcrossDocs = {};     //  highest frequency of each tag in a document. Depends on item-tag matrix
        this.maxTagAccrossUsers = {};   //  highest frequency of each tag for a user. Depends on user-tag matrix
        this.sumTagAcrossDocs = {};
        this.sumTagAcrossUsers = {};
        this.docSimilarityMatrix = {};
        this.data = window.documents;
        this.docIDs = Object.keys(this.data);

       for(var i=0; i<_this.docIDs.length-1; ++i){
           for(var j=i+1; j<_this.docIDs.length; ++j) {
               var id1 = _this.docIDs[i], id2 = _this.docIDs[j],
                   d1 = _this.data[id1], d2 = _this.data[id2], 
                   d1Norm = getEuclidenNorm(d1.keywords), d2Norm = getEuclidenNorm(d2.keywords),
                   unionTerms = $.merge([], Object.keys(d1.keywords));
               unionTerms = $.merge(unionTerms, Object.keys(d2.keywords))
               var docSimilarity = 0;
               unionTerms.forEach(function(term) {
                   var tfidf1 = d1.keywords[term] || 0.0,
                       tfidf2 = d2.keywords[term] || 0.0
                   docSimilarity += parseFloat(tfidf1 * tfidf2 / d1Norm * d2Norm);
               });
               docSimilarity = parseFloat(docSimilarity/unionTerms.length);
               if(docSimilarity) {
                   if(!_this.docSimilarityMatrix[id1]) _this.docSimilarityMatrix[id1] = {};
                   if(!_this.docSimilarityMatrix[id2]) _this.docSimilarityMatrix[id2] = {};
                   _this.docSimilarityMatrix[id1][id2] = docSimilarity;
                   _this.docSimilarityMatrix[id2][id1] = docSimilarity;                    
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


    RS_TUCB.prototype = {

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
                    alpha: 0.7,
                    betaa: 0.2,
                    neighborhoodSize: 20,
                    and: false,
                    k: 0
                }
            }, args);

            var growthFun = function(x) { return  parseFloat(1 - Math.pow(Math.E, (-1 * x))) };
            var expSumTags = 0, expSumUsers = 0, expSumCB = 0;

            //  Get neighbors
            var neighbors = [];
            Object.keys(_this.userTagMatrix).forEach(function(user){
                if(user != p.user) {
                    var userScore = 0;
                    var userTagsExpSum = Object.keys(_this.userTagMatrix[user]).map(function(tag){
                        return  parseFloat(Math.pow(Math.E, parseInt(_this.userTagMatrix[user][tag])))
                    }).reduce(function(val1, val2){ return (val1 + val2) });

                    p.keywords.forEach(function(k){
                        if(_this.userTagMatrix[user][k.term]) {
                            var normalizedFreq = Math.pow(Math.E, _this.userTagMatrix[user][k.term]) / userTagsExpSum;
                            //var scalingFactor = 1 / (Math.pow(Math.E, (1 / _this.userTagMatrix[user][k.term])));
                            userScore += ((normalizedFreq * k.weight * growthFun(_this.userTagMatrix[user][k.term])) / p.keywords.length);
                        }
                    });
                    if(userScore)
                        neighbors.push({ user: user, score: userScore });
                }
            });
            // Sort and Trim neighbourhood
            neighbors = neighbors.sort(function(u1, u2){
                if(u1.score > u2.score) return -1;
                if(u1.score < u2.score) return 1;
                return 0;
            }).slice(0, p.options.neighborhoodSize);


            var recs = [];
            //   Keys are doc ids
            _this.docIDs.forEach(function(doc){
                //  Checks that current user is new or that s/he has not selected the doc yet
                if(!_this.userItemMatrix[p.user] || !_this.userItemMatrix[p.user][doc]){

                    var tagBasedScore = 0,
                        userBasedScore = 0,
                        tags = {}, users = 0;

                    // Compute Tag Score
                    if(_this.itemTagMatrix[doc]) {
                        var itemTagsExpSum = Object.keys(_this.itemTagMatrix[doc]).map(function(tag){
                            return Math.pow(Math.E, _this.itemTagMatrix[doc][tag])
                        }).reduce(function(val1, val2){ return (val1  +  val2) });

                        //  Compute tag-based score
                        p.keywords.forEach(function(k){
                            if(_this.itemTagMatrix[doc][k.term]) {
                                var normalizedFreq = Math.pow(Math.E, _this.itemTagMatrix[doc][k.term]) / itemTagsExpSum;           // normalized item-tag frequency
                                var tagScore = (normalizedFreq * k.weight * growthFun(_this.itemTagMatrix[doc][k.term]) / p.keywords.length);
                                tags[k.term] = { tagged: _this.itemTagMatrix[doc][k.term], score: tagScore };
                                tagBasedScore += tagScore;
                            }
                        });
                        expSumTags += Math.pow(Math.E, tagBasedScore);                        
                    }

                    //  Compute User Score => neighbour similarity * 1 | 0
                    neighbors.forEach(function(v){
                        // check if neighbour has bookmarked current document
                        var userScore = 0;
                        if(_this.userItemMatrix[v.user] && _this.userItemMatrix[v.user][doc]) {
                            userScore += v.score;                            
                            users++;
                        }
                        // check if neighbour has bookmarked similar documents
                        Object.keys(_this.docSimilarityMatrix[doc]).forEach(function(similarDoc){
                            // FIX!!!!!! search only first 5 similar documents
                            if(_this.userItemMatrix[v.user][similarDoc])
                                userScore += parseFloat(v.score * _this.docSimilarityMatrix[doc][similarDoc]);
                        });
                        userScore = parseFloat(userScore / neighbors.length);
                        userBasedScore += userScore;

                    });
                    expSumUsers += Math.pow(Math.E, userBasedScore);

                    // Compute CB score
                    var d = _data[doc];
                    var docNorm = getEuclidenNorm(d.keywords);
                    var unitQueryVectorDot = parseFloat(1.00/Math.sqrt(p.keywords.length));
                    var cbScore = 0;
                    p.keywords.forEach(function(q) {
                        // termScore = tf-idf(d, t) * unitQueryVector(t) * weight(query term) / |d|   ---    |d| = euclidenNormalization(d)
                        if(d.keywords[q.term])
                            cbScore += ((parseFloat(d.keywords[q.term]) / docNorm) * unitQueryVectorDot * parseFloat(q.weight));
                    });
                    expSumCB += Math.pow(Math.E, cbScore);

                    //                    if((p.options.and && userBasedScore > 0 && tagBasedScore > 0) || finalScore > 0) {
                    if(userBasedScore > 0 || tagBasedScore > 0) {
                        recs.push({
                            doc: doc,
                            misc: {
                                tagBasedScore: tagBasedScore,
                                userBasedScore: userBasedScore,
                                cbScore: cbScore,
                                tags: tags,
                                users: users
                            }
                        });
                    }                        
                }
            });

            recs.forEach(function(r){
                var tagBasedScore = parseFloat(r.misc.tagBasedScore/expSumTags) || 0.0,
                    userBasedScore = parseFloat(r.misc.userBasedScore/expSumUsers) || 0.0,
                    cbScore = parseFloat(r.misc.cbScore/expSumCB) || 0.0;
                r.score = tagBasedScore * p.options.alpha + userBasedScore * (p.options.betaa) + cbScore * (1 - p.options.alpha - p.options.betaa); 
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
        }

    };

    return RS_TUCB;
})();
