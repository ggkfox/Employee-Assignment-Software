// Require the Express framework to be included and then store in 
// app variable so we can use the functions associated with Express.
var express = require("express");
var app = express();

// File system
var fs = require("fs");

// The purpose of this middleware is to log our server activity for debugging
// purposes. All activity will be stored in server.log

//For some odd reason, this has to be at the very top. I am not sure why.
app.use(function (req, res, next) {
    var now = new Date().toString();
    var log = `${now}: ${req.method} ${req.url}`;       // Gives time stamp, the type of request, and url
    
    console.log(log);
    fs.appendFile('server.log', log + '\n', function (err) {
        if (err) {
            console.log('Unable to append to server.log');
        }
    });
    next();
});

// default view engine so we don't need to constantly type ".ejs"
app.set("view engine", "ejs");


// Maintenance middleware. This needs to be commented out when the site is live.
// This must always be the FIRST route.
// app.use(function (req, res, next) {
//     res.render('maintenance');
// });


// Home page
app.get("/", function (req, res) {
    res.render("home");
});


// About page
app.get('/about', function (req, res) {
    res.render('about');
});


// With this, our app won't crash when trying to access a route/link that doesn't
// exist. We will serve up a template.
// This must always be the last route otherwise it will always load before other
// routes.
app.get("/*", function(req, res) {
    res.render("unknown");
});



var port = process.env.PORT || 3000;
var ip = process.env.IP;
app.listen(port, ip, function () {
    console.log("Server is up on port " + port + " and on ip " + ip);
});