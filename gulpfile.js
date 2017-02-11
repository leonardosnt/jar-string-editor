'use strict';

const gulp = require('gulp');
const webpack = require('gulp-webpack');
const rename = require('gulp-rename');
const uglifyjs = require('gulp-uglifyjs');

gulp.task('default', () => {
  return gulp.start('build')
});

gulp.task('build', () => {
  return gulp.src('src/*.js')
    .pipe(webpack(require('./webpack.config')))
    .pipe(gulp.dest(__dirname + './dist/'))
    .pipe(rename(path => path.extname = ".min.js"))
    .pipe(uglifyjs())
    .pipe(gulp.dest(__dirname + './dist/'))
});