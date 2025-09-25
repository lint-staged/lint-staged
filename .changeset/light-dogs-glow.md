---
'lint-staged': patch
---

The built-in TypeScript types have been updated to more closely match the implementation. Notably, the list of staged files supplied to task functions is `readonly string[]` and can't be mutated. Thanks [@outslept](https://github.com/outslept)!

```diff
export default {
---  "*": (files: string[]) => void console.log('staged files', files)
+++  "*": (files: readonly string[]) => void console.log('staged files', files)
}
```
