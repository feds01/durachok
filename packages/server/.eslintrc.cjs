// {
//   "extends": "eslint:recommended",

//   "parserOptions": {
//     "ecmaVersion": 2018,
//     "sourceType": "module",
//     "ecmaFeatures": {
//       "jsx": true
//     }
//   },
//   "rules": {
//     "no-var": "error",
//     "no-const-assign": "error",
//     "no-unreachable": "error",
//     "no-invalid-regexp": "error",
//     "no-console": "off",
//     "no-unused-vars": "off",
//     "no-fallthrough": "off",
//     "no-trailing-spaces": "off",
//     "spaced-comment": "warn",
//     "use-isnan": "error",
//     "eqeqeq": "error",
//     "radix": "warn",
//     "quotes": [
//       "warn",
//       "double"
//     ],
//     "semi": 2
//   },
//   "env": {
//     "node": true,
//     "es6": true,
//     "commonjs": true
//   },

//   "root": true
// }

module.exports = {
    root: true,
    env: { browser: false, es2020: true },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    ignorePatterns: ["dist", ".eslintrc.cjs"],
    parser: "@typescript-eslint/parser",
};
