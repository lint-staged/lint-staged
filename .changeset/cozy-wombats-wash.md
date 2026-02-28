---
'lint-staged': patch
---

Incorrect brace expansions like `*.{js}` (_nothing to expand_) are detected exhaustively, instead of just a single pass.
