// Require the Express framework to be included and then store in
// app variable so we can use the functions associated with Express.
var express = require("express");
var bodyParser = require("body-parser"); // Added to allow posting of json data

var app = express();

// Mongoose allows us an easy way to get our app to interact with our MongoDB
// database.
var mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/lifeguard");

//Added schema for how the schedules are stored in the database
var scheduleSchema = new mongoose.Schema(
  {
    name: String,
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

//Creates an instance of mongodb model from Schema
var Schedule = mongoose.model("Schedule", scheduleSchema);

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
  fs.appendFile("server.log", log + "\n", function(err) {
    if (err) {
      console.log("Unable to append to server.log");
    }
  });
  next();
});

// enable bodyParser application/json
app.use(bodyParser.json());

// Tells Express that we have assets in these folders so it knows where to look.
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/bower_components"));

// default view engine so we don't need to constantly type ".ejs"
app.set("view engine", "ejs");

// Maintenance middleware. This needs to be commented out when the site is live.
// This must always be the FIRST route because it will override all other routes
// when it is uncommented.
// app.use(function (req, res, next) {
//     res.render('maintenance');
// });

// Home page
app.get("/", function(req, res) {
  res.render("home");
});

// About page
app.get("/about", function(req, res) {
  res.render("about");
});

//returns a list of all the schedules defined in the database
app.get("/schedules", function(req, res) {
  Schedule.find().exec(function(err, schedules) {
    if (err) {
      console.log({ err });
      res.status(500).send("Error Occurred");
    }
    return res.json(
      schedules.map(function(schedule) {
        return schedule.toObject();
      })
    );
  });
});

// Captures submission of schedule list
app.post("/saveSchedule", function(req, res) {
  var stations = req.body.stations.map(function(station) {
    station.capacity = parseInt(station.capacity);
    return station;
  });

  var employees = req.body.employees;
  console.log({ stations, employees });

  //Get all previous schedules
  Schedule.find().exec(function(err, schedules) {
    if (err) {
      console.log({ err });
      res.status(500).send("Error Occurred");
    }
    schedules = schedules || [];
    // for each employee and sum up their visits to each station
    employees.forEach(function(employee) {
      //  calculate visits;
      schedules.forEach(function(schedule) {
        //only use stations that exist in the database already
        schedule.placements = schedule.placements.filter(function(placement) {
          var stationExists = null;
          stations.forEach(function(station) {
            stationExists = stationExists || station.name == placement.stationName;
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

        if (preferredstation.placements.length < preferredstation.capacity && !employee.placed) {
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
              if (station.placements.length < station.capacity && !employee.placed) {
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
          if (station.placements.length < station.capacity && !employee.placed) {
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
    
    var newName = "Schedule " + (schedules.length + 1);

    var schedule = new Schedule({
      name: newName,
      placements: stations.map(function(station) {
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
      })
    });
    schedule.save(function(err) {
      if (err) {
        console.log("error", { err });
      }
      res.json({ status: "success" });
    });
  });
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
app.listen(port, ip, function() {
  console.log("Server is up on port " + port + " and on ip " + ip);
});
