---
'lint-staged': patch
---

The new `--hide-unstaged` flag works faster by using `git restore`, available since Git 2.23.0 (2019). Although _lint-staged_ doesn't have a minimum required Git version, this is a lower bound for using that feature.
