module.exports = {
  extends: 'airbnb-base',
  rules: {
    // general style choices
    'no-underscore-dangle': 0,
    'no-param-reassign': 0,
    // specifically for this project
    'no-plusplus': 0,
    'no-bitwise': 0,
  },
  env: {
    browser: true,
    es6: true,
  }
};
