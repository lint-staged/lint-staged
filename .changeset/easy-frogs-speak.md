---
'lint-staged': minor
---

Processes are spawned using [nano-spawn](https://github.com/sindresorhus/nano-spawn) instead of [execa](https://github.com/sindresorhus/execa). If you are using Node.js scripts as tasks, you might need to explicitly run them with `node`, especially when using Windows:

```json
{
  "*.js": "node my-js-linter.js"
}
```
