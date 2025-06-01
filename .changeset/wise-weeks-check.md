---
'lint-staged': patch
---

This version fixes incorrect behavior where unstaged changes were committed when using the `--no-stash` option. This happened because `--no-stash` implied `--no-hide-partially-staged`, meaning unstaged changes to files which also had other staged changes were added to the commit by _lint-staged_; this is no longer the case.

The previous (incorrect) behavior can still be achieved by using both options `--no-stash --no-hide-partially-staged` at the same time.
