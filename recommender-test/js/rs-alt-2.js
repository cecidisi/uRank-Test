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
        this.sumUserTag = {};           // dictionary keys = tag, value = sum tag freq. accross all users
        this.sumItemTag = {};           // dictionary keys = tag, value = sum tag freq. accross all docs
        this.userProfile = {};
        this.docBookmarkCount = {};
        this.data = window.documents;
    }


    RS_ALT_2.prototype = {

        addBookmark: function(args) {
            var p = $.extend({ user: undefined, doc: undefined, keywords: undefined }, args);

            if(!p.user || !p.doc || !p.keywords)
                return 'Error -- parameter missing';

            //  update user-item matrix
           if(!_this.userItemMatrix[p.user]) _this.userItemMatrix[p.user] = {};

            _this.userItemMatrix[p.user][p.doc] = true;

            // update user profile
            if(!_this.userProfile[p.user]) _this.userProfile[p.user] = { tags: {}, totTags: 0, uNorm: 0.0 };

            //  update boomark frequency for current document
            _this.docBookmarkCount[p.doc] = _this.docBookmarkCount[p.doc] ? _this.docBookmarkCount[p.doc] + 1 : 1;

            //  item-tag matrix
            if(!_this.itemTagMatrix[p.doc]) _this.itemTagMatrix[p.doc] = {};

            //  user-tag-matrix
            if(!_this.userTagMatrix[p.user]) _this.userTagMatrix[p.user] = {};

            // update item-tag, user-tag and tagMax matrices
            p.keywords.forEach(function(k){
                // update user-tag and item-tag matrix
                _this.itemTagMatrix[p.doc][k.stem] = (_this.itemTagMatrix[p.doc][k.stem]) ? _this.itemTagMatrix[p.doc][k.stem] + 1 : 1;
                _this.userTagMatrix[p.user][k.stem] = (_this.userTagMatrix[p.user][k.stem]) ? _this.userTagMatrix[p.user][k.stem] + 1 : 1;

                // update tag totals accross users and items
                _this.sumItemTag[k.stem] = (_this.sumItemTag[k.stem]) ? _this.sumItemTag[k.stem] + 1 : 1
                _this.sumUserTag[k.stem] = (_this.sumUserTag[k.stem]) ? _this.sumUserTag[k.stem] + 1 : 1

                // update user profile
                _this.userProfile[p.user].tags[k.stem] = (_this.userProfile[p.user].tags[k.stem]) ? _this.userProfile[p.user].tags[k.stem] + 1 : 1 ;
                _this.userProfile[p.user].totTags++;
            });

            _this.userProfile[p.user].uNorm = getEuclidenNorm(_this.userProfile[p.user].tags);
            return 'success';
        },

        getRecommendations: function(args) {

            var p = $.extend(true, {
                user: 'new',
                keywords: [],
                options: {
                    beta: 0.5,
                    neighborhoodSize: 10,
                    and: false,
                    k: 0
                }
            }, args);

            var totTagWeights = 0.0;
            for(var i=0; i<p.keywords.length; ++i ) {
                totTagWeights += p.keywords[i].weight;
            }

            var simUT = {};
            p.keywords.forEach(function(k){
                simUT[k.stem] = parseFloat(k.weight / totTagWeights);
            });

            //  Compute Neighbors per tag
            // sim(v, t) = sim(neighbor, tag)
            var neighbors = [];
            Object.keys(_this.userTagMatrix).forEach(function(user){
                if(user != p.user) {
                    var simUV = 0.0;
                    p.keywords.forEach(function(k) {
                        var tag = k.stem;
                        simVT = (_this.userTagMatrix[user][tag]) ? parseFloat(_this.userTagMatrix[user][tag] / _this.sumUserTag[tag]) : 0.0;
                        simUV += parseFloat(simUT[tag] * simVT);
                    });
                    if(simUV) {
                        neighbors.push({ user: user, simUV: simUV });
                    }
                }
            });


            neighbors = neighbors.sort(function(v1, v2){
                if(v1.simUV > v2.simUV) return -1;
                if(v1.simUV < v2.simUV) return 1;
                return 0;
            }).slice(0, p.options.neighborhoodSize);


            // receives user profile and document object
            var getUserDocSimilarity = function(user, d, dNorm) {
                var unionTerms = _.union(Object.keys(user.tags), Object.keys(d.keywords)),
                   sim = 0.0;
                dNorm = dNorm || getEuclidenNorm(d.keywords);
                unionTerms.forEach(function(term) {
                    var tfU = user.tags[term] || 0.0,
                        tfidf = d.keywords[term] || 0.0;
                    sim += parseFloat((tfU * tfidf) / (user.uNorm * dNorm ));
                });
                return parseFloat(sim / unionTerms.length);
            };


            var recs = [];
            //   Keys are doc ids
            Object.keys(_this.itemTagMatrix).forEach(function(doc) {

                //  Checks that current user is new or that s/he has not selected the doc yet
                if(!_this.userItemMatrix[p.user] || !_this.userItemMatrix[p.user][doc]) {

                    var d = _this.data[doc];
                    // document norm
                    var docNorm = getEuclidenNorm(d.keywords);

                    var tagScore = 0.0, tags = {};

                    p.keywords.forEach(function(k) {
                        var tag = k.stem;

                        // sim(tag, document)
                        var normTfidf = (d.keywords[tag]) ? parseFloat(d.keywords[tag] / docNorm) : 0.0;
                        var probDT = (_this.itemTagMatrix[doc][tag]) ? parseFloat(_this.itemTagMatrix[doc][tag] / _this.sumItemTag[tag]) : 0.0;
                        var simTD = parseFloat(0.8 * probDT + 0.2 * normTfidf);
//                        var simTD = probDT;
                        var singleTtagScore = parseFloat(p.options.beta * simUT[tag] * simTD);
                        tagScore += singleTtagScore;
                        tags[tag] = { score: singleTtagScore, tagged: (_this.itemTagMatrix[doc][tag] || 0), tfidf: (d.keywords[tag] || 0.0), term: k.term };
                    });

                    // search in neighborhood
                    var userScore = 0.0, users = 0;
                    neighbors.forEach(function(v) {
                        var simVD = (_this.userItemMatrix[v.user] && _this.userItemMatrix[v.user][doc]) ? 1 : getUserDocSimilarity(_this.userProfile[v.user], d, docNorm );
                        userScore += parseFloat((1 - p.options.beta) * v.simUV * simVD);
                        users = (simVD == 1) ? users + 1 : 1;
                    });

                    if(tagScore || userScore) {
                        recs.push({
                            doc: doc,
                            score: parseFloat(tagScore + userScore),
                            misc: {
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
            //console.log(recs.slice(0, 10));
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
