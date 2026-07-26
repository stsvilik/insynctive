const globals = require('globals');

module.exports = [
  {ignores: ['lib/']},
  ...require('gts'),
  {
    files: ['preview/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
];
