var elixir = require('laravel-elixir');
var path = require('path');
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var webpack = require('webpack');
var gulpWebpack = require('webpack-stream');
var argv = require('yargs').argv;
var watch = require('gulp-watch');
var batch = require('gulp-batch');
var livereload = require('gulp-livereload')
var minifyCss = require('gulp-minify-css');
var autoprefixer = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var newBrowserify = require('browserify');
var reactify = require('reactify'); 
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var notify = require('gulp-notify');


/*requirements end*/




var node_modules_dir = path.resolve(__dirname, 'node_modules');

var build_dir = path.resolve(__dirname, 'public/js');

var js_entry_point_path = path.resolve(__dirname, 'resources/assets/js/app.js');

var vendors_array = ['react', 'react/addons', 'jquery', 'react-router', 'lodash', 'flux', 'material-ui', 'react-tap-event-plugin', 'moment'];

var css_files_to_bundle = [
  path.resolve(__dirname, 'resources/assets/css/font-awesome.min.css'),
  path.resolve(__dirname, 'resources/assets/css/bootstrap.min.css'),
  path.resolve(__dirname, 'resources/assets/css/styles.css')
];


var options = {
  src: {
    js: js_entry_point_path,
    css: css_files_to_bundle
  },
  dest: {
    js_dev: './public/dev/js',
    css_dev: './public/dev/css',
    css_prod: './public/build/css',
  }
}


var webpack_config_prod = {
  entry: {
    app: js_entry_point_path,
    vendors: vendors_array
  },
  output: {
    path: build_dir, //looks like we are ignoring this part, but let it be
    filename: 'app.js'
  },
  module: {
    loaders: [
      {
        test: /\.(js|jsx)$/,
        exclude: [node_modules_dir], 
        loader: 'babel'
      },
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin('vendors', 'vendors.js')
  ]
};


gulp.task('webpack', function() 
{

    return gulp.src('')
      .pipe(gulpWebpack(webpack_config_prod, webpack))
      .pipe(gulpif(argv.production, uglify())) // try {mangle: false} if anything doesn't work - I've read that mangle could be breaking down transformers
      .pipe(gulp.dest(build_dir))
      .pipe(gulpif(!argv.production, livereload())) 
      ;

});

gulp.task('css', function()
{
  
  cssTask(options);

});


gulp.task('default', ['webpack', 'css'], function() 
{

  elixir(function(mix) {
    mix.version(['js/app.js', 'js/vendors.js'])
      ;
  });

});

gulp.task('watch', function () 
{

  livereload.listen();
  browserifyTask(options);
  cssTask(options);
  watch(options.src.css, batch(function() 
  {
  
    return cssTask(options);
  
  }));

});






var browserifyTask = function (options) {
  var appBundler = newBrowserify({
    entries: [options.src.js], // The entry file, normally "main.js"
    transform: [reactify], // Convert JSX style
    debug: true, // Sourcemapping
    cache: {}, packageCache: {}, fullPaths: true // Requirement of watchify
  });

  var rebundle = function () {
    var start = Date.now();
    console.log('Building APP bundle');
    appBundler.bundle()
      .on('error', gutil.log)
      .pipe(source('app.js'))
      .pipe(gulp.dest(options.dest.js_dev))
      .pipe(livereload())
      .pipe(notify(function () {
        console.log('APP bundle built in ' + (Date.now() - start) + 'ms');
      }));
  };

  appBundler = watchify(appBundler);
  appBundler.on('update', rebundle);

  rebundle();
}


var cssTask = function (options) {
    var run = function () {
      var start = Date.now();
      console.log('Building CSS bundle');
      return gulp.src(options.src.css)
        .pipe(autoprefixer())
        .pipe(concat('bundle.css'))
        .pipe(gulpif(argv.production, minifyCss({noAdvanced:true})))
        .pipe(gulpif(argv.production, gulp.dest(options.dest.css_prod), gulp.dest(options.dest.css_dev)))
        .pipe(gulpif(!argv.production, livereload()))
        .pipe(notify(function () {
          console.log('CSS bundle built in ' + (Date.now() - start) + 'ms');
        }));
    };
    return run();
}
