---
'lint-staged': patch
---

Try to improve terminating of subprocess of tasks by using `SIGKILL`, and only calling `pidtree` when the the main task process has a known pid.
