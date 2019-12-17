/* eslint-disable max-len */
// gulpfile.js
const gulp = require('gulp');
// const nodemon = require('nodemon');
const exec = require('child_process').exec;
// const childProcess = require('child_process');
const mocha = require('gulp-mocha');

gulp.task('docker:run', runCommand('docker-compose up -d'));
gulp.task('docker:build', runCommand('docker-compose build'));
gulp.task('test', (cb) => {
  gulp.src('./dockerfiles/test/test.js').pipe(mocha({reporter: 'list', exit: true}));
  cb();
});

gulp.task('docker:up', gulp.series('docker:build', 'docker:run', 'test'));

gulp.task('docker:start', runCommand('docker-compose start'));
gulp.task('docker:stop', runCommand('docker-compose stop'));
gulp.task('docker:down', runCommand('docker-compose down -v'));

function runCommand(command) {
  return function (cb) {
    exec(command, function (err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      cb(err);
    });
  };
}

// const processes = { server: null, mongo: null };

// gulp.task('start:server', (cb) => {
//   // The magic happens here ...
//   processes.server = nodemon({
//     script: 'app.js',
//     ext: 'js',
//   });
//   cb();
// });

// gulp.task('start:mongo', (cb) => {
//   // processes.mongo = child_process.exec('mongod --config /Users/leonfeldmann/Desktop/WebFileViewerProject/src/mongod.conf', function (err, stdout, stderr) {});
//   // eslint-disable-next-line no-unused-vars
//   processes.mongo = childProcess.exec('mongod --dbpath data/ --logpath data/logs/mongo.log', (err, stdout, stderr) => {});
//   cb();
// });

// gulp.task('run', gulp.parallel('start:mongo', 'start:server'));
// gulp.task('run', gulp.series('start:mongo', 'start:server'));

// process.on('exit', function () {
//   processes.server.kill();
//   processes.mongo.kill();
// });