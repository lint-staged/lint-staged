---
'lint-staged': patch
---

Remove [chalk](https://github.com/chalk/chalk) as a dependency due to recent malware issue; read more at https://github.com/chalk/chalk/issues/656.

If you are having trouble with ANSI color codes when using _lint-staged_, you can try setting either `FORCE_COLOR=true` or `NO_COLOR=true` env variables.
