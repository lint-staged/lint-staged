---
'lint-staged': minor
---

Remove [debug](https://github.com/debug-js/debug) as a dependency due to recent malware issue; read more at https://github.com/debug-js/debug/issues/1005. Because of this, the `DEBUG` environment variable is no longer supported — use the `--debug` to enable debugging
