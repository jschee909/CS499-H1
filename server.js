var express = require('express')
var chokidar = require('chokidar')
var AWS = require('aws-sdk');
var fs = require('fs')

var watcher = chokidar.watch('./dropbox', {igornored: /[\/\\]./, persistent: true});
var log = console.log.bind(console);

var s3 = new AWS.S3();

var myBucket = 'cs499-bucket-t-ngo';
var app = express()

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/list', function(req, res){
  var params = {
    Bucket: myBucket    
  };
  s3.listObjects(params,  function(err, data){    
    for(var i = 0; i < data.Contents.length; i++) {
      data.Contents[i].Url = 'https://s3-us-west-1.amazonaws.com/' + data.Name + '/' + data.Contents[i].Key;
    }   
    res.send(data.Contents);
  })
})

watcher
  .on('add', function(path) { uploadFileToS3(path); })
  .on('addDir', function(path) { log('Directory', path, 'has been added'); })
  .on('change', function(path) { deleteFileFromS3(path); uploadFileToS3(path); })
  .on('unlink', function(path) { deleteFileFromS3(path);})
  .on('unlinkDir', function(path) { log('Directory', path, 'has been removed'); })
  .on('error', function(error) { log('Error happened', error); })
  .on('ready', function() { log('Initial scan complete. Ready for changes.'); })
  .on('raw', function(event, path, details) { log('Raw event info:', event, path, details); })


// 'add', 'addDir' and 'change' events also receive stat() results as second
// argument when available: http://nodejs.org/api/fs.html#fs_class_fs_stats
watcher.on('change', function(path, stats) {
  if (stats) console.log('File', path, 'changed size to', stats.size);
});

function uploadFileToS3(fPath) {
  fs.readFile(fPath, function (err, data) {
    params = {Bucket: myBucket, Key: fPath, Body: data, ACL: "public-read"};
      s3.putObject(params, function(err, data) {
           if (err) {
               console.log(err)
           } else {
               console.log("Successfully uploaded data to " + myBucket, data);
           }
      });
  });
}
function deleteFileFromS3(fPath) {
    params = {Bucket: myBucket, Key: fPath};

      s3.deleteObject(params, function(err, data) {
           if (err) {
               console.log(err)
           } else {
               console.log("Successfully uploaded data to " + myBucket, data);
           }
      });
}

app.use(express.static('public'));
app.listen(3000);