/* eslint-disable quotes */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable global-require */
module.exports = function (app, validateToken, checkBodyForValidAttributes) {
  const mongoose = require('mongoose');
  const Schemata = require('../../models/user');
  const Todo = mongoose.model('todo', Schemata.Todo);

  // send all specification of todos
  app.get('/todos', validateToken, (req, res) => {
    Todo.find({ user: res.locals.user._id }, { user: false, __v: false }, (err, resultTodos) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({ todos: resultTodos });
      }
    });
  });

  // create a todo from the data received, linked to current user
  app.post('/createTodo', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['todoTitle']), (req, res) => {
    const todo = new Todo({
      title: req.body.todoTitle,
      marked: false,
      user: res.locals.user._id,
    });

    todo.save((err, savedTodo) => {
      if (err) {
        console.log('Error adding to DB');
        res.status(500).json({ error: `While writing the entry to the db the following error occured: ${err}` });
      } else {
        console.log('Successfully saved todo to db');
        console.log(savedTodo);
        res.sendStatus(200);
      }
    });
  });

  // delete todo given by id
  app.post('/deleteTodo', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['todoID']), (req, res) => {
    Todo.findOneAndDelete({ _id: req.body.todoID, user: res.locals.user._id }, (err) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: err });
      } else {
        res.sendStatus(200);
      }
    });
  });

  // set marked field of todo(given by id) to true(false by default)
  app.post('/markTodo', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['todoID']), (req, res) => {
    Todo.findOneAndUpdate({ _id: req.body.todoID, user: res.locals.user._id }, { marked: true }, (err, doc) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: err });
      } else {
        console.log(doc);
        res.sendStatus(200);
      }
    });
  });

  // unmark todo given by id
  app.post('/unmarkTodo', validateToken, (req, res, next) => checkBodyForValidAttributes(req, res, next, ['todoID']), (req, res) => {
    Todo.findOneAndUpdate({ _id: req.body.todoID, user: res.locals.user._id }, { marked: false }, (err, doc) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: err });
      } else {
        console.log(doc);
        res.sendStatus(200);
      }
    });
  });
};
