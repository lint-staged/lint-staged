---
'lint-staged': patch
---

Use native "git rev-parse" commands to determine git repo root directory and the .git config directory, instead of using custom logic. This hopefully makes path resolution more robust on non-POSIX systems.
