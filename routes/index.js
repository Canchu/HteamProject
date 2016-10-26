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

  //----名前の抽出-----//
  var presenterNameHTML = HTMLtext.match(/<a href="\?ps=user-info\&amp[\s\S]*?(<\/[aA])/g);
  var presenterNames = Array();
  presenterNameHTML.forEach(function pushName(element, index, array){
    	var name = element.match(/([^\x01-\x7E]).*([^\x01-\x7E])|Cardona Luis/)[0];
      if(name == undefined) res.render('error', { message: 'presenter null' }); return;
      presenterNames.push(name);
  });
  //console.log(presenterName);
  //-----------------//
  
  
  //----いいねした人と数の抽出-----//
  var likeNamesHTML = HTMLtext.match(/<a href="\?ps=tweet-good-members\&amp[\s\S]*?(<\/[aA])/g);
  var likeNamesString = Array();
  var likeName = Object();

  likeNamesHTML.forEach(function pushlikeNames(element, index, array){
      var name = element.match(/([^\x01-\x7E]).*([^\x01-\x7E]|Cardona Luis)/g)[0];
      if(name != "いいねがありません") likeNamesString.push(name);  //いいねが1つもついていなかったときスキップ 
  });

  for(var i=0; i<likeNamesString.length; i++){
  	var keyName = presenterNames[i];
  	likeName[keyName] = likeNamesString[i].split('　');
  }
  //console.log(likeName);  
  //-------------------------//


  //----投稿時間の抽出-----//
  var timesHTML = HTMLtext.match(/<li style="font-size:10px\;">2016-[\s\S]*?(<\/li)/g);
  var timesString = Array();
  timesHTML.forEach(function pushlikeNames(element, index, array){
    	timesString.push(element.match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/)[0]);
  });
  //console.log(timesString);  
  //-------------------------//

  //----時間・投稿者・いいね・推しキャラでjsonをつくる----------//
  var charaJsons = Array();
  for(var i=0; i<timesString.length; i++){
  	var charaJson = new Object();
  	charaJson['time'] = timesString[i];
  	charaJson['character'] = 'マリオ';
  	charaJson['presenter'] = presenterNames[i];
  	charaJson['follower'] = likeName[charaJson['presenter']];
  	charaJsons.push(charaJson);
  }
   //console.log(charaJsons);
  //------------------------//

  //DBにいれる
  var p = new Promise(function(res) { res(); });
  for(var i = 0; i < charaJsons.length; i++) {
    p = p.then(makePromiseFunc(i, charaJsons)); 
  } 
  p.then(function() { 
      res.render('index', { title: 'Express' });
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
             query = 'update posts set follower="%s" where time = "%t"';
             query = query.replace(/%t/, time);
             query = query.replace(/%s/, charaJsons[index]['follower']);
           }
           else{ //新規登録のとき全てをinsert
             var query = 'insert into posts values ("%s","%s","%s","%s")';
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
