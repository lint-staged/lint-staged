---
'lint-staged': patch
---

To improve performance, only use `lilconfig` when searching for config files outside the git repo. In the regular case, _lint-staged_ finds the config files from the Git index and loads them directly.
