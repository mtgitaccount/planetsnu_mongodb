const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');
const es = require('event-stream');
//https://www.youtube.com/watch?v=pKd0Rpw7O48

const express = require('express');
const app = express();
const request = require('request');

//my mongodb cluster on mogodb Atlas
const uri = "mongodb+srv://martin:Yf2S1umvG0lGFTjD@cluster0-0g6eq.mongodb.net/test?retryWrites=true&w=majority";
const assert = require('assert');

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const DBNAME = "planetsnu";
const COLLECTION = "mscore";
const IMPORTFILE = "data_military_score.txt"; // "testdata_import.txt"

let collection = null;
let db = null;
let isDBConnected = false;

//const readStream =fs.createReadStream(IMPORTFILE);



// input validation package - Joi is a class
const Joi = require('joi');

// enable parsing of json objects in the body
// using express middleware
app.use(express.json());

// if an env variable exists we take it, otherwise 3000
const PORT = process.env.PORT || 3000;

const courses = [{
    id: 1,
    name: 'course1'
  },
  {
    id: 2,
    name: 'course2'
  },
  {
    id: 3,
    name: 'course3'
  }
];

//define routes
app.get('/', (req, res) => {
  res.send('Hello World');
});

app.get('/api/courses', (req, res) => {
  res.send(courses);
});


app.post('/api/courses', (req, res) => {

  const schema = {
    name: Joi.string().min(3).required()
  };

  const result = Joi.validate(req.body, schema);

  if (result.error) {
    //400 Bad request
    res.status(400).send(result.error);
    return;
  }
  const course = {
    id: courses.length + 1,
    name: req.body.name
  }
  courses.push(course);
  res.send(course);
});

app.get('/api/courses/:id', (req, res) => {
  const course = courses.find(c => c.id === parseInt(req.params.id));
  if (!course) res.status(404).send('The course with the given ID was not found.'); //404
  res.send(course);
});


//get Forum entries form Planets.nu
//https://api.planets.nu/account/activity?version=2&offset=0&categoryid=3&limit=1000

app.get('/api/nu/:id', (req, res) => {

  const options = {
    url: 'https://api.planets.nu/account/activity?version=2&offset=0&categoryid=3&limit=10',
    gzip: true,
    headers: {
      'User-Agent': 'request'
    }
  };

  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      const info = JSON.parse(body);
      let result = "";
      for (var i = 0; i < info.activity.length; i++) {
        result += "  " + info.activity[i].sourceid;
      }

      res.send(result);
    }
  }

  request(options, callback);

});




app.get('/api/nu/search/:mscore', (req, res) => {

  const schema = {
    mscore: Joi.number().min(1).max(50000).required()
  };

  const input = {
    mscore: req.params.mscore
  };

  const result = Joi.validate(input, schema);
  //console.log(result);

  if (result.error) {
    res.send(result.error);
  } else {
    (async () => {
      const db_result = await searchDB(parseInt(req.params.mscore));
      res.send(db_result);
    })();
  }

});



//connect to db initially
client.connect(err => {

  if (err) {
    console.log("Connection Error:  " + err);
  } else {
    collection = client.db("planetsnu").collection("mscore");
    // perform actions on the collection object
    db = client.db(DBNAME);
    console.log("Open DB Connection:");
    //console.log(db.s)
  }
});


async function searchDB(mscore) {

  return new Promise((resolve, reject) => {

      console.log("1. MongoClient is connected: ", client.isConnected());

      collection.find({
        mscore: mscore
      }).toArray(function(err, result) {

        //console.log(`Result: ${result}`);

        if (err) {
          console.log("to Array Error: " + err);
          //  client.close();
          return reject(err);
        } else {
          console.table(result);
          resolve(layoutResult(result));
          //console.log("Close DB Connection");
        }
      }); //end collection.find
    });
  };


function layoutResult(result) {

  result.sort(function(a, b) {
    if (a.race <= b.race) return -1
    else return 1;
  });

  let html = '<table>';
  html += '<tr><th>Nr.</th><th>Race</th><th>Hull</th><th>Engines</th>';
  html += '<th>Beams</th><th>Torps</th><th>Fully built</th><th>MScore</th></tr>';

  for (var i in result) {
    html += '<tr>';
    html += `<td>${i}</td>`;
    html += `<td>${result[i].race}</td>`;
    html += `<td>${result[i].ship}</td>`;
    html += `<td>${result[i].engine}</td>`;
    html += `<td>${result[i].beams}</td>`;
    html += `<td>${result[i].torps}</td>`;
    html += `<td>${result[i].full}</td>`;
    html += `<td>${result[i].mscore}</td>`;
    html += '</tr>';
  }

  html += '</table>';

  return html;
}




app.listen(PORT, () => console.log(`Listening on Port ${PORT}`));
