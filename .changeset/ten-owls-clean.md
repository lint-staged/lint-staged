---
'lint-staged': minor
---

It is now possible to run multiple tasks in parallel for a single glob by configuring it with an array of tasks (which run sequentially), and then placing another array inside it (where the tasks will run in parallel). The following demonstrates the order tasks will start in:

```json
{
  "*.ts": ["first", "second", ["third", "third"], "fourth"]
}
```

As a concrete example, _lint-staged_'s own configuration is:

```js
/** @type {import('./lib/index.js').Configuration} */
export default {
  '*': [
    ['oxfmt --check --no-error-on-unmatched-pattern', 'oxlint --no-error-on-unmatched-pattern'],
  ],
  '*.ts': () => 'tsc',
}
```

which means:

1. for all staged files, run the two commands in parallel with staged filenames appended, for example:
   - `oxfmt --check --no-error-on-unmatched-pattern lib/index.js`
   - `oxlint --no-error-on-unmatched-pattern lib/index.js`
1. additionally, if any `*.ts` files are staged, run `tsc` without appending any arguments
1. The two sets of commands also run in parallel
