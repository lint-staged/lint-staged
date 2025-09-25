---
'lint-staged': patch
---

Fix searching configuration files when the working directory is a subdirectory of a git repository, and there are `package.json` files in the working directory. This situation might happen when running _lint-staged_ for a single package in a monorepo.
