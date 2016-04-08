/******************************************************************************************
*
*   softmax normaliaztion on tag and user scores, softmax normalization on final score
*   computes pseude tag and user scores based on 5 most similar documents when actual score doesnt exist
*
*******************************************************************************************/

window.RS_TU_ALT = (function(){

    var _this;
    //  cosntructor
    function RS_TU_ALT() {
        _this = this;
        this.userItemMatrix = {};       //  boolean values
        this.itemUserMatrix = {};
        this.itemTagMatrix = {};        //  counts repetitions
        this.userTagMatrix = {};        //  counts repetitions
        this.tagUserMatrix = {};
        this.sumUserTag = {};           // dictionary keys = tag, value = sum tag freq. accross all users
        this.sumItemTag = {};           // dictionary keys = tag, value = sum tag freq. accross all docs
        this.userProfile = {};
        this.docBookmarkCount = {};
        this.data = window.documents;
    }


    RS_TU_ALT.prototype = {

        addBookmark: function(args) {
            var p = $.extend({ user: undefined, doc: undefined, keywords: undefined, topic: undefined }, args);

            if(!p.user || !p.doc || !p.keywords)
                return 'Error -- parameter missing';

            //  update user-item matrix
           if(!_this.userItemMatrix[p.user]) _this.userItemMatrix[p.user] = {};
           if(!_this.itemUserMatrix[p.doc]) _this.itemUserMatrix[p.doc] = {};

            _this.userItemMatrix[p.user][p.doc] = true;
            _this.itemUserMatrix[p.doc][p.user] = true;

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

            // receives user profile and document object
            var getUserDocSimilarity = function(user, d, dNorm) {
                var commonTerms = _.intersection(Object.keys(user.tags), Object.keys(d.keywords)),
                    unionSize = _.union(Object.keys(user.tags), Object.keys(d.keywords)).length,
                    sim = 0.0;
                dNorm = dNorm || getEuclidenNorm(d.keywords);
                for(var c=0, len=commonTerms.length; c<len; ++c) {
                    var term = commonTerms[c],
                        tfU = user.tags[term] || 0.0,
                        tfidf = d.keywords[term] || 0.0,
                        nominator = parseFloat(user.uNorm * dNorm);
                    sim += nominator ? parseFloat((tfU * tfidf) / nominator) : 0.0;
                }
                return commonTerms.length ? parseFloat(sim / unionSize) : 0.0;
            };

            var growthFun = function(x) { return  parseFloat(1 - Math.pow(Math.E, (-1 * x))) };

            var totTagWeights = 0.0;
            for(var i=0, len=p.keywords.length; i<len; ++i ) {
                if(!p.keywords[i].weight)
                    console.log(p.keywords);
                totTagWeights += p.keywords[i].weight;
            }

            var simUT = {};
            p.keywords.forEach(function(k){
                simUT[k.stem] = parseFloat(k.weight / totTagWeights);
            });

            //  Compute Neighbors per tag
            // sim(v, t) = sim(neighbor, tag)
/*            var initNeighbors = [], neighbors = [];
            p.keywords.forEach(function(k){
                initNeighbors = _.union(neighbors, Object.keys(_this.tagUserMatrix[k.stem]));
            });

            for(var i=0, len=initNeighbors.length; i<len; ++i) {
                var v = initNeighbors[i];
                if(v != p.user) {
                    var simUV = 0.0;
                    p.keywords.forEach(function(k) {
                        var tag = k.stem;
                        simVT = (_this.userTagMatrix[v][tag]) ? parseFloat(_this.userTagMatrix[v][tag] / _this.sumUserTag[tag]) : 0.0;
                        simUV += parseFloat(simUT[tag] * simVT);
                    });
                    if(simUV) {
                        neighbors.push({ user: v, simUV: simUV });
                    }
                }
            }*/

            var neighbors = [];
            Object.keys(_this.userTagMatrix).forEach(function(v){
                if(v != p.user) {
                    // var userTagsExpSum = Object.keys(_this.userTagMatrix[v]).map(function(tag){
                    //     return  parseFloat(Math.pow(Math.E, _this.userTagMatrix[v][tag]));
                    // }).reduce(function(val1, val2){ return (val1 + val2) });

                    var userTagsSum = 0.0;
                    Object.keys(_this.userTagMatrix[v]).forEach(function(tag){
                        userTagsSum += _this.userTagMatrix[v][tag];
                    })

                    var simUV = 0.0, simVT = {}, oldSimVT = {}, oldsim = 0.0, tagged = {};
                    p.keywords.forEach(function(k) {
                        var tag = k.stem;
                        if(_this.userTagMatrix[v][tag]) {
                            // tagged[tag] = _this.userTagMatrix[v][tag];
                            // oldSimVT[tag] = parseFloat(Math.pow(Math.E, _this.userTagMatrix[v][tag]) / userTagsExpSum);
                            // oldsim += oldSimVT[tag];

                            //simVT[tag] = parseFloat(_this.userTagMatrix[v][tag] / _this.sumUserTag[tag]);
                            simVT[tag] = parseFloat(Math.pow(_this.userTagMatrix[v][tag], 2) / (_this.sumUserTag[tag] *  userTagsSum));// / p.keywords.length);
                            simUV += simVT[tag];
                        }
                    });
                    if(simUV) {
                        neighbors.push({ user: v, simUV: simUV, simVT:simVT });
                    }

                }
            });

            neighbors = neighbors.sort(function(v1, v2){
                if(v1.simUV > v2.simUV) return -1;
                if(v1.simUV < v2.simUV) return 1;
                return 0;
            }).slice(0, p.options.neighborhoodSize);



            var recs = [];
            //   Keys are doc ids
            Object.keys(_this.itemTagMatrix).forEach(function(doc) {

                //  Checks that current user is new or that s/he has not selected the doc yet
                if(!_this.userItemMatrix[p.user] || !_this.userItemMatrix[p.user][doc]) {

                    var d = _this.data[doc];
                    // document norm
                    var docNorm = getEuclidenNorm(d.keywords);
                    var tagScore = 0.0, tags = {};

                    // U-score
                    var userScore = 0.0, users = 0;
                    neighbors.forEach(function(v, i) {
                        var simVD = (_this.userItemMatrix[v.user] && _this.userItemMatrix[v.user][doc]) ? 1.0 : getUserDocSimilarity(_this.userProfile[v.user], d, docNorm);
                        /*var simVDdirect = (_this.userItemMatrix[v.user] && _this.userItemMatrix[v.user][doc]) ? 1.0 : 0.0,
                            simVDindirect =  getUserDocSimilarity(_this.userProfile[v.user], d, docNorm),
                            simVD = parseFloat(0.8 * simVDdirect + 0.2 * simVDindirect);*/

                        userScore += parseFloat(v.simUV * simVD);
                        users = (simVD == 1) ? users + 1 : 1;
                    });
                    userScore /= parseFloat(users);

                    var beta = parseFloat(p.options.beta),
                        score = 0.0;

                    var itemTagsSum = 0.0;
                    Object.keys(_this.itemTagMatrix[doc]).forEach(function(tag){
                        itemTagsSum += _this.itemTagMatrix[doc][tag];
                    })
                    // T-score
                    p.keywords.forEach(function(k) {
                        var tag = k.stem;
                        // sim(tag, document)
                        var normTfidf = (d.keywords[tag]) ? parseFloat(d.keywords[tag] / docNorm) : 0.0,
                            normQueryDot = parseFloat(1.0/Math.sqrt(p.keywords.length)),
                            cosSimTagDoc = parseFloat(normTfidf * normQueryDot),
                            probDT = 0.0;
                            //probDT = (_this.itemTagMatrix[doc][tag]) ? parseFloat(_this.itemTagMatrix[doc][tag] / _this.sumItemTag[tag]) : 0.0,
                        if(_this.itemTagMatrix[doc][tag]) {
                            probDT = parseFloat(Math.pow(_this.itemTagMatrix[doc][tag], 2) / (itemTagsSum * _this.sumItemTag[tag]) );
                        }
                        var simTD = parseFloat(0.8 * probDT + 0.2 * cosSimTagDoc);
                        //var singleTagScore = parseFloat(simUT[tag] * simTD);
                        //tagScore += parseFloat(singleTagScore);
                        tagScore += simTD;

                        score += parseFloat(simUT[tag] * (beta * simTD  + (1.0-beta) * userScore));

                        tags[tag] = { tagged: (_this.itemTagMatrix[doc][tag] || 0), term: k.term };
                    });


                    if(tagScore || userScore) {
                        var beta = parseFloat(p.options.beta);
                        Math.sqrt(Math.pow(beta * tagScore, 2) + Math.pow((1.0-beta) * userScore, 2));
                        recs.push({
                            doc: doc,
                            score: parseFloat(p.options.beta * tagScore + parseFloat(1.0 - p.options.beta) * userScore),
                            misc: {
                                tags: tags,
                                users: users,
                                tagScore: tagScore,
                                userScore: userScore
                            }
                        });
                    }
                }
            });

            var size = p.options.k ? p.options.k : recs.length;
//            return recs.quickSort('score').slice(0,size);
            recs =  recs.sort(function(r1, r2){
                if(r1.score > r2.score) return -1;
                if(r1.score < r2.score) return 1;
                return 0;
            });

          /*console.log('********************************** BETA = ' + p.options.beta + '; TOPIC = ' + p.topic + '; KEYWORDS = ' + p.keywords.map(function(k){ return k.term }).join(', ') );
            for(var i=0, len=5; i<len;++i) {
                var d = recs[i],
                    obj = {
                    title: _this.data[d.doc].title,
                    SCORE: d.score,
                    Uscore: d.misc.userScore,
                    Tscore: d.misc.tagScore,
                    user: d.misc.users
                }
                console.log(obj);
                //console.log(_this.data[d.doc].title + ' --- SCORE = ' + d.score + ';  U-score = ' + d.misc.userScore + '; T-score = ' + d.misc.tagScore);
            }*/

            recs = recs.slice(0,size);

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

    return RS_TU_ALT;
})();
