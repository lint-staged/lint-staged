---
'lint-staged': patch
---

When determining git directory, use `fs.realpath()` only for symlinks. It looks like `fs.realpath()` changes some Windows mapped network filepaths unexpectedly, causing issues.
