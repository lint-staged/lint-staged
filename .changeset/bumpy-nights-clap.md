---
'lint-staged': patch
---

Fix performance regression of _lint-staged_ v17 by going back to using `git add` to stage task modifications. This was changed to `git update-index --again` in v17 for less manual work, but unfortunately the `update-index` command gets slower in very large Git repos.
