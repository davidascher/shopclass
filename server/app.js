// the thingies server

var path = require('path');
require.paths.unshift(path.join(__dirname, './support'));
var SAMPLE_DIR = path.join(__dirname, '../sampleApp');
var USERS_DIR = path.join(__dirname, '../users');
var STATIC_DIR = path.join(__dirname, '../static');
var PORT = 3333;

var express = require('express'),
    sys = require('sys'),
    fs = require('fs'),
    assert = require('assert'),
    wrench = require('wrench'),
    path = require('path'),
    url = require('url'),
    vm = require('vm'),
    util = require('util'),
    connect = require('connect'), 
    form = require('connect-form'), 
    auth = require('connect-auth/lib/auth'),
    OAuth = require('oauth').OAuth,
    RedisStore = require('connect-redis'),
    underscore = require('underscore-1.1.0.js')
    ;

try {
  var keys = require(path.join(process.env.HOME, 'slappit_secrets.js'));
  for(var key in keys) {
    global[key]= keys[key];
  }
} catch(e) {
  console.log('Unable to locate the slappit_secrets.js file.  Please copy and ammend the example_keys_file.js as appropriate, and put it in your HOME directory');
  sys.exit();
}

var PROD = !(_.include(process.argv, 'dev'));

if (PROD) {
  console.log("running in production mode, needs auth to do anything.")
} else {
  console.log("running in dev mode, no auth needed.")
}
var redis = require('redis').createClient();


var app = express.createServer(
                        connect.cookieParser(), 
                        connect.bodyParser(), // must be before session
                        connect.session({ store: new RedisStore({ maxAge: 300000 }),
                                          secret: 'foobar'}),
                        auth( [
                              auth.Anonymous(),
                              auth.Twitter({consumerKey: twitterConsumerKey, consumerSecret: twitterConsumerSecret}),
                              ])
                        );


app.use(express.favicon());  // XXX come up with our own favicon
app.use(express.logger({format: '":method :url" :status'}))
app.use(app.router);
app.use(express.bodyParser());
// Routes

function ensureAuthenticated(req) {
  if (0)
    assert.ok(req.isAuthenticated())
}

app.get('/auth/twitter', function(req, res, params) {
  // next is a query parameter which indicates where to redirect to.
  var q = url.parse(req.url, true).query;
  var next = '/';
  if (q && q.next) {
    next = q.next;
    // we'll store in the session, so that we can handle it when we get
    // redirected back from twitter.
    req.sessionStore.set('tasks', {'next': next});
  }
  req.authenticate(['twitter'], function(error, authenticated) { 
    if (authenticated) {
      var next = req.sessionStore.get('tasks', function(err, data, meta) {
        res.writeHead(303, {"Location": (data && data['next']) ? data['next'] : '/'});
        res.end();
      });
    }
  });
})

// disable in production
app.get('/auth/anon', function(req, res, params) {
  req.authenticate(['anon'], function(error, authenticated) { 
    res.writeHead(303, { 'Location': '/'});
    res.end('');
  });
})

app.get ('/logout', function(req, res, params) {
  req.logout();
  var next = null
  var q = url.parse(req.url, true).query;
  if (q)
    next = q.next;
  res.writeHead(303, { 'Location': next ? next : '/'});
  res.end('');
})

function getUid(req) {
  ensureAuthenticated(req)
  if (PROD)
    return req.getAuthDetails().user.username;
  else
    return 'no idea';
}

app.get('/static/(*)$', function(req, res, next){
  var pathname = req.params[0];
  var filename = path.join(STATIC_DIR, pathname);
  res.sendfile(filename);
});
app.get('/shared/(*)$', function(req, res, next){
  var pathname = req.params[0];
  var filename = path.join(STATIC_DIR, pathname);
  res.sendfile(filename);
});

app.get('/config$', function(req, res, next){
  res.writeHead(200, {'Content-Type': 'application/json'})
  if (req.isAuthenticated() ) {
    res.end(JSON.stringify(req.getAuthDetails().user));
  } else {
    res.end(JSON.stringify({'username': 'no idea'}));
  }
});

function getUsername(req) {
  return req.getAuthDetails().user.username;
}
function getUserDir(username) {
    return path.join(USERS_DIR, username);
}

