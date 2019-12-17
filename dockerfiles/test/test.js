const assert = require('assert');
const mongoose = require('mongoose');

const url = process.env.MONGODB_URI || 'mongodb://localhost/data';
const db = mongoose.connection;
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useFindAndModify', false);


const Schemata    = require('../models/user');
const Document    = require('../models/document');
const User        = mongoose.model('user', Schemata.User);
const Todo        = mongoose.model('todo', Schemata.Todo);


// describe tests
describe('very basic test', function(cb){

    // create tests
    it('create a user', function(done) {
        const newUser = new User({
            email: "test@gmail.com",
            username: "test",
            password: "testPW",
            firstName: "fname",
            lastName: "lname",
            picture: "/defaults/picture.png",
            institutions: ['other'],
            lastLoggedIn: new Date()
        });

        newUser.save().then(function(){
            User.findOne({username:"test"}).then(function(record) {
                assert(record.firstName === "fname");
                done();
            });
        });
    });

    it('create a document', function(done) {
        let testUserID;
        User.find({username:"test"}).then(function(result) {
            testUserID = result._id;
        });

        const doc = new Document({
            year: "2000",
            month: "01",
            institution: "other",
            importance: "3",
            description: "nothin",
            filePath: "",
            title: "testTitle",
            user: testUserID
        });

        doc.save().then(function(record) {
            assert(record.title === "testTitle");
            done();
        });
    });


    it('create a todo', function(done) {
        let testUserID;
        User.find({username:"test"}).then(function(result) {
            testUserID = result._id;
        });

        let todo = new Todo({
            "title" : "testTodo",
            "marked" : false,
            "user" : testUserID
        });

        todo.save().then(function(record) {
            assert(record.title === "testTodo");
            done();
        });
    });
   

    // clean up db
    it('delete a users documents', function(done) {
        let testUserID;
        User.find({username:"test"}).then(function(result) {
            testUserID = result._id;
        });

        Document.find({user:testUserID}).then((result) => {
            Document.deleteMany({user:testUserID}).then(function(obj) {
                assert(obj.deletedCount === result.length);
                done();
            });
        });
    });

    it('delete a users todos', function(done) {
        let testUserID;

        User.find({username:"test"}).then(function(result) {
            testUserID = result._id;
        });

        Todo.find({user:testUserID}).then((result) => {
            Todo.deleteMany({user:testUserID}).then(function(obj) {
                assert(obj.deletedCount === result.length);
                done();
            });
        });
    });

    it('delete a user', function(done) {
        User.deleteMany({username:"test"}).then(function(result) {
            assert(result.deletedCount === 1);
            done();
        });
    });
  
});
