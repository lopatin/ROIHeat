
// Express framework
var express = require('express');
var app = express.createServer();
app.listen(8080);

// Socket.io
var io = require('socket.io').listen(app);

// Templates
app.set('view engine', 'mustache');
app.register('.mustache', require('stache'));
app.use(express.static(__dirname + '/public'));

// Sessions
var RedisStore = require('connect-redis')(express);
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
    secret: "Trolololo",
    store: new RedisStore
}));

// Database
var Mongolian = require('mongolian');
var dbServer = new Mongolian;
var db = dbServer.db('roiheat');
var ObjectId = require('mongolian').ObjectId;

// DB collections (Like SQL tables)
var projects = db.collection('projects');
var pageviews = db.collection('pageviews');
var users = db.collection('users');

/**
 * Backend socket.io stuff to get and send data
 */

var lastSocket, lastHeatmap;

io.sockets.on('connection', function(socket){
    /*
     * Socket.io connections for webmasters
     */
     
    // This method returns all projects for the user
    socket.on('projects', function(){
        console.log("Projects requested");
        lastSocket = socket;
        projects.find().forEach(function(project){
            console.log(project._id);
            pageviews.find({projectID: ""+project._id}).toArray(function(err, pvs){
                project.pageviews = pvs;
                socket.emit('project', project);
            });
        });
    });
    
    socket.on('addProject', function(project) {
        projects.insert(project, function(err, p){
            console.log(p);
            socket.emit('addedProject', p);
        });
    });
    
    
    /*
     * Heatmap functions
     */
    socket.on('getHeatmapCoords', function(req_data){
        console.log("heatmap request");

        var coordsData = [];
        pageviews.find().toArray(function(err, pageviewsArray){
            for(i in pageviewsArray){
                for(j in pageviewsArray[i].mousePoints)
                    coordsData.push({x: pageviewsArray[i].mousePoints[j].position.x, y: pageviewsArray[i].mousePoints[j].position.y, count: 1});
            }
            lastHeatmap = socket;
            socket.emit('heatmapCoords', coordsData);
        });
    
    });

    
    /*
     * Socket.io connections for end users being tracked
     */
    socket.emit('connected_client');

    socket.on('connected_client', function(data){
        socket.emit('confirm_client_connection');
        console.log("new connection from: " + socket.handshake.address.address);
        console.log(socket.handshake.headers);
        pageviews.insert({
            time: socket.handshake.time,
            ip: socket.handshake.address.address,
            url: data.url,
            title: data.title,
            projectID: data.projectID,
            userAgent: socket.handshake.headers['user-agent']
        }, 
        function(err, pageview){
            console.log("HIIIII");
            console.log(pageview._id);
            socket.set('pageview', pageview);
            
            //if(lastSocket)
               // lastSocket.emit('new_pageview', pageview);
        });
    });

    // Log click data
    socket.on('click', function(data){
        var clickdata = data;
        clickdata.time = new Date();
        
        // Get current pageview
        socket.get('pageview', function(err, pageview){
            pageviews.update({_id: pageview._id}, {$push: {'clicks': clickdata}});
        });
    });
    
    // Log hover data
    socket.on('mousePoint', function(data){
        var mousePointData = data;
        mousePointData.time = new Date();
        socket.get('pageview', function(err, pageview){
            pageviews.update({_id: pageview._id}, {$push: {'mousePoints': mousePointData}});
        });
        console.log(data.position.x);
        if(lastHeatmap)
            lastHeatmap.emit('singlePoint', {x: data.position.x, y: data.position.y});
    });
    
});

/*
 * Web server stuff to serve UI pages
 */

// Test page, shits not working
app.get('/test', function(req, res){
    res.send("working");
});

// Index page
app.get('/dashboard', function(req, res){
    // Redirect to landing page if not logged in
    if(!req.session.loggedIn)
        res.redirect("/");
        /*res.render('index',{
            locals: {
                title: "Welcome to ROIHeat",
                loggedIn: req.session.loggedIn
            }
        });*/
    // Otherwise show dashboard
    else
        pageviews.find().toArray(function(err, pageviewsArray){
        res.render('dashboard', {
            locals: {
                title: "Your ROIHeat Dashboard",
                loggedIn: req.session.loggedIn,
                username: req.session.user.username,
                pageviews: pageviewsArray
            }
        });
        });
});
 

// Register page
app.get('/register', function(req, res){
    if(req.session.loggedIn)
        res.redirect('/');
    else
        res.render('register', {
            locals: {
                title: "Register to ROIHeat for free",
                loggedIn: req.session.loggedIn
            }
        });
});

// Register action
app.post('/register', function(req, res){
    var body = req.body;
    body.joinDate = new Date();
    users.insert(body, function(err, user){
        req.session.loggedIn = true;
        req.session.user = user;
        res.redirect('/');
    });
});

// Login page
app.get('/login', function(req, res){
    if(req.session.loggedIn)
        res.redirect('/dashboard');
    else
        res.render('login', {
            locals: {
                title: "Login",
                loggedIn: req.session.loggedIn
            }
        });
});

// Login action
app.post('/login', function(req, res){
    console.log('wanna login ' + req.body.username);
    users.findOne({username: req.body.username, password: req.body.password}, function(err, user){
        console.log('found something');
        if(user != null){
            // Successful login
            req.session.loggedIn = true;
            req.session.user = user;
        } else {
            // Login failed
            console.log("Login failed");
            req.session.loggedIn = false;
            req.session.user = null;
        }
    

        res.redirect('/dashboard');
    });

});

// Logout action
app.get('/logout', function(req, res){
    req.session.loggedIn = false;
    req.session.user = null;
    res.redirect('/dashboard');
});

// View the JSON contents of any supported collection in MongoDB
app.get('/view/:collection', function(req, res){
    
    // Select correct collection
    var collection = null;
    if(req.params.collection == 'pageviews')
        collection = pageviews;
    if(req.params.collection == 'projects')
        collection = projects;
    
    var resStr = "";    // Initialize return string
    if(collection != null){
        // Loop through all members of collection and add to return string
        collection.find().toArray(function(err, array){
            for(i in array)
                resStr += JSON.stringify(array[i]) + "<br>";
            res.send(resStr);
        });
    }
    // Or return error message
    else
        res.send("Collection '" + req.params.collection + "' does not exist or cannot be viewed");
});


app.get('/delete/pageviews', function(req, res){
    pageviews.remove({});
    res.send("deleted");
});














