var config = require('config-lite')(__dirname);
var mysql = require('mysql');

var pool = mysql.createPool(config.mysql);

module.exports = function(sql, data, callback){
  pool.getConnection(function(err, conn){
    if(err){
       callback(err, null, null);
    }else{
      conn.query(sql, data, function(qerr, vals, fields){
        //释放连接
        conn.release();
        //事件驱动回调
        callback(qerr, vals, fields);
      });
    }
  });
};