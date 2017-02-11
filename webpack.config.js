var path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: './dist/bundle.js'
  },
  node: {
    fs: 'empty',
    process: false
  },
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