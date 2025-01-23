---
'lint-staged': patch
---

Change _lint-staged_'s dependencies to use [caret (`^`) ranges](https://docs.npmjs.com/cli/v6/using-npm/semver#caret-ranges-123-025-004) instead of [tilde (`~`)](https://docs.npmjs.com/cli/v6/using-npm/semver#tilde-ranges-123-12-1). This makes it easier for package managers to perform dependency management when minor-level updates are also permitted instead of just patch-level.
