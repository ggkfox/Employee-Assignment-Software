// Require the Express framework to be included and then store in 
// app variable so we can use the functions associated with Express.
var express = require("express");
var app = express();

app.set("view engine", "ejs");


app.get("/", function (req, res) {
    res.render("home");
});


var port = process.env.PORT || 3000;
var ip = process.env.IP;
app.listen(port, ip, function () {
    console.log("Server is up on port " + port + " and on ip " + ip);
});