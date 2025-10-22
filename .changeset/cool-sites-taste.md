---
'lint-staged': patch
---

Fix problems with `--continue-on-error` option, where tasks might have still been killed (`SIGINT`) when one of them failed.
