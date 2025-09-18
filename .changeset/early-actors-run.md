---
'lint-staged': patch
---

Due to recent phishing attacks, for example [chalk@5.6.1](https://github.com/chalk/chalk/issues/656) was released with malware. To avoid _lint-staged_'s users being at risk the **direct dependencies are pinned to exact versions**, instead of allowing future patch versions with the [caret (`^`) range](https://docs.npmjs.com/cli/v6/using-npm/semver#caret-ranges-123-025-004).
