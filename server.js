const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});
mongoose.set('useFindAndModify', false);

app.use(cors())
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



// creating users model
let Schema = mongoose.Schema;
let userPrototype = new Schema({
  username: String,
  exercise: [{}],
  counter: Number
});

let User = mongoose.model('User', userPrototype);


let arrUsers = [];


// Post new user endpoint
app.post("/api/exercise/new-user", function(req, res) {
  
  let user1 = new User({username: req.body.username, counter: 0});
  
  user1.save((err, data) => {
    if (err) {
      console.log(err);
      return err;
    } else {
      arrUsers.push({username: data.username, _id: data._id});
      res.json({username: data.username, _id: data._id});
    }
  });
  
});

// Get array of all users in db
app.get("/api/exercise/users", function(req, res) {
  res.json(arrUsers);
});

// Post exercise
app.post("/api/exercise/add", function(req, res) {
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = new Date(req.body.date);
  
  if(date != "Invalid Date") {
    date = date.toUTCString();
  } else {
    date = new Date().toUTCString();
    res.json({userId: userId, description: description, duration: duration, date: date});
  }
  
  // Find by id and add exercise
  User.findOne({_id: userId}, function (err, data) {
    if (err) {return err};
    data.counter = data.counter + 1;
    data.exercise.push({description: description, duration: duration, date: date});
    data.save(function(err, data) {
      if (err) {
        console.log("An error has occurred");
        return err;
      } else {
        res.json({userId: userId, description: description, duration: duration, date: date});
      }
    });
  });
  
});

app.get("/api/exercise/log", function(req, res) {
  let userId = req.query.id;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  
  if (from != undefined && new Date(from) != "Invalid Date") {
    from = new Date(from);
  }
  if (to != undefined && new Date(to) != "Invalid Date") {
    to = new Date(to);
  }
  if (limit != undefined) {
    limit = limit;
  }
  
  User.findOne({_id: userId}, function (err, data) {
    if (err) {return err};
    let count = data.counter;
    data.exercise.push({counter: count});
    
    let newLog = data.exercise;
    for (let i = 0; i < data.exercise.length; i++) {
      if (new Date(data.exercise[i].date) < from) {
        newLog.splice(i, 1);
        i = -1;
        newLog[newLog.length-1].counter -= 1;
      } else if (to != undefined && new Date(data.exercise[i].date) > from && new Date(data.exercise[i].date) > to) {
        newLog.splice(i, 1);
      }
    }
    
    if (limit != undefined) {
      newLog.splice(0, limit);
      if (newLog.length == limit) {
        newLog = newLog;
      } else {
        newLog[newLog.length-1].counter -= limit;
      }
    }
    
    res.json(newLog);
  });
  
});



// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
