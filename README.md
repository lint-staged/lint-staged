# lint-staged

Lint JS and CSS files staged by git

## Motivation

Linting makes more sense when running before commiting you code into repository. In this case you can ensure no :poop: is going put into it and enforce styles.
This repsitory contains 2 shell scrtips that run [ESLint](http://eslint.org) and [Stylelint](http://stylelint.io/) against only currently staged files.

## Adding pre-commit hooks

To start linting, you have to install a pre-commit hook:

1. `npm install -D pre-commit`
1. Add "eslint": "eslint" to scripts section of package.json (if you want to lint your JS)
1. Add "stylelint": "stylelint" to scripts section of package.json (if you want to lint your CSS)
1. Add `pre-commit": [ "eslint", "stylelint" ]` to package.json
