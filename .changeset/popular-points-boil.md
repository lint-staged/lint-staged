---
'lint-staged': minor
---

_Lint-staged_ now always saves debug logs to a file in the OS's temp directory, and outputs the path on errors. This should make it easier to debug any errors without needing to use the `--debug` flag.
