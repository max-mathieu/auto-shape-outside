const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function(env, argv) {
  const eslintOptions = {};
  let mode = 'production';
  
  if(env !== 'production') {
    eslintOptions.rules = {
      'no-debugger': 0,
    };
    eslintOptions.fix = true;
    mode = 'development';
  }
  
  return {
    mode: 'development',
    entry: {
      app: './src/js/app',
      worker: './src/js/worker',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      globalObject: 'self', // https://github.com/webpack/webpack/issues/6642
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'eslint-loader',
          options: eslintOptions,
        },
        {
          test: /\.js$/,
          loader: 'babel-loader',
          query: {
            presets: ['es2015'],
          },
        }
      ],
    },
    plugins: [
      new webpack.NamedModulesPlugin(),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'src/index.html',
        minify: {},
        excludeChunks: [ 'worker' ],
      })
    ],
    stats: {
      colors: true,
    },
    devtool: 'source-map',
    /*
    devServer: {
      contentBase: path.resolve(__dirname, 'dist'),
      compress: true,
      port: 8000,
    },
    */
  };
}
