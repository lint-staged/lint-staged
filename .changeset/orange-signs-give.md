---
'lint-staged': patch
---

Fix documentation about multiple config files and the `--cwd` option. When using it, all tasks will be run in the specified directory. For example, to run everything in the actual `process.cwd()`, use `lint-staged --cwd="."`.
