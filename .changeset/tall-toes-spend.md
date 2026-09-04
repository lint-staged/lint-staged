---
'lint-staged': patch
---

Update `tinyexec@1.3.1` so that local binaries from `node_modules/.bin` are resolved starting from the directory of each _lint-staged_ configuration file (in monorepo setups). This behavior was broken in `lint-staged@16.3.0` where they were only resolved from the current working directory and up.
