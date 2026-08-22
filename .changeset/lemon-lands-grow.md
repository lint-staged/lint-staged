---
'lint-staged': minor
---

Added a new `defineConfig` helper for type-checking the _lint-staged_ configuration:

```ts
// lint-staged.config.ts

import { defineConfig } from 'lint-staged/config'

export default defineConfig({
  '*.js': ['prettier --check', 'eslint'],
})
```
