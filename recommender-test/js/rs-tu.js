/******************************************************************************************
*
*   softmax normaliaztion on tag and user scores, softmax normalization on final score
*   computes pseude tag and user scores based on 5 most similar documents when actual score doesnt exist
*
*******************************************************************************************/

window.RS_TU = (function(){

    var _this;
    //  cosntructor
    function RS_TU() {
        _this = this;
        this.userItemMatrix = {};       //  boolean values
        this.itemTagMatrix = {};        //  counts repetitions
        this.userTagMatrix = {};        //  counts repetitions
        this.tagUserMatrix = {};
        this.sumUserTag = {};           // dictionary keys = tag, value = sum tag freq. accross all users
        this.sumItemTag = {};           // dictionary keys = tag, value = sum tag freq. accross all docs
        this.userProfile = {};
        this.docBookmarkCount = {};
        this.data = window.documents;
    }


    RS_TU.prototype = {

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
            p.keywords.forEach(function(k) {
                var tag = k.stem;
                // update user-tag and item-tag matrix
                _this.itemTagMatrix[p.doc][tag] = (_this.itemTagMatrix[p.doc][tag]) ? _this.itemTagMatrix[p.doc][tag] + 1 : 1;
                _this.userTagMatrix[p.user][tag] = (_this.userTagMatrix[p.user][tag]) ? _this.userTagMatrix[p.user][tag] + 1 : 1;

                if(!_this.tagUserMatrix[tag]) _this.tagUserMatrix[tag] = {};
                _this.tagUserMatrix[tag][p.user] = (_this.tagUserMatrix[tag][p.user]) ? _this.tagUserMatrix[tag][p.user] + 1 : 1;

                // update tag totals accross users and items
                _this.sumItemTag[tag] = (_this.sumItemTag[tag]) ? _this.sumItemTag[tag] + 1 : 1
                _this.sumUserTag[tag] = (_this.sumUserTag[tag]) ? _this.sumUserTag[tag] + 1 : 1

                // update user profile
                _this.userProfile[p.user].tags[tag] = (_this.userProfile[p.user].tags[tag]) ? _this.userProfile[p.user].tags[tag] + 1 : 1 ;
                _this.userProfile[p.user].totTags++;
            });

            _this.userProfile[p.user].uNorm = getEuclidenNorm(_this.userProfile[p.user].tags);
            return 'success';
        },

        getRecommendations: function(args, show) {

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

            var keywords = p.keywords,
                user = p.user,
                beta = parseFloat(p.options.beta),
                Vsize = parseFloat(p.options.neighborhoodSize);

            // receives user profile and document object
            var getUserDocSimilarity = function(user, d, dNorm) {
                var commonTerms = _.intersection(Object.keys(user.tags), Object.keys(d.keywords)),
                    unionSize = _.union(Object.keys(user.tags), Object.keys(d.keywords)).length,
                    sim = 0.0;
                    dNorm = dNorm || getEuclidenNorm(d.keywords),
                    denominator = parseFloat(user.uNorm * dNorm);;
                for(var c=0, len=commonTerms.length; c<len; ++c) {
                    if(denominator) {
                        var term = commonTerms[c],
                            tfU = user.tags[term] || 0.0,
                            tfidf = d.keywords[term] || 0.0;
                        sim += parseFloat((tfU * tfidf) / denominator);
                    }
                }
                return (sim && unionSize) ? parseFloat(sim / unionSize) : 0.0;
            };


            //var totTagWeights = keywords.reduce(function(k1, k2){ return parseFloat(k1.weight + k2.weight) }, 0.0),
            var totTagWeights = 0.0;
            for(var i=0; i<keywords.length; ++i ) {
                totTagWeights += keywords[i].weight;
            }

            var simUT = {};
            for(var i=0; i<keywords.length; ++i ) {
                var k = keywords[i];
                simUT[k.stem] = parseFloat(k.weight / totTagWeights);
            }

            //  Compute Neighbors per tag
            // sim(v, t) = sim(neighbor, tag)
            var initNeighbors = [], neighbors = [];
            keywords.forEach(function(k){
                initNeighbors = _.union(neighbors, Object.keys(_this.tagUserMatrix[k.stem]));
            });

            for(var i=0, len=initNeighbors.length; i<len; ++i) {
                var v = initNeighbors[i];
                if(v != user) {
                    var simUV = 0.0, simVT = {};
                    keywords.forEach(function(k) {
                        var tag = k.stem;
                        if(_this.userTagMatrix[v][tag]) {
                            simVT[tag] = parseFloat(_this.userTagMatrix[v][tag] / _this.sumUserTag[tag]);
                            //simUV += (parseFloat(simUT[tag] * simVT[tag]) / keywords.length);
                            simUV += parseFloat(simVT[tag] / keywords.length);
                        }
                    });
                    if(simUV) {
                        neighbors.push({ user: v, simUV: simUV, simVT: simVT });
                    }
                }
            }

            neighbors = neighbors.sort(function(v1, v2){
                if(v1.simUV > v2.simUV) return -1;
                if(v1.simUV < v2.simUV) return 1;
                return 0;
            }).slice(0, Vsize);
//            neighbors = neighbors.quickSort('simUV').slice(0, Vsize);

            var recs = [];
            var sumUscores = 0.0, sumTscores = 0.0;
            //   Keys are doc ids
            var docIDs = Object.keys(_this.itemTagMatrix);
            for(var i=0, docsLen=docIDs.length; i< docsLen; ++i) {
                var doc = docIDs[i];
                //  Checks that current user is new or that s/he has not selected the doc yet
                if(!_this.userItemMatrix[user] || !_this.userItemMatrix[user][doc]) {

                    var score = 0.0, tagScore = 0.0, userScore = 0.0, users = 0, tags = {};
                    var d = _this.data[doc];
                    // document norm
                    var docNorm = getEuclidenNorm(d.keywords);
                    // sim(v, d) = sim(neighbor, document)
                    var simUsersCurrentDoc = {}; // key: user, value: sim(user, current doc)

                    for(var k=0; k<keywords.length; ++k) {

                        var tag = keywords[k].stem;
                        // sim(tag, document)
                        var normTfidf = (d.keywords[tag]) ? parseFloat(d.keywords[tag] / docNorm) : 0.0;
                        var probDT = (_this.itemTagMatrix[doc][tag]) ? parseFloat(_this.itemTagMatrix[doc][tag] / _this.sumItemTag[tag]) : 0.0;
                        var simTD = parseFloat(0.8 * probDT + 0.2 * normTfidf);

                        // search in neighborhood for current tag
                        var avgSimVD = 0.0;
                        for(var j=0, nLen=neighbors.length; j<nLen; ++j) {
                            var v = neighbors[j];
                            if(!simUsersCurrentDoc[v.user]) {
                                //simUsersCurrentDoc[v.user] = (_this.userItemMatrix[v.user] && _this.userItemMatrix[v.user][doc]) ? 1 : getUserDocSimilarity(_this.userProfile[v.user], d, docNorm );
                                var directSim = (_this.userItemMatrix[v.user] && _this.userItemMatrix[v.user][doc]) ? 1.0 : 0.0;
                                simUsersCurrentDoc[v.user] = directSim ? directSim : getUserDocSimilarity(_this.userProfile[v.user], d, docNorm );
                                users = directSim ? (users + 1) : users;
                            }
                            // sim(t,v) * sim(v,d)
                            avgSimVD += (v.simVT[tag]) ? parseFloat((v.simVT[tag] * simUsersCurrentDoc[v.user]) / Vsize) : 0.0;
                        }

                        tagScore += (simUT[tag] * simTD);
                        userScore += (simUT[tag] * avgSimVD);

                        sumTscores += tagScore;
                        sumUscores += userScore;

                        //score += simUT[tag] * ( beta * simTD + (1.0 - beta) * avgSimVD );

                        tags[tag] = { tagged: (_this.itemTagMatrix[doc][tag] || 0), term: keywords[k].term };
                    }

                    if(tagScore || userScore) {
                    //if(score) {
                        recs.push({
                            doc: doc,
                            //score: score,
                            misc: {
                                tScore: tagScore,
                                uScore: userScore,
                                tags: tags,
                                users: users
                            }
                        });
                    }
                }
            }

            /*for(var i=0, len=recs.length; i<len; ++i) {
                var r = recs[i];
                recs[i].score = beta * r.misc.tScore + (1.0-beta) * r.misc.uScore;
            }*/

            var size = p.options.k ? p.options.k : recs.length;
            //            return recs.quickSort('score').slice(0,size);
            recs = recs.sort(function(r1, r2){
                if(!r1.score) {
                    r1.misc.tScore = parseFloat(r1.misc.tScore/sumTscores);
                    r1.misc.uScore = parseFloat(r1.misc.uScore/sumUscores);
                    r1.score =  beta * r1.misc.tScore + (1.0-beta) * r1.misc.uScore;
                }
                if(!r2.score) {
                    r2.misc.tScore = parseFloat(r2.misc.tScore/sumTscores);
                    r2.misc.uScore = parseFloat(r2.misc.uScore/sumUscores);
                    r2.score =  beta * r2.misc.tScore + (1.0-beta) * r2.misc.uScore;
                }

                if(r1.score > r2.score) return -1;
                if(r1.score < r2.score) return 1;
                return 0;
            }).slice(0,size);

/*
           console.log('********************************** BETA = ' + p.options.beta + '; TOPIC = ' + p.topic + '; KEYWORDS = ' + keywords.map(function(k){ return k.term }).join(', ') );
            for(var i=0, len=5; i<len;++i) {
                var d = recs[i],
                    obj = {
                    title: _this.data[d.doc].title,
                    SCORE: d.score,
                    Uscore: d.misc.uScore,
                    Tscore: d.misc.tScore
                }
                console.log(obj);
                //console.log(_this.data[d.doc].title + ' --- SCORE = ' + d.score + ';  U-score = ' + d.misc.userScore + '; T-score = ' + d.misc.tagScore);
            }
*/
            return recs;

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

    return RS_TU;
})();
