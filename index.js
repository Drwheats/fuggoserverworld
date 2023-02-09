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

// this is all HTTPS below:



// rate limiter.
// const limiter = require("./middleware/rateLimiter");
// app.use(limiter);
app.use(cors({ credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
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
      console.log(req.socket.remoteAddress + " is requesting to delete post number " + checkPost.motherPost + " which was written by the IP : " + req.ip)

  if (checkPost.isReply){
    for (let i = 0; i < highScores.length; i++) {
      if (highScores[i].postNumber === Number(req.body.motherPost)) {
        for (let j =0; j < highScores[i].postReplies.length; j++) {
          if (highScores[i].postReplies[j].postNumber === Number(req.body.postNumber)){
            console.log(req.socket.remoteAddress + " ______ " + highScores[i].userIP)
            console.log(highScores[i].postReplies[j] + "has been deleted.");
            highScores[i].postReplies.splice(j, 1);
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
            highScores.splice(i, 1);
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


// https
//     .createServer(
//         {
// /*
//           key: fs.readFileSync("server.key"),
//           cert: fs.readFileSync("server.cert"),
// */
//         },
//         app
//     )
    app.listen(4000, function () {
      console.log('welcome to fuggos fun post time'
      );
    });
