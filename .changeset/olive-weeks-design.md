---
'lint-staged': minor
---

Internal _lint-staged_ errors are now thrown and visible in the console output. Previously they were caught with the process exit code set to 1, but not logged. This happens when, for example, there's a syntax error in the _lint-staged_ configuration file.
