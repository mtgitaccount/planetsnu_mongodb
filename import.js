const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');
const es = require('event-stream');

//my mongodb cluster on mogodb Atlas
const uri = "mongodb+srv://martin:Yf2S1umvG0lGFTjD@cluster0-0g6eq.mongodb.net/test?retryWrites=true&w=majority";
const assert = require('assert');


const client = new MongoClient(uri,
                    { useNewUrlParser: true,
                      useUnifiedTopology: true  });

const DBNAME = "planetsnu";
const COLLECTION = "mscore";
const IMPORTFILE =  "data_military_score.txt";    // "testdata_import.txt"

//const readStream =fs.createReadStream(IMPORTFILE);

client.connect(err => {
  const collection = client.db("planetsnu").collection("mscore");
  // perform actions on the collection object

  const db = client.db(DBNAME);

  var lineNr = 0;
  var write_obj = [];

 // read stream line by line
  var s = fs.createReadStream(IMPORTFILE)
      .pipe(es.split())
      .pipe(es.mapSync(function(line){



          lineNr += 1;

          // process line here and call s.resume() when rdy
          // function below was for logging memory usage
          //logMemoryUsage(lineNr);
          //console.log(`Line read: ${line}`);
          let obj = {};
          let obj_arr = line.split(":");
          //console.log(obj_arr);
          let race_arr = obj_arr[0].split("***");
          //console.log(race_arr);


          obj.race = race_arr;
          obj.ship = obj_arr[1];
          obj.engine = obj_arr[2];
          obj.beams = obj_arr[3];

          if(obj_arr.length == 7) { //ship with torps
            obj.torps = obj_arr[4];
            obj.mscore = typeof obj_arr[5] !== "undefined" ? parseInt(obj_arr[5].trim()) : "";
            obj.full = obj_arr[6] == 'FULL' ? true : false;
          }
          else {
            obj.mscore = typeof obj_arr[4] !== "undefined" ? parseInt(obj_arr[4].trim()) : "";
            obj.full = obj_arr[5] == 'FULL' ? true : false;
          }

          write_obj.push(obj);


          if (lineNr == 50000) {
            // pause the readstream
            s.pause();
            //console.log(obj);
            console.log("Adding Data to MonogDB:", lineNr);
              insertDocument(db, write_obj, (result) => {
              //resume reading from stream
              s.resume();
            });

            lineNr = 0;
            write_obj = [];

          }


          // resume the readstream, possibly from a callback
          //s.resume();
      })
      .on('error', function(err){
          console.log('Error while reading file.', err);
      })
      .on('end', function(){
          console.log('Read entire file.');
          if(lineNr > 0){
            insertDocument(db, write_obj, (result) => {
                console.log("Adding last data chunk: ", lineNr);
            });
          }
          client.close();
      })
  );


  //close DB connection
  //insertDocument(db, () => client.close());

});




// insert document
const insertDocument = function(db, obj, callback){
  const collection = db.collection(COLLECTION);

  collection.insertMany( obj, function(err, result) {
    assert.equal(err, null);
    //assert.equal(1, result.result.n);
    //assert.equal(1, result.ops.length);
    //console.log("Inserted one document into the collection");
    callback(result);
    }
  );
}
