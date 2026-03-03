---
'lint-staged': patch
---

Prefer to spawn binaries from closest `node_modules/.bin` before global locations in `PATH`. This matches the behavior of `npm` and previous versions of _lint-staged_, before switching to `tinyexec` in `v16.3.0`.
