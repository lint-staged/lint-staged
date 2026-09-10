---
'lint-staged': patch
---

Fix TypeScript issue `TS1254` from `defineConfig()` by changing the signature from `const` to a `function`:

> A 'const' initializer in an ambient context must be a string or numeric literal or literal enum reference.
