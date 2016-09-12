# 3.0.2

- Removed unused dependecies

# 3.0.1

- Switched to listr. Simplified code and more beautiful output.
- Switched to execa. Should fix #30
- Use ES2015. Dropped support for Node < 4.x
- Support commands with arguments in the lint-staged config. Closes #47
- Support binaries from $PATH. Closes #47
- Removed `--color` option from runner. You should pass arguments yourself.

# 2.0.3

- Use `cross-spawn` to fix issues with Windows. Closes #30. (#34)
- Updated dependencies

# 2.0.2

- Fixes an error when running a config with just one task (#28). #27 @Anber.
- Beautiful string representation for multiple linters in case of error.
- Added tests to getLintersAsString.

# 2.0.1

- When on of the sequential tasks fails, exit the process. Closes #26

# 2.0.0

- Support for sequences of commands. Needs config update! #25 @okonet
- Allow adding files to the commit after running a task. #16 @okonet

# 1.0.2

- Fixed path resolution to the app root on Windows. #19 by <OJ Kwon>

# 1.0.1

- Fixed support of local npm scripts from package.json

# 1.0.0

- Complete re-write using Node.js API to fix #5, #6, #7, #8
- Switched to staged-git-files that supports git filter. Exclude deleted files. Closes #12

# 0.2.2

- Switch to bin/bash and fix file existncy check #9 @fubhy
- Switch to `$(npm bin)` instead of hardcoding path #9 @fubhy
- Updated flow installation instructions @okonet

# 0.2.1

- Fixed path for flow binary #4 @nikgraf

# 0.2.0

- Added more linters: flow, JSCS @okonet
- Better console output when no binary is found @okonet
- Better README @okonet

# 0.1.1

- Initial release