app.post('/updatepages/:project$', function(req, res, next) {
  body = req.body; // already JSON parsed!
  data = body['files'];
  for (var i=0; i < data.length; i++) {
    var blob = data[i];
    var fname = blob['name'];
    var code = blob['data'];
    var filename = path.join(getUserDir(getUsername(req)),
                             req.params.project,
                             fname);
    fs.writeFileSync(filename, code);
  }
  res.send();
});

app.get('/listpages/:project$', function(req, res, next){
  var project = req.params.project;
  res.writeHead(200, {'Content-Type': 'application/json'})
  if (req.isAuthenticated() ) {
    var dir = path.join(getUserDir(getUsername(req)), project);
    var files = fs.readdirSync(dir);
    var blob = [];
    for (var i=0; i< files.length; i++) {
      var filename = path.join(dir, files[i]);
      blob.push({'name': files[i],
                'file': fs.readFileSync(filename).toString()});
    }
    res.end(JSON.stringify(blob));
  } else {
    res.end(JSON.stringify({'username': 'no idea'}));
  }
});

app.get('/listprojects$', function(req, res, next){
  var project = req.params.project;
  res.writeHead(200, {'Content-Type': 'application/json'})
  if (req.isAuthenticated() ) {
    var dir = getUserDir(getUsername(req));
    var files = fs.readdirSync(dir);
    var blob = [];
    for (var i=0; i< files.length; i++) {
      blob.push({'name': files[i]});
    }
    res.end(JSON.stringify(blob));
  } else {
    res.end(JSON.stringify({'username': 'no idea'}));
  }
});

app.get('/:user', function(req, res, next) {
  if (! req.isAuthenticated()) {
    res.redirect('/');
  }
  var user = req.params.user;
  var pathname = 'mypages.html';
  var filename = path.join(STATIC_DIR, pathname);
  res.sendfile(filename);
});

app.get('/:user/:page/edit', function(req, res, next) {
  if (! req.isAuthenticated()) {
    res.redirect('/');
  }
  var user = req.params.user;
  var page = req.params.page;
  res.sendfile(path.join(STATIC_DIR, 'editor.html'));
});

app.get('/:user/:project/:file$', function(req, res, next) {
  var user = req.params.user;
  var project = req.params.project;
  var file = req.params.file;
  
  res.sendfile(path.join(USERS_DIR, user, project, file)); // XXX SECURITY
});


app.get('/:user/:project/$', function(req, res, next) {
  var user = req.params.user;
  var project = req.params.project;
  
  function sandboxSendfile(fname) {
    res.sendfile(path.join(USERS_DIR, user, project, fname)); // XXX SECURITY
  }
  console.log('running the project');

  var filename = path.join(USERS_DIR, user, project, 'server.js');
  console.log(filename, path.existsSync(filename));
  if (path.existsSync(filename)) {
    var sandbox = {'console': console, 'sendfile': sandboxSendfile};
    code = fs.readFileSync(filename).toString();
    var retval = vm.runInNewContext(code, sandbox);
    console.log(code);
    if (sandbox['index']) {
      sandbox['index'].call(req, res, next);
    }
  } else {
    console.log("Looking for ", filename, " but couldn't find it");
    res.send(404);
  }
});

app.get('/:user/:page.css$', function(req, res, next) {
  var user = req.params.user;
  var page = req.params.page;
  var file = req.params.file;
  
  res.sendfile(path.join(USERS_DIR, user, page, fname, file)); // XXX SECURITY
});

app.get('/$', function(req, res, next){
  var pathname;
  if (PROD && (! req.isAuthenticated())) { 
    pathname = 'unauthenticated.html';
    var filename = path.join(STATIC_DIR, pathname);
    res.sendfile(filename);
  } else {
    // First, figure out if we have a directory for this user or not
    var uname = req.getAuthDetails().user.username;
    if (! path.existsSync(USERS_DIR)) {
      fs.mkdirSync(USERS_DIR, 0777);
    }
    var userdir = path.join(USERS_DIR, uname);
    console.log("USERDIR", userdir);
    if (! path.existsSync(userdir)) {
      fs.mkdirSync(userdir, 0777);
      
      wrench.copyDirSyncRecursive(SAMPLE_DIR, userdir);
    }
    res.redirect('/'+uname)
  }
});


module.exports = {
  'app': app,
  'redis': redis,
}

app.listen(PORT);
console.log('Thingies started on port '+ PORT);
