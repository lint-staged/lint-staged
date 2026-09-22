---
'lint-staged': patch
---

Fix running parallel tasks for a single glob, when tasks are created by a function. Nesting one level of arrays inside an array of tasks will result result in the inner tasks running in parallel. This behavior should now be consistent when creating tasks using functions. In the following example `eslint` and `prettier` will run in parallel (for all files, when any JS files are staged):

```js
export default defineConfig({
  '*.js': () => [['eslint --max-warnings=0 .', 'prettier --list-different .']],
})
```
