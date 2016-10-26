var express = require('express');
var mysql = require('mysql');
var router = express.Router();

var pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'hteam_db'
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/', function(req, res){
  //console.log(req.query); // for logging
  var HTMLtext = "";
  if (req.body.htmltext) HTMLtext = req.body.htmltext[0];
  

  //----投稿時間の抽出-----//
  var timesHTML = HTMLtext.match(/<span id="tweet_good_\d{4}_count">[\s\S]*?(\d{2}<\/li)/g);
  var timesString = Array();
  timesHTML.forEach(function pushlikeNames(element, index, array){
      timesString.push(element.match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/)[0]);
  });
  //console.log(timesString);  
  //-------------------------//

  //----名前の抽出-----//
  var presenterNameHTML = HTMLtext.match(/<h5\sclass="media-heading"><a\shref="\?ps=user-info\&amp[\s\S]*?(<\/[aA])/g);
  var presenterNames = Array();
  presenterNameHTML.forEach(function pushName(element, index, array){
    	var name = element.match(/([^\x01-\x7E]).*([^\x01-\x7E])|Cardona Luis/)[0];
      if(name == undefined){
        res.render('error', { message: 'presenter null' });
        return;
      }
      presenterNames.push(name);
  });
  //console.log(presenterNames);
  //-----------------//

  //----いいねした人と数の抽出-----//
  var likeNamesHTML = HTMLtext.match(/<a href="\?ps=tweet-good-members\&amp;id=\d{4}[\s\S]*?(<\/li)/g);
  var likeNamesString = Array();
  var likeName = Object();

  likeNamesHTML.forEach(function pushlikeNames(element, index, array){
      var name = element.match(/([^\x01-\x7E]).*([^\x01-\x7E]|Cardona Luis)/g)[0];
      if(name != "いいねがありません") likeNamesString.push(name);  //いいねが1つもついていなかったときスキップ 
  });

  for(var i=0; i<likeNamesString.length; i++){
  	var keyName = timesString[i];
  	likeName[keyName] = likeNamesString[i].split('　');
  }
  //console.log(likeName);  
  //-------------------------//


  //----時間・投稿者・いいね・推しキャラでjsonをつくる----------//
  var charaJsons = Array();
  for(var i=0; i<timesString.length; i++){
  	var charaJson = new Object();
    var cnt = 0;
  	charaJson['time'] = timesString[i];
  	charaJson['character'] = 'ルイージ';
  	charaJson['presenter'] = presenterNames[i];
    charaJson['follower'] = likeName[charaJson['time']];
    if(charaJson['follower'] != undefined) cnt = charaJson['follower'].length;
    charaJson['followercnt'] = cnt;
    charaJsons.push(charaJson);
  }
   console.log(charaJsons);
  //-------------------------------------------------//

  var p = new Promise(function(res) { res(); });
  for(var i = 0; i < charaJsons.length; i++) {
    p = p.then(makePromiseFunc(i, charaJsons)); 
  } 
  p.then(function() { 
      //キャラスコアテーブルの更新
      var characterQuery = "INSERT INTO characterScore (Ncharacter,score) SELECT Ncharacter, score FROM (SELECT Ncharacter, SUM(followerCnt)+COUNT(Ncharacter)*3 as score FROM posts GROUP BY Ncharacter)t ON DUPLICATE KEY UPDATE score = t.score";
      pool.query(characterQuery, function (err, rows) {
        if (err) return next(err);
        res.render('index', { title: 'Express' });
      });
  });
  //-----------------------//
});

function makePromiseFunc(index, charaJsons){
   return function(prevValue) {
      return new Promise(function(res, rej) {
         var time = charaJsons[index]['time'];
         var searchTimeQuery = 'select time from posts where time="%s"'.replace(/%s/, time);
         pool.query(searchTimeQuery, function (err, rows) {
           if (err) return next(err);

           if(rows.length>0){ //既にDBに入っているときいいねを更新するだけ
             query = 'update posts set follower="%s",followerCnt ="%d" where time = "%t"';
             query = query.replace(/%t/, time);
             query = query.replace(/%d/, charaJsons[index]['followercnt']);
             query = query.replace(/%s/, charaJsons[index]['follower']);
           }
           else{ //新規登録のとき全てをinsert
             var query = 'insert into posts values ("%s","%s","%s","%s","%s")';
             for(var key in charaJsons[index]) query = query.replace(/%s/, charaJsons[index][key]);
           }
           pool.query(query, function (err, rows) {
             if (err) return next(err);
             //console.log(query);
             res();
           });
         });
      });
    };
 }

module.exports = router;
