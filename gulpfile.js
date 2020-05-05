const gulp = require('gulp');
const ts = require('gulp-typescript');
const prettier = require('gulp-prettier');
const through = require('through2');

function preserveNewlines() {
  return through.obj(function(file, encoding, callback) {
    const data = file.contents.toString('utf8');
    const fixedUp = data.replace(/\n\n/g, '\n/** THIS_IS_A_NEWLINE **/');
    file.contents = Buffer.from(fixedUp, 'utf8');
    callback(null, file);
  });
}

function restoreNewlines() {
  return through.obj(function(file, encoding, callback) {
    const data = file.contents.toString('utf8');
    const fixedUp = data.replace(/\/\*\* THIS_IS_A_NEWLINE \*\*\//g, '\n');
    file.contents = Buffer.from(fixedUp, 'utf8');
    callback(null, file);
  });
}

gulp.task('default', function () {
  return gulp.src('src/**/*.ts')
    .pipe(preserveNewlines())
    .pipe(ts({
      allowJs: false,
      checkJs: false,
      strict: true,

      // do not install tslib
      // keeping this set will complain when we use a feature that needs a polyfill
      importHelpers: false,
      alwaysStrict: true,

      target: 'ES2018',
      module: 'None',
      moduleResolution: 'node',
      lib: ['ES2018'],

      noEmitHelpers: true,
      noEmitOnError: true
    }))
    .pipe(restoreNewlines())
    .pipe(prettier({
      singleQuote: true,
      tabWidth: 2,
      printWidth: 100
    }))
    .pipe(gulp.dest('lib'));
});