const express = require("express");
const cors = require('cors');
const fileUpload = require('express-fileupload');
const bodyParser = require("body-parser");
const fs = require("fs");
const https = require('https');
const pathToJSON = './highscores.json'
const highScores = require(pathToJSON);
// const PORT = process.env.PORT || 4000;
const app = express();
const pathToLastPostNumber = './postNumber.txt'

// this is all EXCEL parsing below:

const reader = require('xlsx')
const file = reader.readFile('./mosmonmosh.xlsx')
const sheets = file.Sheets;
let sheetnames = file.SheetNames.slice(10, 24);
let pokedex = sheets["Pokédex"];
let dexrange = reader.utils.decode_range(pokedex['!ref']); // get the range


app.use(cors({ credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Helper function that enters string (column D on the sheet) and looks up the mon.
function infoLookUp(mon){
  console.log(mon)
  for (let rowNum = dexrange.s.r; rowNum <= dexrange.e.r; rowNum++) {
    const look = pokedex[reader.utils.encode_cell({r: rowNum, c: 8})];
    if (look.v === mon) {
      console.log('We found a ' + mon)
      let name = pokedex[reader.utils.encode_cell({r: rowNum, c: 8})].v
      let pts = pokedex[reader.utils.encode_cell({r: rowNum, c: 5})].v
      let type1 = pokedex[reader.utils.encode_cell({r: rowNum, c: 9})].v
      let type2 = null;
      try {
        type2 = pokedex[reader.utils.encode_cell({r: rowNum, c: 10})].v
      }
      catch (e) {
        console.log(e)}
      let hp = pokedex[reader.utils.encode_cell({r: rowNum, c: 11})].v
      let atk = pokedex[reader.utils.encode_cell({r: rowNum, c: 12})].v
      let def = pokedex[reader.utils.encode_cell({r: rowNum, c: 13})].v
      let spa = pokedex[reader.utils.encode_cell({r: rowNum, c: 14})].v
      let spd = pokedex[reader.utils.encode_cell({r: rowNum, c: 15})].v
      let spe = pokedex[reader.utils.encode_cell({r: rowNum, c: 16})].v
      let ability1 = pokedex[reader.utils.encode_cell({r: rowNum, c: 17})].v
      let ability2 = null;
      let ability3 = null;
      try {
        ability2 = pokedex[reader.utils.encode_cell({r: rowNum, c: 18})].v
      }
      catch (e){
        console.log(e)}
      try {
        ability3 = pokedex[reader.utils.encode_cell({r: rowNum, c: 19})].v
      }
      catch (e){
        console.log(e)}
      let returnedMon = {name: name, pts: pts, type1: type1, type2: type2, hp: hp, atk: atk, def: def,spa: spa, spd: spd, spe: spe, ability1: ability1, ability2: ability2, ability3: ability3 }
      console.log(returnedMon.spd)
      return returnedMon;
    }
  }

  return 0;
}

app.get("/coaches", (req, res) => {
  let coachList = [];
  for (let i = 0; i < sheetnames.length; i++) {
    let tempSheet = sheets[sheetnames[i]]
    let coach_name = tempSheet["B12"]["v"];
    let team_name = tempSheet["B2"]["v"];
    let win_loss = tempSheet["F14"]["v"]
    let mons= reader.utils.sheet_to_json(tempSheet,{range: "M3:M11", blankrows: false });
    let matchups = reader.utils.sheet_to_json(tempSheet,{range: "B17:F24", blankrows: false });
    let realMons = []
    for (let j = 0; j < mons.length; j++) {
      let tempKey = mons[j].Pokémon;
      let tempMon= infoLookUp(tempKey);
      console.log(tempMon)
      realMons[j] = tempMon;
    }
    let json_body = {coachNum : i, coachName : coach_name, teamName: team_name, winLoss: win_loss, mons: realMons, matchups: matchups }
    coachList[i] = json_body;
  }
  console.log(coachList[2].mons)
  res.json(coachList);
})



// rate limiter.
// const limiter = require("./middleware/rateLimiter");
// app.use(limiter);


// EVERYTHING below this line is for /b/.

// helper functions. when i get off my ass writePost() will be here too.
function readPost(){
  let lastPost = fs.readFileSync(pathToLastPostNumber);
  lastPost = lastPost.toString();
  return lastPost
}
function addPost(){
  fs.writeFile(pathToLastPostNumber, String(lastPostNumber), err => {
    console.log('e')
  })

}
let lastPostNumber = Number(readPost());
// for images
const multer = require('multer')
const xlsx = require("xlsx");
const {lookup} = require("mime-types");
const {log} = require("debug");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images/')
  },
  filename: (req, file, cb) => {
    cb(null, String(lastPostNumber) + ".png")
  },
})
const upload = multer({storage: storage })

app.use('/fuggosimageworld', express.static('images'))

app.post('/api/images', upload.single('file'), function (req, res) {
  console.log(req.originalName)
  res.json({})
})

// request the main page of topics from the server
app.post("/postNumber/", (req, res) => {
  // let onPage = req.body.postPage;
  // onPage = onPage*10;
  // let pageReturned = (highScores.slice(onPage, onPage+9))
  // console.log(pageReturned);
  res.json(highScores);
});

