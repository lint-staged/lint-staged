# lint-staged

Run linters against staged git files and don't let :poop: slip into your code base! 

## Why

[Read the Medium post](https://medium.com/@okonetchnikov/make-linting-great-again-f3890e1ad6b8#.8qepn2b5l)

Linting makes more sense when running before commiting you code. By doing that you can ensure no errors are going into repository and enforce code style. But running a lint process on a whole project is slow and linting results can be irrelevant. Ultimately you want to lint only files that will be committed.

This project contains a script that will run arbitary npm tasks against staged files, filtered by a spicified glob pattern.

## Installation & Setup

1. `npm install --save-dev lint-staged`
1. Install and setup your linters just like you would do normally. Add appropriate `.eslintrc` and `.stylelintrc` etc. configs (see [ESLint](http://eslint.org) and [Stylelint](http://stylelint.io/) docs if you need help here).
1. Add `"lint-staged": { "*.js": "eslint" }` to `package.json` (see [configuration](#configuration))
1. Add `{ "lint-staged": "lint-staged" }` to `scripts` section of `package.json`

Now `git add` a few files and `npm run lint-staged` to lint them. 

I recommend using an awesome [pre-commit](https://github.com/observing/pre-commit) to run `lint-staged` as pre-commit hook:

1. `npm install --save-dev pre-commit`
1. Add `"pre-commit": "lint-staged"` to `package.json`

See complete examples below.

## Configuration

You can configure lint-staged by adding a `lint-staged` section to your `package.json`. It should 
be an object where each key is a command to run and value is a glob pattern to use for this  
command. This package uses [minimatch](https://github.com/isaacs/minimatch) for glob patterns. 
See its [documentation](https://github.com/isaacs/minimatch) if you have questions regarding glob patterns.

```json
{
  "scripts": {
    "lint:js": "eslint",
  },
  "lint-staged": {
    "*": "lint:js"
  }
}
```

This config will run `lint:js` npm script aginst staged files passed as argument. Supported are both local scripts (`npm run-script`) and locally or globally installed via `npm`. 

`lint-staged` is using [npm-which](https://github.com/timoxley/npm-which) to locate locally installed scripts, so you don't need to add `{ "eslint": "eslint" }` to the `scripts` section of your `pacakge.json` when running with default parameters. So the above example can be written as:
 
```json
{
  "scripts": {
    ...
  },
  "lint-staged": {
    "*": "eslint"
  }
}
```

You can pass arguments to your linter. To do so, add it to the `scripts` and then add it to the `lint-staged` configuration. See examples below.

Starting from [v2.0.0](https://github.com/okonet/lint-staged/releases/tag/2.0.0) sequences of commands are supported. Pass an array of commands instead of a single one and they will run sequentially. This is useful for running auto-formatting tools like `eslint --fix` or `stylefmt` but can be used for any arbitary sequences. In case of `eslint --fix`, after the code is reformatted we want it to be added to the same commit. This can be done by creating 2 scripts and running them sequentially:

```json
{
  "scripts": {
    "eslint:fix": "eslint --fix",
    "git:add": "git add"
  },
  "lint-staged": {
    "*.js": ["eslint:fix", "git:add"]
  },
}
```

## Examples

### ESLint with default parameters for *.js and *.jsx

```json
{
  "name": "My project",
  "version": "0.1.0",
  "scripts": {
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "*.@(js|jsx)": "eslint"
  },
  "pre-commit": "lint-staged"
}
```

### Automatically fix code style with `--fix` and add to commit

```json
{
  "name": "My project",
  "version": "0.1.0",
  "scripts": {
    "lint-staged": "lint-staged",
    "eslint:fix": "eslint --fix",
    "git:add": "git add"
  },
  "lint-staged": {
    "*.js": ["eslint:fix", "git:add"]
  },
  "pre-commit": "lint-staged"
}
```

This will run `eslint --fix` and automatically add changes to the commit.

### Stylelint for CSS with defaults and for SCSS with SCSS syntax

```json
{
  "name": "My project",
  "version": "0.1.0",
  "scripts": {
    "lint-staged": "lint-staged",
    "stylelint:scss": "stylelint --syntax=scss"
  },
  "lint-staged": {
    "*.css": "stylelint",
    "*.scss": "stylelint:scss"
  },
  "pre-commit": [ "lint-staged" ]
}
```

### Run PostCSS sorting, add files to commit and run Stylelint to check

```json
{
  "name": "My project",
  "version": "0.1.0",
  "scripts": {
    "lint-staged": "lint-staged",
    "git:add": "git add",
    "postcss:sorting": "postcss --config "[path to your config]" --replace",
  },
  "lint-staged": {
    "*.scss": [
      "postcss:sorting",
      "git:add",
      "stylelint"
    ]
  },
  "pre-commit": [ "lint-staged" ]
}
```
