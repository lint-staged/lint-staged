---
'lint-staged': minor
---

Replace use of `execa` with a simple wrapper for `spawn()` from `node:child_process`, when using git commands internally. The user-configured tasks still use `execa`.

Because we require at least Node.js v18.12.0, it is possible to simplify and drop external dependencies.
