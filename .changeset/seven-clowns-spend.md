---
'lint-staged': minor
---

The current `node` executable's directory is now added to the start of the `PATH` environment variable of spawned tasks. This helps _lint-staged_ spawn tasks using the same Node.js executable that _lint-staged_ itself was started with, and fixes the following issues:

- When using a Node.js version manager with multiple versions installed ([nvm](https://github.com/nvm-sh/nvm), [n](https://github.com/tj/n), for example), scripts with the `#!/usr/bin/env node` shebang ([Prettier](https://github.com/prettier/prettier), [ESLint](https://github.com/eslint/eslint), for example) were previously spawned using the default Node.js version configured by the version manager (the one `which node` points to) on POSIX systems. Now, they will be spawned with the same version that _lint-staged_ itself was started with.
  - For example, if your default Node.js version is 24.14.1 but _lint-staged_ is run with the latest version 25.9.0, the tasks spawned by _lint-staged_ will now also use version 25.9.0. Previously they were spawned using 24.14.1.
- When installing Node.js from the Ubuntu App Center ([Snap store](https://snapcraft.io/store)), the `node` executable available in `PATH` is a symlink pointing to Snap itself. The sandboxing features of Snap prevented _lint-staged_ from spawning scripts with the `#!/usr/bin/env node` shebang, because it meant _lint-staged_ tried to spawn Snap via the symlink. This resulted in an `ENOENT` error when trying to run `prettier`, for example. Now, since the real `node` executable's directory is available in the `PATH`, _lint-staged_ will instead spawn the script with the real `node` binary succesfully.
