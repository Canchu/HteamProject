var express = require('express');
var mysql = require('mysql');
var router = express.Router();

var pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'hteam_db'
});

var userRankJson = Object();

/* GET home page. */
router.get('/', function(req, res, next) {
  userRankJson = Object();
  var charaQuery = 'select * from characterScore order by score desc';
  var p = new Promise(function(res) { res(); });
  userRankJson['score'] = [];
  pool.query(charaQuery, function (err, rows) {
    if (err) return next(err);
    for(var i=0; i<rows.length; i++){
    	var character = rows[i]['Ncharacter'];
      var userQuery = 'select name, SUM(score) as total from ranking where Ncharacter = "%c" group by name, Ncharacter order by Ncharacter,total desc;';
    	userRankJson['score'].push(rows[i]['score']);
      userQuery = userQuery.replace(/%c/, character);
    	p = p.then(rankPromiseFunc(character, userQuery));
    }
    p.then(function(){
    	//console.log(userRankJson);
    	res.json(userRankJson);
    });

  });
});


function rankPromiseFunc(character, query){
  return function(prevValue) {
    return new Promise(function(res, rej) {
      pool.query(query, function (err, rows) {
        if (err) return next(err);
        //console.log(rows);
        userRankJson[character] = rows;
        res();
      });
    });
  };
}

module.exports = router;