---
'lint-staged': minor
---

_Lint-staged_ now ships with TypeScript types for the configuration and main Node.js API. You can use the JSDoc syntax in your JS configuration files:

```js
/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*': 'prettier --write',
}
```

It's also possible to use the `.ts` file extension for the configuration if your Node.js version supports it. The `--experimental-strip-type` flag was introduced in [Node.js v22.6.0](https://github.com/nodejs/node/releases/tag/v22.6.0) and unflagged in [v23.6.0](https://github.com/nodejs/node/releases/tag/v23.6.0), enabling Node.js to execute TypeScript files without additional configuration.
