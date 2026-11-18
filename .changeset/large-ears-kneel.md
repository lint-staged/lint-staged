---
'lint-staged': patch
---

Version `v17.6.0` introduced automatic staging of all tracked files edited by tasks, even if the files were not originally staged. This version adjusts the behavior so that when using a pathspec like `git commit file.js` (implying `--only`), the staging is limited to those files. The default behavior when running `git commit` is unchanged.
