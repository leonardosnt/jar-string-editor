const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    app: './src/js/index.js',
    polyfill: './src/js/polyfill.js'
  },
  output: {
    filename: 'dist/[name].js'
  },
  node: {
    fs: 'empty',
    process: false
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendors',
      filename: "dist/vendors.js",
      minChunks: function (module) {
        var userRequest = module.userRequest;

        if (typeof userRequest !== 'string') {
          return false;
        }

        return userRequest.indexOf('node_modules') > -1;
      }
    })
  ],
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015'],
      }
    }]
  }
};

// Production build
if (process.argv.indexOf('-p') !== -1) {
  module.exports.plugins.push(new webpack.optimize.UglifyJsPlugin({ compress: { warnings: true }}))
}