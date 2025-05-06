---
'lint-staged': major
---

The `--shell` flag has been removed and _lint-staged_ no longer supports evaluating commands directly via a shell. To migrate existing commands, you can create a shell script and invoke it instead. Lint-staged will pass matched staged files as a list of arguments, accessible via `"$@"`:

```shell
# my-script.sh
#!/bin/bash

echo "Staged files: $@"
```

and

```json
{ "*.js": "my-script.sh" }
```

If you were using the shell option to avoid passing filenames to tasks, for example `bash -c 'tsc --noEmit'`, use the function syntax instead:

```js
export default { '*.ts': () => 'tsc --noEmit' }
```
