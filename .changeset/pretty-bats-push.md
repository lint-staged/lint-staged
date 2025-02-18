---
'lint-staged': major
---

Validation for deprecated advanced configuration has been removed. The advanced configuration was removed in _lint-staged_ version 9 and until now validation has failed if advanced configuration options were detected. Going forward the entire configuration will be treated with the same logic and if these advanced options are still present, they might be treated as valid globs for staged files instead.
