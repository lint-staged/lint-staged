---
'lint-staged': major
---

The `--shell` flag has been removed and _lint-staged_ no longer supports evaluating commands directly via a shell. To migrate existing commands, you can create a shell script and invoke it instead. Lint-staged will pass matched staged files as a list of arguments, accessible via `"$@"`:

```shell
#!/bin/bash

echo "Staged files: $@"
```
