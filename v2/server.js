const express = require('express');

var app = express();
var hbs = require('hbs');
var fs = require("fs");
var port = process.env.PORT || 3000;

hbs.registerPartials(__dirname + '/views/partials');


// Using middleware to log how our server is working.
app.use((req, res, next) => {
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

// Maintenance middleware
// app.use((req, res, next) => {
//     res.render('maintenance.hbs');
// });

// Make a partial so we don't have to compute year every time.
hbs.registerHelper('curYear', function (){
    return new Date().getFullYear();
});

hbs.registerHelper('scream', function (txt) {
    return txt.toUpperCase();
});

app.set('view engine', 'hbs');

app.use(express.static(__dirname + '/public'));      // __dirname stores path to project directory. This line tells our app what to serve up.

app.get('/', (req, res) => {     // define the route. We want the home.hbs page loading up at start
    res.render('home.hbs', {
        welcomeTitle: 'Welcome to the site.',
        message: 'This is our pointless site. Well, ok, it is not entirely pointless.',
    });
});

app.get('/about', (req, res) => {
    res.render('about.hbs', {
        pageTitle: 'About Page',
    });
});

// make a route at /bad
// send back JSON with error message
app.get('/bad', (req, res) => {
    res.send({
        error: 'BAD'
    });
});


app.listen(port, () => {
    console.log("Server is up on port " + port);
});
