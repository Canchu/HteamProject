var express = require('express');
var mysql = require('mysql');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('rankingView', { title: 'Ranking' });
});

module.exports = router;