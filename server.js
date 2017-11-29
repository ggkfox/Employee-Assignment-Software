// app variable so we can use the functions associated with Express.
var express = require("express");
var bodyParser = require("body-parser"); // Added to allow posting of json data
var xlsx = require("node-xlsx");
var fileUpload = require("express-fileupload");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var session = require("express-session");
var flash = require("connect-flash");
var app = express();


// process.env.DBURL="mongodb://localhost/lifeguard";
console.log(process.env.DBURL);

// var db = "mongodb://localhost/lifeguard";
var db = process.env.DBURL || "mongodb://localhost/lifeguard";
var sessionStore = require("connect-mongo")(session);

require("./passport-local")(passport); // configure passport

// Mongoose allows us an easy way to get our app to interact with our MongoDB
// database.
var mongoose = require("mongoose");
mongoose.connect(db);

//Added schema for how the schedules are stored in the database
var scheduleSchema = new mongoose.Schema(
  {
    filled: Boolean,
    name: String,
    userId: String,
    placements: [
      {
        stationName: String,
        employees: [
          {
            fname: String,
            lname: String,
            id: String
          }
        ]
      }
    ]
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Add schema for employees
var employeeSchema = new mongoose.Schema(
  {
    fname: String,
    lname: String,
    userId: String,
    id: String
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

var User = require("./userModel");

//Creates an instance of mongodb model from Schema
var Schedule = mongoose.model("Schedule", scheduleSchema);

var Employee = mongoose.model("Employee", employeeSchema);

//These two lines clear the database
// Schedule.collection.drop();
// Employee.collection.drop();

// File system
var fs = require("fs");

// The purpose of this middleware is to log our server activity for debugging
// purposes. All activity will be stored in server.log

// This has to be at the very top above all the routes because it must be running
// before we run routes. If we call this block of code after a defined route, it
// won't run.
app.use(function(req, res, next) {
  var now = new Date().toString();
  var log = `${now}: ${req.method} ${req.url}`; // Gives time stamp, the type of request, and url

  console.log(log);
  fs.appendFile("server.log", log + "\n", function(error) {
    if (error) {
      console.log("Unable to append to server.log");
    }
  });
  next();
});

// allows file uploads
app.use(fileUpload());

app.use(flash()); // use connect-flash for flash messages stored in session

//express/mongo session storage
app.use(
  session({
    secret: "k&*89ASDAS",
    store: new sessionStore({
      url: db,
      collection: "sessions"
    })
  })
);

app.use(passport.initialize()); // start passport
app.use(passport.session()); // persistent login sessions

// enable bodyParser application/json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser("secretString"));

//Process "remember me"
app.use(function(req, res, next) {
  if (req.method == "POST" && req.url == "/login") {
    console.log(req.body.rememberme);
    if (req.body.rememberme) {
      req.session.cookie.maxAge = 2592000000; // 30*24*60*60*1000 Rememeber 'me' for 30 days
    } else {
      req.session.cookie.expires = false;
    }
  }
  next();
});

// Tells Express that we have assets in these folders so it knows where to look.
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/bower_components"));

// default view engine so we don't need to constantly type ".ejs"
app.set("view engine", "ejs");

// Maintenance middleware. This needs to be commented out when the site is live.
// This must always be the FIRST route because it will override all other routes
// when it is uncommented.
//app.use(function (req, res, next) {
//    res.render('maintenance');
//});

//Bulk update / insert
/**
 * Bulk-upsert an array of records
 * @param  {Array}    records  List of records to update / insert
 * @param  {Model}    Model    Mongoose model to update
 * @param  {Object}   match    Database field to match
 * @return {Promise}  always resolves a BulkWriteResult
 */
function upsertMany(records, Model, match) {
  match = match || "id";
  return new Promise(function(resolve, reject) {
    var bulk = Model.collection.initializeUnorderedBulkOp();
    records.forEach(function(record) {
      var query = {};
      query[match] = record[match];
      bulk
        .find(query)
        .upsert()
        .updateOne(record);
    });
    bulk.execute(function(error, bulkres) {
      if (error) return reject(error);
      resolve(bulkres);
    });
  });
}

//Bulk Update.
function updateMany(records, Model) {
  return new Promise(function(resolve, reject) {
    var bulk = Model.collection.initializeUnorderedBulkOp();
    records.forEach(function(record) {
      var query = { _id: record._id };
      bulk.find(query).updateOne(record);
    });
    bulk.execute(function(error, bulkres) {
      if (error) return reject(error);
      resolve(bulkres);
    });
  });
}

// route middleware to make sure user is logged in
function isLoggedIn(req, res, next) {
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated()) return next();

  // if they aren't redirect them to the login page
  res.redirect("/login");
}

// LOGIN
// show the login form
app.get("/login", function(req, res) {
  // render the page and pass in any flash data if it exists
  res.render("login", { message: req.flash("loginMessage") });
});

// process the login form
app.post(
  "/login",
  passport.authenticate("local-login", {
    successRedirect: "/about", // redirect to the secure profile section
    failureRedirect: "/login", // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  })
);

// SIGNUP
// show the signup form
app.get("/signup", function(req, res) {
  // render the page and pass in any flash data if it exists
  res.render("signup", { message: req.flash("signupMessage") });
});

// process the signup form
app.post(
  "/signup",
  passport.authenticate("local-signup", {
    successRedirect: "/about", // redirect to the secure profile section
    failureRedirect: "/signup", // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  })
);

app.get("/nextRotationName", isLoggedIn, function(req, res) {
  Schedule.collection.count({ userId: req.user.id }, function(error, count) {
    if (error) {
      return res.status(500).send("failed");
    }
    var name = "Rotation " + (count + 1);
    res.json({ name });
  });
});

app.post("/upload", isLoggedIn, function(req, res) {
  if (!req.files) return res.status(400).send("No files were uploaded.");
  try {
    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let employeeList = req.files.employeeList;

    // Parse a buffer
    const workSheetsFromBuffer = xlsx.parse(employeeList.data);

    // only consider first worksheet
    const worksheet = workSheetsFromBuffer[0];
    // get employee info,
    var employees = worksheet.data
      .filter(function(employee) {
        //ignore the title row, also ignore subsequent empty rows
        return !(employee[0] == "id" || employee[0] == undefined);
      })
      .map(function(employee) {
        var id = employee[0];
        var fname = employee[1];
        var lname = employee[2];
        return {
          id: id.toString(),
          fname: fname,
          lname: lname,
          userId: req.user.id
        };
      });

    upsertMany(employees, Employee, "id")
      .then(function(bulkRes) {
        console.log(bulkRes);
        res.send("File uploaded!");
      })
      .catch(error => {
        return res.status(500).send("Upload failed");
      });
  } catch (e) {
    return res.status(500).send("upload failed");
  }
});
// Home page
app.get("/", function(req, res) {
  res.render("home", {
    user: req.user // get the user out of session and pass to template
  });
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/signup", function(req, res) {
  res.render("signup");
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/error", function(req, res) {
  res.render("error");
});

// About page
app.get("/about", isLoggedIn, function(req, res) {
  res.render("about", {
    user: req.user // get the user out of session and pass to template
  });
});

app.post("/register", function(req, res) {
  res.send("register post route");
});

//returns a list of all the schedules defined in the database
app.get("/schedules", isLoggedIn, function(req, res) {
  Schedule.find({ userId: req.user.id })
    .sort("-created_at")
    .exec(function(error, schedules) {
      if (error) {
        console.log({ error });
        return res.status(500).send("Error Occurred");
      }
      Employee.collection.count(null, function(error, count) {
        if (error) {
          return res.status(500).send("failed");
        }
        return res.json({
          schedules: schedules.map(function(schedule) {
            var filled = true;
            var sched = schedule.toObject();
            if (schedule.filled) {
              sched.placements = sched.placements.map(function(placement) {
                if (placement.employees.length <= 0) {
                  return Object.assign({}, placement, {
                    employees: [{ fname: "Empty", lname: "" }]
                  });
                }
                return placement;
              });
            }

            return sched;
          }),
          employeeCount: count
        });
      });
    });
});

app.post("/generateSchedule", isLoggedIn, function(req, res) {
  // find latest schedule where filled == undefined
  Schedule.find(
    {
      // "placements.employees": { $exists: true, $eq: [] },
      filled: false,
      userId: req.user.id
    },
    function(error, unfilled_schedules) {
      if (error) {
        console.log("error", { error });
        return res.status(500).send("Error occurred");
      }
      if (!unfilled_schedules || unfilled_schedules.length == 0) {
        return res.json({ status: "No free schedule" });
      }

      var stations = [];

      //Treat each station in different schedules differently
      unfilled_schedules.forEach(function(sched) {
        sched.placements.forEach(function(placement) {
          stations.push({
            shedule: sched,
            name: placement.stationName,
            capacity: 1
          });
        });
      });

      //Employees are now stored in database
      Employee.find({ userId: req.user.id }).exec(function(error, employees) {
        console.log({ stations, employees });
        if (error) {
          console.log("error", { error });
          return res.status(500).send("Error occurred");
        }

        //Get all previous schedules
        Schedule.find({ userId: req.user.id }).exec(function(error, schedules) {
          if (error) {
            console.log({ error });
            return res.status(500).send("Error Occurred");
          }
          schedules = schedules || [];
          // for each employee and sum up their visits to each station
          employees.forEach(function(employee) {
            //  calculate visits;
            schedules.forEach(function(schedule) {
              //only use stations that exist in the database already
              schedule.placements = schedule.placements.filter(function(
                placement
              ) {
                var stationExists = null;
                stations.forEach(function(station) {
                  stationExists =
                    stationExists || station.name == placement.stationName;
                });
                return stationExists;
              });

              // go through all station placements and add counts to employee for each that has been visited
              schedule.placements.forEach(function(placement) {
                placement.employees.filter(function(semployee) {
                  if (employee.id == semployee.id) {
                    if (!employee.placements) employee.placements = {};
                    //increase count (number of placements) of an employee to a given station i.e. "Station A" : 1
                    employee.placements[placement.stationName] =
                      (employee.placements[placement.stationName] || 0) + 1;
                  }
                });
              });
            });
          }, this);

          //compute employee priority
          employees.forEach(function(employee) {
            employee.placements = employee.placements || [];

            var placements = employee.placements;

            var highestNumber = 0;
            var lowestNumber = 0;
            var highest = null;
            var lowest = null;
            var priority = -1;

            //Add zero placements to where employee has never been.
            stations.forEach(function(station) {
              if (!placements[station.name]) {
                placements[station.name] = 0;
              }
            });

            //go through each placement to get the highest and lowest
            Object.keys(placements).forEach(function(key) {
              var value = placements[key];
              if (value > highestNumber) {
                highestNumber = value;
                highest = key;
              }

              //Takes care of when lowest numbers grow
              if (lowestNumber == 0) {
                lowestNumber = value;
              }
              if (value <= lowestNumber) {
                lowestNumber = value;
                lowest = key;
              }
            });
            // priority is the highest - lowest
            priority = highestNumber - lowestNumber;
            employee.highest = highest;
            employee.lowest = lowest;
            employee.priority = priority;
          });

          //sort employees based on priority
          employees = employees.sort(function(employeeA, employeeB) {
            return employeeA.priority < employeeB.priority;
          });

          // console.log("sorted", { employees });

          //Start placement of employees
          employees.forEach(function(employee) {
            // prefer to place employee in the place they are needed the most
            // i.e. place with least visits by said employee
            var preferred = employee.lowest;
            var preferredstation = null;

            // if we have a preferred place .. place the employee there
            if (preferred) {
              preferredstation = stations.find(function(station) {
                return station.name == preferred;
              });

              if (!preferredstation.placements) {
                preferredstation.placements = [];
              }

              if (
                preferredstation.placements.length <
                  preferredstation.capacity &&
                !employee.placed
              ) {
                preferredstation.placements.push(employee);
                employee.placed = true;
              } else {
                // go through rest of stations and place employee, since preferred is full
                stations
                  .filter(function(station) {
                    return station.name != preferredstation.name;
                  })
                  .forEach(function(station) {
                    if (!station.placements) {
                      station.placements = [];
                    }
                    //place the employee in a slot
                    if (
                      station.placements.length < station.capacity &&
                      !employee.placed
                    ) {
                      station.placements.push(employee);
                      employee.placed = true;
                    }
                  });
              }
            } else {
              //no preferred station, lets just place them in the next available slot
              stations.forEach(function(station) {
                if (!station.placements) {
                  station.placements = [];
                }
                if (
                  station.placements.length < station.capacity &&
                  !employee.placed
                ) {
                  station.placements.push(employee);
                  employee.placed = true;
                }
              });
            }
          });

          //Take care of empty stations
          stations.forEach(function(station) {
            if (!station.placements) {
              station.placements = [];
            }
          });

          console.log("Placements Done", { stations });

          //Save all placements to Database... call it schedule X, where X is the next number... based on records in database

          var newName = "Rotation" + (schedules.length + 1);

          unfilled_schedules.forEach(function(schedule) {
            schedule.filled = true;
            schedule.userId = req.user.id;

            var station_placements = stations.filter(function(station) {
              return station.shedule.id == schedule.id;
            });
            schedule.placements = station_placements.map(function(station) {
              return {
                stationName: station.name,
                employees: station.placements.map(function(employee) {
                  return {
                    fname: employee.fname,
                    lname: employee.lname,
                    id: employee.id
                  };
                })
              };
            });
          });

          //save all

          updateMany(unfilled_schedules, Schedule)
            .then(function(bulkRes) {
              console.log(bulkRes);
              return res.json({ status: "success" });
            })
            .catch(function(error) {
              return res.status(500).send("failed");
            });
        });
      });
    }
  );
});

// Captures submission of schedule list
app.post("/saveRotation", isLoggedIn, function(req, res) {
  var name = req.body.name;
  var stations = req.body.stations.map(function(station) {
    station.capacity = parseInt(station.capacity);
    return station;
  });

  var schedule = new Schedule({
    name: name,
    userId: req.user.id,
    filled: false,
    placements: stations.map(function(station) {
      return {
        stationName: station.name,
        employees: []
      };
    })
  });
  schedule.save(function(error) {
    if (error) {
      return res.status(500).send("failed");
    }
    return res.json({ status: "success" });
  });
});

// With this, our app won't crash when trying to access a route/link that doesn't
// exist. We will serve up a template.
// This must always be the last route otherwise it will always load before other
// routes.
app.get("/*", function(req, res) {
  res.render("unknown", {
    user: req.user // get the user out of session and pass to template
  });
});

var port = process.env.PORT || 3000;
var ip = process.env.IP;
app.listen(port, ip, function() {
  console.log("Server is up on port " + port + " and on ip " + ip);
});
