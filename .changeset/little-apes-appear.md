---
'lint-staged': minor
---

Task functions like `{ title, task }` can now use a logger function `log()` to emit output while the task runs. By default, the output will only be visible if the tasks fails, unless the `--verbose` option was used. Additionally, when the task rejects, the error will be shown in the output.

```js
import { defineConfig } from './lib/config.js'

export default defineConfig({
  '*': {
    title: 'Fail if PDF files are committed',
    task: async (filepaths, { log }) => {
      const pdfFiles = filepaths.filter((f) => f.toLowerCase().endsWith('.pdf'))
      if (pdfFiles.length > 0) {
        log('PDF files should not be committed: %s', pdfFiles)
        throw new Error('Failed')
      }
    },
  },
})
```
