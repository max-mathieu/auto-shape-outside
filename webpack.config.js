const path = require('path');

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
      worker: './src/js/worker',
    },
    output: {
      path: path.resolve(__dirname, 'dist/js'),
      filename: '[name].js',
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
