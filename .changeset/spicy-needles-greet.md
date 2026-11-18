---
'lint-staged': patch
---

Similar to the above, when using `--fail-on-changes` and a pathspec like `git commit file.js` (implying `--only`), the commit will fail only if those files were changed. The default behavior when running `git commit` is unchanged, and the commit will fail on any changes to tracked files.
