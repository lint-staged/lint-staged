---
'lint-staged': minor
---

Lint-staged no longer resets to the original state when preventing an empty git commit. This happens when your configured tasks reset all the staged changes, typically when trying to commit formatting changes which conflict with your linter setup like ESLint or Prettier.

### Example with Prettier

By default Prettier [prefers double quotes](https://prettier.io/docs/rationale#strings).

#### Previously

1. Stage `file.js` with only double quotes `"` changed to `'`
1. Run `git commit -am "I don't like double quotes"`
1. _Lint-staged_ runs `prettier --write file.js`, converting all the `'` back to `"`
1. Because there are now no changes, _lint-staged_ fails, cancels the commit, and resets back to the original state
1. Commit was not done, original state is restored and single quotes `'` are staged

#### Now

1. Stage `file.js` with only double-quotes `"` changed to `'`
1. Run `git commit -am "I don't like double quotes"`
1. _Lint-staged_ runs `prettier --write file.js`, converting all the `'` back to `"`
1. Because there are now no changes, _lint-staged_ fails and cancels the commit
1. Commit was not done, and there are no staged changes
