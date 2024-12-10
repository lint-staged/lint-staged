---
'lint-staged': patch
---

Do not treat submodule root paths as "staged files". This caused _lint-staged_ to fail to a Git error when only updating the revision of a submodule.
