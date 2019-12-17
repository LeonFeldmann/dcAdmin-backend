/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable quotes */
/* eslint-disable global-require */
module.exports = function (app, validateToken, checkBodyForValidAttributes) {
  const fs = require('fs-extra');
  const jwt = require('jsonwebtoken');
  const mongoose = require('mongoose');
  const multer = require('multer');
  const path = require('path');

  const Schemata = require('../../models/user');
  const Document = require('../../models/document');
  const User = mongoose.model('user', Schemata.User);
  const Todo = mongoose.model('todo', Schemata.Todo);

  const upload = multer({ dest: "newFiles" });

  // checks if username of email exists in db
  function checkUsernameAndEmailForUniqueness(req, res, next) {
    // console.log(req.body);
    const usernameR = new RegExp(["^", req.body.username, "$"].join(""), "i");
    const queryUsername = { username: usernameR };
    User.findOne(queryUsername).then((result) => {
      console.log(`This is the result for username: ${result}`);
      if (result == null) {
        const emailR = new RegExp(["^", req.body.email, "$"].join(""), "i");
        const queryEmail = { email: emailR };
        User.findOne(queryEmail).then((resultUser) => {
          console.log(`This is the result for email: ${resultUser}`);
          if (resultUser == null) {
            next();
          } else {
            res.status(400).json({ error: "This email address already exists in the database" });
            res.send();
          }
        });
      } else {
        res.status(400).json({ error: "This username already exists in the database" });
        res.send();
      }
    });
  }

  // route for testing purposes
  app.get('/reset', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['password']), (req, res) => {
    if (req.body.password !== 'masterPW') {
      res.sendStatus(401);
      return;
    }
    fs.readdir(`./files`, (err, dirs) => {
      console.log(dirs);
      if (err) {
        res.status(400);
        return;
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const dir of dirs) {
        fs.remove(`./files/${dir}`, (er) => {
          if (er) {
            console.error(er);
            // eslint-disable-next-line no-useless-return
            return;
          }
        });
      }
      User.deleteMany({}, (error) => {
        if (error) {
          console.error(error);
        } else {
        // console.log("No erros occurred");
        }
      });
      Document.deleteMany({}, (er) => {
        if (er) {
          console.error(er);
        } else {
          // console.log("No errors occurred");
        }
      });
      res.status(200).json({ Message: "All files and db entries were deleted successfully" });
    });
  });
  // send userinfo
  app.get('/userInfo', validateToken, async (req, res) => {
    const documentCountn = await Document.find({ user: res.locals.user._id }).countDocuments();
    const todoCountn = await Todo.find({ user: res.locals.user._id }).countDocuments();

    const responseJson = {
      institutions: res.locals.user.institutions,
      _id: res.locals.user._id,
      email: res.locals.user.email,
      username: res.locals.user.username,
      firstName: res.locals.user.firstName,
      lastName: res.locals.user.lastName,
      lastLoggedIn: res.locals.user.lastLoggedIn,
      documentCount: documentCountn,
      todoCount: todoCountn,
    };
    res.status(200).json(responseJson);
  });
  // send current user picture, default is provided
  app.get('/userPicture', validateToken, (req, res) => {
    const picturePath = fs.readdirSync(`./files/${res.locals.user.username}`).filter((fn) => fn.startsWith('picture.'));
    console.log(picturePath);
    if (picturePath.length > 0) {
    // console.log(picturePath);
      const imagePath = `./files/${res.locals.user.username}/${picturePath[0]}`;
      // res.sendFile("./files/" + res.locals.user.username + "/" + picturePath[0], {root:'.'});
      const stream = fs.createReadStream(imagePath);
      res.writeHead(200, {
        'Content-disposition': `attachment; filename='${encodeURIComponent(path.basename(imagePath))}'`,
        'Content-type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET',
        'Access-Control-Expose-Headers': '*',
      });
      stream.pipe(res);
    } else {
      console.error("Error finding picture");
      res.sendStatus(500);
    }
  });
  // receive user credentials and create new user if unique
  app.post('/register', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['email', 'username', 'firstName', 'lastName', 'password']), (req, res, next) => checkUsernameAndEmailForUniqueness(req, res, next), (req, res) => {
    const newUser = new User({
      email: req.body.email,
      username: req.body.username,
      password: User.hashPassword(req.body.password),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      picture: `./defaults/picture.png`,
      institutions: ['other'],
      lastLoggedIn: new Date(),
    });
    const promise = newUser.save();
    // console.log(newUser);

    promise.then(() => {
      if (fs.existsSync(`./files/${req.body.username}`)) {
        // console.log("Directory already exists");
        fs.remove(`./files/${req.body.username}`, (err) => {
          if (err) {
            console.log(err);
          }
        });
      }
      fs.mkdir(`./files/${req.body.username}`, { recursive: true }, (err) => {
        if (err) {
          console.log(err);
        } else {
          fs.copyFile(`./defaults/picture.png`, `./files/${req.body.username}/picture.png`);
          console.log("User dir was initialized successfully");
        }
      });
      res.sendStatus(200);
    });

    promise.catch((err) => res.status(500).json({ message: 'Error registering user.', error: err }));
  });
  // receive credentials and send jwt token encoded with user
  app.post('/login', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['userIdentifier', 'password']), async (req, res) => {
  // make sure files folder is set up
    if (fs.existsSync(`./files/`)) {
      console.log("Files folder aready existing");
    } else {
      fs.mkdir(`./files/`, { recursive: true }, (err) => {
        if (err) console.log(err);
      });
      console.log("Files folder created");
    }

    const firstQuery = await User.findOne({ username: req.body.userIdentifier }).exec();
    const secondQuery = await User.findOne({ email: req.body.userIdentifier }).exec();
    console.log(firstQuery);
    console.log(secondQuery);
    if (firstQuery && secondQuery == null && firstQuery.isValid(req.body.password, firstQuery.password)) {
      User.findOneAndUpdate({ _id: firstQuery._id }, { lastLoggedIn: new Date() }, { upsert: false }, (err) => {
        if (err) {
          console.log(err);
        }
      });

      console.log('Valid password');
      const newToken = jwt.sign({ userID: firstQuery._id }, 'secret', { expiresIn: '3h' });
      // console.log(token);
      res.status(200).json({
        loginStatus: "true",
        token: newToken,
      });
    } else if (firstQuery == null && secondQuery && secondQuery.isValid(req.body.password, secondQuery.password)) {
      User.findOneAndUpdate({ _id: secondQuery._id }, { lastLoggedIn: new Date() }, { upsert: false }, (err) => {
        if (err) {
          console.log(err);
        }
      });

      console.log('Valid password');
      const newToken = jwt.sign({ userID: secondQuery._id }, 'secret', { expiresIn: '3h' });
      // console.log(token);
      res.status(200).json({
        loginStatus: "true",
        token: newToken,
      });
    } else if (firstQuery !== null && secondQuery !== null) {
      res.status(404).json({
        loginStatus: "false",
        token: "",
        error: "Please provide a unique identifier/use the other one",
      });
    } else {
      res.status(404).json({
        loginStatus: "false",
        token: "",
        error: "Credentials not associated with an existing user",
      });
    }
    res.send();
  });
  // delete user and all files/db entries corresponding to user that is currently logged in
  app.post('/deleteUser', validateToken, (req, res) => {
    console.log("Deleting user");
    // clean db
    User.deleteOne({ _id: res.locals.user._id }, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`${res.locals.user.username} has been deleted`);
      }
    });
    Document.deleteMany({ user: res.locals.user._id }, (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log(`All documents of ${res.locals.user.username} deleted`);
      }
    });
    Todo.deleteMany({ user: res.locals.user._id }, (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log(`All documents of ${res.locals.user.username} deleted`);
      }
    });

    fs.remove(`./files/${res.locals.user.username}`, (err) => {
      if (err) {
        console.error(err);
        res.sendStatus(500);
      } else {
        res.sendStatus(200);
      }
    });
  });
  // update userpicture located in user's directory
  app.put('/updatePicture', validateToken, upload.single('image'), (req, res) => {
    // console.log(req.file);
    const oldPicture = fs.readdirSync(`./files/${res.locals.user.username}`).filter((fn) => fn.startsWith('picture.'));

    const rex = new RegExp(".*(\\.\\w+)");
    const string = req.file.originalname;
    const mime = string.match(rex)[1];

    // eslint-disable-next-line no-prototype-builtins
    if (req.hasOwnProperty("file")) {
      fs.unlink(`./files/${res.locals.user.username}/${oldPicture}`);
      fs.move(req.file.path, `./files/${res.locals.user.username}/picture${mime}`);
      res.sendStatus(200);
    } else {
      console.log("No image arrived");
      res.sendStatus(500);
    }
  });
  // change pw of logged in user
  app.put('/changePW', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['password']), (req, res) => {
    User.updateOne({ _id: res.locals.user._id }, { password: User.hashPassword(req.body.password) }, (err) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        res.sendStatus(200);
      }
    });
  });
  // update user attributes
  app.put('/editUser', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['email', 'firstName', 'lastName']), (req, res) => {
    User.updateOne({ _id: res.locals.user._id }, { email: req.body.email, firstName: req.body.firstName, lastName: req.body.lastName }, (err) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        res.sendStatus(200);
      }
    });
  });
};
