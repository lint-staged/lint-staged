---
'lint-staged': minor
---

Remove [`execa`](https://github.com/sindresorhus/execa) as a dependency and use a smaller built-in wrapper for `spawn()` from `node:child_process`.