// request a page of posts, including replies, from the server
app.post('/pageInfo', function (req, res) {
  let checkPost = req.body;
  checkPost = checkPost.pageLoc;
  checkPost = Number(checkPost);
  for (let i = 0; i < highScores.length; i++) {
    if (highScores[i].postNumber === checkPost) {
      res.json(highScores[i]);
    }
  }
})
// Takes the reply from the server, checks list of posts, adds the reply to the post with correct pageloc. sends the post to top of list if bumped.
app.post('/submitReply', function (req, res) {
  let checkPost = req.body;
  let ip_address = req.socket.remoteAddress;
  if (checkPost.replyBody.length < 2000) {
    for (let i = 0; i < highScores.length; i++) {
      if (highScores[i].postNumber === Number(req.body.pageLoc)) {
        addPost();

        //date here
        let timePosted = new Date();

        checkPost.postTime = timePosted;
        // this is where the problem is clearly.
        let tempNo = lastPostNumber;
        lastPostNumber += 1;
        console.log("we're here: " + tempNo)
        checkPost["postNumber"] = tempNo;
        checkPost.ip = ip_address;
        highScores[i].postReplies.push(checkPost);
        let temp = highScores[i];
        highScores.splice(i, 1)
        highScores.unshift(temp)
        res.json(highScores[i].postReplies);
      }
    }
    fs.writeFile(pathToJSON, JSON.stringify(highScores), err => {
      if (err) {
        console.log('Error', err)
      } else {
        console.log('Post has been logged.')
      }
    })
  }
  else {      res.json("Post too long - Try again!");
  }
  addPost();
})

// submit a post topic to the server
app.post('/submit', function (req, res) {
  let newScore = req.body;
  let ip_address = req.socket.remoteAddress;
  console.log(ip_address)

  //date here
  let timePosted = new Date();
  newScore["timePosted"] = timePosted;
  newScore["userIP"] = ip_address;
  newScore["postNumber"] = lastPostNumber;
  lastPostNumber +=1;
  newScore["postReplies"] = [];
  if (req.body.postBody.length < 3000) {
    highScores.unshift(newScore)
    fs.writeFile(pathToJSON, JSON.stringify(highScores), err => {
      if (err) {
        console.log('Error', err)
      } else {
        console.log('Post has been logged.')
        res.send(newScore.postNumber.toString())

      }

    });
  }
  if (highScores.length > 3000){
    highScores.pop();
  }
  console.log(newScore);

  addPost();

})

// delete either a post or a reply. works with both.
app.post('/delete', function (req, res) {
  let checkPost = req.body;

  if (checkPost.isReply){
    console.log(req.socket.remoteAddress + " is requesting to delete post number " + checkPost.motherPost + " which was written by the IP : " + req.ip)

    for (let i = 0; i < highScores.length; i++) {
      if (highScores[i].postNumber === Number(req.body.motherPost)) {
        for (let j =0; j < highScores[i].postReplies.length; j++) {
          if (highScores[i].postReplies[j].postNumber === Number(req.body.postNumber)){
            console.log(req.socket.remoteAddress + " ______ " + highScores[i].userIP)
            console.log(highScores[i].postReplies[j] + "has been deleted.");
            let checkReplyIP = String(highScores[i].postReplies[j].ip);
            let checkUserIP = String(req.ip);
            if (checkUserIP === checkReplyIP || checkUserIP === "::ffff:199.7.157.121") {
              highScores[i].postReplies.splice(j, 1);
              console.log("Success! ; " + checkReplyIP + " is the same as " + checkUserIP)
            }
            else (console.log("error ; " + checkReplyIP + " is not the same as " + checkUserIP))

          }
        }
      }}
    fs.writeFile(pathToJSON, JSON.stringify(highScores), err => {
      if (err) {
        console.log('Error', err)
      } else {
        console.log('Post has been deleted.')
      }
    })
  }
  else if (!checkPost.isReply) {

        for (let i = 0; i < highScores.length; i++) {
          if (highScores[i].postNumber === Number(req.body.postNumber)) {
            console.log("hit!")
            console.log("the post of this IP is " + highScores[i].userIP +" and the deletor is " + req.ip);
            if (req.body.ip === highScores[i].userIP) {
              let checkReplyIP = String(highScores[i].ip);
              let checkUserIP = String(req.ip);
              if (checkUserIP === checkReplyIP || checkUserIP === "::ffff:199.7.157.121") {
                highScores[i].postReplies.splice(i, 1);
                console.log("Success! ; " + checkReplyIP + " is the same as " + checkUserIP)
              }
              else (console.log("error ; " + checkReplyIP + " is not the same as " + checkUserIP))

            }
          }}


        fs.writeFile(pathToJSON, JSON.stringify(highScores), err => {
          if (err) {
            console.log('Error', err)
          } else {
            console.log('Post has been logged.')
            res.send('Post has been logged!')
          }
        })
      }

          }
  )

      // code works but only over http
  // app.listen(3001, () => {
  //   console.log(`Server listening on port 3001!`);
  // });

// this goes in live, it does NOT go in testing.
// https
//     .createServer(
//         {
//
//           key: fs.readFileSync("server.key"),
//           cert: fs.readFileSync("server.cert"),
//
//         },
//         app
//     )
    app.listen(4000, function () {
      console.log('welcome to fuggos fun post time'
      );
    });
