import babel from 'gulp-babel';
import del from 'del';
import gulp from 'gulp';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import { exec } from 'child_process';

const paths = {
  srcJs: 'src/**/*.js',
  lib: 'lib',
  libJs: 'lib/**/*.js'
};

gulp.task('clean', () => {
  return del(paths.lib);
});

gulp.task('build', ['clean'], () => {
  return gulp.src(paths.srcJs)
    .pipe(babel())
    .pipe(gulp.dest(paths.lib));
});

gulp.task('main', ['build'], (callback) => {
  exec(`node ${paths.lib}`, (error, stdout) => {
    console.log(stdout);
    return callback(error);
  });
});

gulp.task('compressJs', ['build'], () => {
  return gulp.src(paths.libJs)
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(paths.lib));
});

// rial time executing
gulp.task('watch', () => {
  gulp.watch(paths.srcJs, ['main']);
});

gulp.task('default', ['main', 'compressJs' /*,'watch'*/]);