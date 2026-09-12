---
'lint-staged': patch
---

The assigment of staged files to _lint-staged_ configuration files (when using multiple, for example in a monorepo) has been rewritten to be more efficient. As a reminder, each staged file is assigned to exactly one configuration (the closest one), even if that config doesn't match the file in its globs.
