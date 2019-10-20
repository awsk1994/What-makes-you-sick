// server.js

var express = require('express');
var app = express();
var port = process.env.PORT || 3306;

var localOnly = process.argv[2] == '-local';
if (localOnly) {
  console.log('Running without connecting to Mongo DB');
}

if (!localOnly) {
  // heroku config:get MONGODB_URI

  var mongoURL = 'mongodb://heroku_xssg0zn9:7b4oc9upfgmv4hnid8sp15m8qg@ds337418.mlab.com:37418/heroku_xssg0zn9';
  var mongoose = require('mongoose');
  mongoose.connect(mongoURL);
  var db = mongoose.connection;
  var File = mongoose.model('File', mongoose.Schema({
    name: String,
    content: String
  }));
}

/**
sudo certbot certonly --manual
sudo heroku certs:add /etc/letsencrypt/live/medmap.tech/fullchain.pem /etc/letsencrypt/live/medmap.tech/privkey.pem
**/

var http = require('http').Server(app);
var request = require('request');
var cors = require('cors');
var fs = require('fs');
var _ = require('lodash');
var util = require('./utilities.js');
for (var key in util) {
  global[key] = util[key];
}

app.use(require('cookie-parser')());
app.use(require('body-parser')());
var session = require('express-session');
var MongoStore = require('connect-mongostore')(session);

var sessionMiddleware = session({
  secret: 'wmys'
});

app.use(sessionMiddleware);
app.set('view engine', 'ejs');

var hostFiles = [
  'utilities.js',
  'favicon.png',
  'data/causeList.js',
  'frontend/_Front.js',
  'favicon.ico',
];

var reload = function(file) {
  delete require.cache[require.resolve(file)]
  return require(file);
};

var cvList = {};
var ready = function() {
  var causeList = require('./data/causeList.js');

  var getListByType = function(type) {
    var list = [];
    if (type == 'cause') { list = causeList } 
    return list;
  }

  function nocache(req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
  }

  hostFiles.map(function(hostFile) {
    app.get('/' + hostFile, nocache, function(req, res) {
      res.sendFile(__dirname + '/' + hostFile);
    });
  });

  app.use(cors());

  // Proxy
  app.get('/proxy', function(req, res) {
    var url = decodeURIComponent(req.query.url);
    console.log('proxy request to ', url);
    request(url).pipe(res);
  });

  app.get('/', function(req, res) {
    res.render('front', {});
  });

  app.post('/new', function(req, res) {
    var id = getNewId(causeList, 'c');
    req.body.id = id;
    req.body.environments = req.body.environments || {};
    causeList[id] = req.body;
    saveDefs(causeList, 'causeList')
    res.json('done');
  });

  app.use('/res', express.static('./res'));

  // Need to be able to update the body network
  var saveDefs = function(defs, file, bypass) {
    var newFile = 'var '+file+' = \n';
    newFile += JSON.stringify(defs, null, bypass ? 0 : 1);
    newFile += "\nif (typeof window === 'undefined') { module.exports = "+file+";}";

    fs.writeFileSync('./data/'+file+'.js', newFile);
    console.log('saving ' + file + '.js');
    
    if (!localOnly) {
      File.findOneAndUpdate({name: file+'.js'}, {
        name: file+'.js',
        content: newFile
      }, {upsert:true}, function(err, doc){
        if (err) console.log('err', err);
        // console.log('Uploaded ', file);
      });
    }
  };

  http.listen(port, function() {
    console.log('listening on *:' + port);
  });
};

if (localOnly) {
  ready();
} else {
  db.once('open', function() {
    // Bypass the download
    if (localOnly) return ready();

    //Save the latest files locally on startup, and keep the db updated
    File.find({}, function(err, files) {
      files.map(function(file) {
        console.log('Found ', file.name);
        fs.writeFileSync('./data/' + file.name, file.content);        
      })
      ready();
    });
  });
}

