# lint-staged [![Build Status](https://travis-ci.org/okonet/lint-staged.svg?branch=master)](https://travis-ci.org/okonet/lint-staged)

Run linters against staged git files and don't let :poop: slip into your code base!

## Why

[Read the Medium post](https://medium.com/@okonetchnikov/make-linting-great-again-f3890e1ad6b8#.8qepn2b5l)

Linting makes more sense when running before committing you code. By doing that you can ensure no errors are going into repository and enforce code style. But running a lint process on a whole project is slow and linting results can be irrelevant. Ultimately you only want to lint files that will be committed.

This project contains a script that will run arbitrary npm and shell tasks with a list of staged files as argument, filtered by a specified glob pattern.

## Installation & Setup

1. `npm install --save-dev lint-staged`
1. Install and setup your linters just like you would do normally. Add appropriate `.eslintrc` and `.stylelintrc`, etc., configs (see [ESLint](http://eslint.org) and [Stylelint](http://stylelint.io/) docs if you need help here).
1. Add `{ "lint-staged": "lint-staged" }` to `scripts` section of `package.json`.
1. Add `"lint-staged": { "*.js": "eslint" }` to `package.json` (see [configuration](#configuration)).
1. `npm install --save-dev pre-commit` ¹.
1. Add `"pre-commit": "lint-staged"` to `package.json` (top level, not the `scripts` section).

¹ I recommend using [pre-commit](https://github.com/observing/pre-commit) or [husky](https://github.com/typicode/husky) to manage git hooks but you can use whatever you want.

Now change a few files, `git add` some of them to your commit and try to `git commit` them.

See [examples](#examples) below.

## Configuration

Starting with v3.1 you can now use different ways of configuring it:

* `lint-staged` object in your `package.json`
* `.lintstagedrc` file in JSON or YML format
* `lint-staged.config.js` file in JS format

See [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) for more details on what formats are supported.

Lint-staged supports simple and advanced config formats.

### Simple config format

Should be an object where each value is a command to run and its key is a glob pattern to use for this command. This package uses [minimatch](https://github.com/isaacs/minimatch) for glob patterns.

#### `pacakge.json` example:
```json
{
  "scripts": {
    "my-task": "your-command",
  },
  "lint-staged": {
    "*": "my-task"
  }
}
```

#### `.lintstagedrc` example

```json
{
	"*": "my-task"
}
```

This config will execute `npm run my-task` with the list of currently staged files passed as arguments.

So, considering you did `git add file1.ext file2.ext`, lint-staged will run the following command:

`npm run my-task -- file1.ext file2.ext`

### Advanced config format
To set options and keep lint-staged extensible, advanced format can be used. This should hold linters object in `linters` property.

## Options

* `linters` — `Object` — keys (`String`) are glob patterns, values (`Array<String> | String`) are commands to execute.
* `gitDir` — Sets the relative path to the `.git` root. Useful when your `package.json` is located in a sub-directory. See [working from a subdirectory](#working-from-a-subdirectory)
* `concurrent` — *true* — runs linters for each glob pattern simultaneously. If you don’t want this, you can set `concurrent: false`

## What commands are supported?

Supported are both local npm scripts (`npm run-script`), or any executables installed locally or globally via `npm` as well as any executable from your $PATH.

> Using globally installed scripts is discouraged, since lint-staged may not work for someone who doesn’t have it installed.

`lint-staged` is using [npm-which](https://github.com/timoxley/npm-which) to locate locally installed scripts, so you don't need to add `{ "eslint": "eslint" }` to the `scripts` section of your `package.json`. So  in your `.lintstagedrc` you can write:

```json
{
	"*.js": "eslint --fix"
}
```

Pass arguments to your commands separated by space as you would do in the shell. See [examples](#examples) below.

Starting from [v2.0.0](https://github.com/okonet/lint-staged/releases/tag/2.0.0) sequences of commands are supported. Pass an array of commands instead of a single one and they will run sequentially. This is useful for running auto-formatting tools like `eslint --fix` or `stylefmt` but can be used for any arbitrary sequences.

## Re-formatting the code

Tools like ESLint or stylefmt can re-format your code according to an appropriate config  by running `eslint --fix`. After the code is re-formatted, we want it to be added to the same commit. This can be done using following config:

```json
{
	"*.js": ["eslint --fix", "git add"]
}
```

Starting from v3.1, lint-staged will stash you remaining changes (not added to the index) and restore them from stash afterwards. This allows you to create partial commits with hunks using `git add --patch`.

## Working from a subdirectory

If your `package.json` is located in a subdirectory of the git root directory, you can use `gitDir` relative path to point there in order to make lint-staged work. 

```json
{
    "gitDir": "../",
    "linters":{
        "*": "my-task"
    }
}
```

## Examples

All examples assuming you’ve already set up lint-staged and pre-commit in the  `package.json`

```json
{
  "name": "My project",
  "version": "0.1.0",
  "scripts": {
    "lint-staged": "lint-staged"
  },
  "pre-commit": "lint-staged"
}
```

*Note we don’t pass a path as an argument for the runners. This is important since lint-staged will do this for you. Please don’t reuse you tasks with paths from package.json.*

### 1. ESLint with default parameters for `*.js` and `*.jsx` running as a pre-commit hook

```json
{
	"*.{js,jsx}": "eslint"
}
```

### 2. Automatically fix code style with `--fix` and add to commit

```json
{
	"*.js": ["eslint --fix", "git add"]
}
```

This will run `eslint --fix` and automatically add changes to the commit. Please note, that it doesn’t work well with committing hunks (`git add -p`).

### Stylelint for CSS with defaults and for SCSS with SCSS syntax

```json
{
	"*.css": "stylelint",
	"*.scss": "stylelint --syntax=scss"
}
```

### Run PostCSS sorting, add files to commit and run Stylelint to check

```json
{
	"*.scss": [
	  "postcss --config "[path to your config]" --replace",
	  "stylelint",
	  "git add"
	]
}
```
