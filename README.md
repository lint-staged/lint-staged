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
be an object where each value is a command to run and key is a glob pattern to use for this  
command. This package uses [minimatch](https://github.com/isaacs/minimatch) for glob patterns. 
See its [documentation](https://github.com/isaacs/minimatch) if you have questions regarding glob patterns.

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

This config will execute `npm run my-task`  with the list of currently staged files passed as argument. 

So, considering you did `git add file1.ext file2.ext`, lint-staged will run following command:

`npm run my-task — file1.ext file2.ext`

Supported are both local npm scripts (`npm run-script`), or any executables installed locally or globally via `npm` as well as any executable from your $PATH.

> Using globally installed scripts is discouraged, since in this case lint-staged might not work for someone who doesn’t have it installed.

`lint-staged` is using [npm-which](https://github.com/timoxley/npm-which) to locate locally installed scripts, so you don't need to add `{ "eslint": "eslint" }` to the `scripts` section of your `pacakge.json`. So, for simplicity, you can write:
 
```json
{
  "scripts": {
    ...
  },
  "lint-staged": {
    "*.js": "eslint —fix"
  }
}
```

You can pass arguments to your linter separated by space. See examples below.

Starting from [v2.0.0](https://github.com/okonet/lint-staged/releases/tag/2.0.0) sequences of commands are supported. Pass an array of commands instead of a single one and they will run sequentially. This is useful for running auto-formatting tools like `eslint --fix` or `stylefmt` but can be used for any arbitrary sequences. 

In case of `eslint --fix`, after the code is reformatted we want it to be added to the same commit. This can be easily done using following config:

```json
{
  "scripts": {
	  ...
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "git add"]
  },
}
```

## Examples

### ESLint with default parameters for `*.js` and `*.jsx` running as a pre-commit hook

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
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "git add"]
  },
  "pre-commit": "lint-staged"
}
```

This will run `eslint --fix` and automatically add changes to the commit. Please note, that it doesn’t work well with committing hunks (`git add -p`).

### Stylelint for CSS with defaults and for SCSS with SCSS syntax

```json
{
  "name": "My project",
  "version": "0.1.0",
  "scripts": {
    "lint-staged": "lint-staged",
  },
  "lint-staged": {
    "*.css": "stylelint",
    "*.scss": "stylelint --syntax=scss"
  },
  "pre-commit": "lint-staged"
}
```

### Run PostCSS sorting, add files to commit and run Stylelint to check

```json
{
  "name": "My project",
  "version": "0.1.0",
  "scripts": {
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "*.scss": [
      "postcss --config "[path to your config]" --replace"
      "git add",
      "stylelint"
    ]
  },
  "pre-commit": "lint-staged"
}
```
