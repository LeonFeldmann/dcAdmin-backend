const exec = require('child_process').exec;
const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('docker:useImage', runCommand('docker-compose up -d'));
gulp.task('docker:pullImage', runCommand('docker pull leonfeldmann/dcadmin_backend_image'));
gulp.task('docker:build', runCommand('docker-compose build'));
gulp.task('test', (cb) => {
  gulp.src('./src/test/test.js').pipe(mocha({reporter: 'list', exit: true}));
  cb();
});

gulp.task('docker:up', gulp.series('docker:build', 'docker:useImage', 'test'));
gulp.task('docker:start', runCommand('docker-compose start'));
gulp.task('docker:stop', runCommand('docker-compose stop'));
gulp.task('docker:down', runCommand('docker-compose down -v --rmi all'));
gulp.task('docker:runImage', gulp.series('docker:pullImage', 'docker:useImage', 'test'));

function runCommand(command) {
  return function (cb) {
    exec(command, function (err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      cb(err);
    });
  };
}