---
'lint-staged': minor
---

Added support for directly running functions on staged files. To configure a function task, use an object with a title and the task itself:

```js
export default {
  '*.js': {
    title: 'My task',
    task: async (files) => {
      console.log('Staged JS files:', files)
    },
  },
}
```

_Lint-staged_ will run your function task with the staged files matching the configured glob as its argument, and show the custom title in its console output.
