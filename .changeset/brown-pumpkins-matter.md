---
'lint-staged': minor
---

_Lint-staged_ now ships with TypeScript types for the configuration. You can use the JSDoc syntax in your JS configuration files:

```js
/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*': 'prettier --write',
}
```
