---
'lint-staged': patch
---

Clean up the `SIGINT` event listener after running. This is used to handle manually stopping _lint-staged_ while running, e.g. by pressing `CTRL+C`.
