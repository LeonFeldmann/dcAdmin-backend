/* eslint-disable quotes */
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const fs = require('fs-extra');
const jwt = require('jsonwebtoken');
// const merge = require('easy-pdf-merge');
const mongoose = require('mongoose');
// const multer = require('multer');
// const path = require('path');
const Schemata = require('./models/user');
// const Document = require('./models/document');
const User = mongoose.model('user', Schemata.User);
// const Todo = mongoose.model('todo', Schemata.Todo);
// const upload = multer({dest: "newFiles"});
const port = 3000;

const app = express();

// Connect to MongoDB
mongoose
  .connect(
    'mongodb://mongo:27017/webfileviewer-backend',
    { useNewUrlParser: true }
  )
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

app.use(cors());
app.use(bodyParser.json({ extended: true }));

app.use(require('express-session')({
  secret: 'Anything at all',
  resave: false,
  saveUninitialized: false,
}));


// middelware that checks request body for attributes required by the route
function checkBodyForValidAttributes(req, res, next, attributes) {
  let requestWellComposed = true;
  // console.log(attributes);
  for (let i = 0; i < attributes.length; i += 1) {
    // eslint-disable-next-line no-prototype-builtins
    if (!req.body.hasOwnProperty(attributes[i]) || req.body[attributes[i]] == null || req.body[attributes[i]] === '') {
      requestWellComposed = false;
      break;
    }
  }
  // console.log("At the end of check function: " + requestWellFormulated);
  if (requestWellComposed) {
    next();
  } else {
    res.status(400).json({ error: "Required parameters in request body either not existing or undefined/empty" });
    res.send();
  }
}

// make sure filestructure exists after server restart/ legacy
// (empty folders not tracked by git & stuff...)
function initializeDirectoriesOnServer() {
  // make sure files folder is set up
  if (fs.existsSync(`./files/`)) {
    console.log('Files folder aready existing');
  } else {
    fs.mkdir(`./files/`, { recursive: true }, (err) => {
      if (err) console.log(err);
    });
    console.log('Files folder created');

    // create user folder
    User.find({}, (err, res) => {
      console.log(res);
      if (res.length > 0) {
        res.forEach((user) => {
          fs.mkdir(`./files/${user.username}`, { recursive: true }, (error) => {
            if (error) {
              console.log(error);
            } else {
              fs.copyFile(`./defaults/picture.png`, `./files/${user.username}/picture.png`);
            }
          });
        });
        console.log('Initialized user directories with picture');
      }
    });
  }
}

// validates token given by request through jwt and sets current user in res.locals for later usage
// eslint-disable-next-line consistent-return
function validateToken(req, res, next) {
  const token = req.headers['x-access-token'];
  if (!token) return res.status(401).send({ auth: false, message: 'No token provided' });
  // eslint-disable-next-line consistent-return
  jwt.verify(token, 'secret', (err, decoded) => {
    if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token' });

    // eslint-disable-next-line consistent-return
    User.findById(decoded.userID, (error, user) => {
      if (error) return res.status(500).send('There was a problem finding the user.');
      if (!user) return res.status(404).send('No user found.');
      res.locals.user = user;
      next();
    });
  });
}

app.post('/test', (req, res) => {
  const dir = `./files/`;

  fs.readdir(dir, (err, files) => {
    if (err) {
      console.log(err);
    } else {
      files.forEach((file) => {
        console.log(file);
      });
    }
  });
  res.sendStatus(200);
});

app.post('/testAll', (req, res) => {
  fs.readdir("./", (err, files) => {
    if (err) {
      console.log(err);
    } else {
      files.forEach((file) => {
        console.log(file);
      });
    }
  });
  res.sendStatus(200);
});

app.post('/testUser', validateToken, (req, res) => {
  const dir = `./files/${res.locals.user.username}`;
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.log(err);
    } else {
      files.forEach((file) => {
        console.log(file);
      });
    }
  });

  res.sendStatus(200);
});

require('./app/routes/institution_routes')(app, validateToken, checkBodyForValidAttributes);
require('./app/routes/todo_routes')(app, validateToken, checkBodyForValidAttributes);
require('./app/routes/user_routes')(app, validateToken, checkBodyForValidAttributes);
require('./app/routes/document_routes')(app, validateToken, checkBodyForValidAttributes);

app.listen(port, () => {
  initializeDirectoriesOnServer();
  console.log(`The app is listening on port: ${port}`);
});
