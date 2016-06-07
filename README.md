# lint-staged

Run linters against staged git files and don't let :poop: slip into your code base! 

## Why

Linting makes more sense when running before commiting you code into repository. By doing that you
can ensure no erros is going in and enforce code style. But running a lint process on a whole 
project is slow and irrelevant. Ultimately you want to lint only files that will be committed. 

This project contains a script that will run arbitary npm tasks against staged files, filtered by
a spicified glob pattern.

## Installation & Setup

1. `npm install --save-dev lint-staged`
1. `npm install --save-dev pre-commit` (recommended way of adding a git hook)
1. Install and setup your linters just like you would do normally. Add appropriate `.eslintrc` and `.stylelintrc` etc. configs (see [ESLint](http://eslint.org) and [Stylelint](http://stylelint.io/) docs if you need help here).
1. Add `lint-staged": { "eslint": "*.js" }` to `package.json`. See [configuration](#configuration).
1. Add `pre-commit": [ "lint-staged" ]` to `package.json`

## Configuration

You can configure lint-staged by adding a `lint-staged` section to your `package.json`. It should 
be an object where each key is a command to run and value is a glob pattern to use for this  
command. This package uses [minimatch](https://github.com/isaacs/minimatch) for glob patterns. 
See the documentation for it in case you have question.


```json
{
    "scripts": {
        "my-cool-task": "echo 1"
    },
    "lint-staged": {
        "my-cool-task": "*"
    }
}
```

This config will run `my-cool-task` with all staged files passed as argument.

## What linters are supported

Every script that can be run via `npm run-script` is supported. And since this package is using 
[npm-run](https://github.com/timoxley/npm-run) to run scripts, you don't need to add `{ 
"eslint": "eslint" }` to the `scripts` section of your `pacakge.json` when running with default 
parameters. But if you need to pass some custom parameters, you can just add it to the `scripts` 
section and then add to `lint-staged` configuration. See examples below.

### ESLint with default parameters

```json
{
  "name": "My project",
  "version": "0.1.0",
  "lint-staged": {
    "eslint": "*.@(js|jsx)",
  },
  "pre-commit": [ "lint-staged" ]
}
```

### Stylelint with SCSS syntax (and ESLint)

```json
{
  "name": "My project",
  "version": "0.1.0",
  "scripts": {
    "stylelint-staged": "stylelint --syntax=scss"
  },
  "lint-staged": {
    "eslint": "*.js",
    "stylelint-staged": "*.scss"
  },
  "pre-commit": [ "lint-staged" ]
}
```
