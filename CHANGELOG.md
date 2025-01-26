# lint-staged

## 15.4.3

### Patch Changes

- [#1512](https://github.com/lint-staged/lint-staged/pull/1512) [`cbfed1d`](https://github.com/lint-staged/lint-staged/commit/cbfed1dfd2465c4198c692955281f0836600bea1) Thanks [@tarik02](https://github.com/tarik02)! - Adjust TypeScript types for the default export so that it can be used as a value without error TS2693.

## 15.4.2

### Patch Changes

- [#1509](https://github.com/lint-staged/lint-staged/pull/1509) [`8827ebf`](https://github.com/lint-staged/lint-staged/commit/8827ebf29dc8f25149a36450b4a0023425202e18) Thanks [@iiroj](https://github.com/iiroj)! - Change _lint-staged_'s dependencies to use [caret (`^`) ranges](https://docs.npmjs.com/cli/v6/using-npm/semver#caret-ranges-123-025-004) instead of [tilde (`~`)](https://docs.npmjs.com/cli/v6/using-npm/semver#tilde-ranges-123-12-1). This makes it easier for package managers to perform dependency management when minor-level updates are also permitted instead of just patch-level.

## 15.4.1

### Patch Changes

- [#1504](https://github.com/lint-staged/lint-staged/pull/1504) [`1c7a45e`](https://github.com/lint-staged/lint-staged/commit/1c7a45ed2c7fee9d5f55337be16a51e4c9b240e1) Thanks [@iiroj](https://github.com/iiroj)! - Default TypeScript config filenames match JS equivalents.

- [#1504](https://github.com/lint-staged/lint-staged/pull/1504) [`9cc18c9`](https://github.com/lint-staged/lint-staged/commit/9cc18c9debb185490f9ae4f9c1d21ec8c2587393) Thanks [@iiroj](https://github.com/iiroj)! - Add missing conditional exports syntax for TypeScript types.

## 15.4.0

### Minor Changes

- [#1500](https://github.com/lint-staged/lint-staged/pull/1500) [`a8ec1dd`](https://github.com/lint-staged/lint-staged/commit/a8ec1ddb587d2c1c2420dbb4baff8160f0ac46c9) Thanks [@iiroj](https://github.com/iiroj)! - _Lint-staged_ now provides TypeScript types for the configuration and main Node.js API. You can use the JSDoc syntax in your JS configuration files:

  ```js
  /**
   * @filename: lint-staged.config.js
   * @type {import('lint-staged').Configuration}
   */
  export default {
    '*': 'prettier --write',
  }
  ```

  It's also possible to use the `.ts` file extension for the configuration if your Node.js version supports it. The `--experimental-strip-types` flag was introduced in [Node.js v22.6.0](https://github.com/nodejs/node/releases/tag/v22.6.0) and unflagged in [v23.6.0](https://github.com/nodejs/node/releases/tag/v23.6.0), enabling Node.js to execute TypeScript files without additional configuration.

  ```shell
  export NODE_OPTIONS="--experimental-strip-types"

  npx lint-staged --config lint-staged.config.ts
  ```

### Patch Changes

- [#1501](https://github.com/lint-staged/lint-staged/pull/1501) [`9b79364`](https://github.com/lint-staged/lint-staged/commit/9b793640e1f87b46e4f40fcfc1ecf9d6f6013ac9) Thanks [@iiroj](https://github.com/iiroj)! - Handle possible failures when logging user shell for debug info.

## 15.3.0

### Minor Changes

- [#1495](https://github.com/lint-staged/lint-staged/pull/1495) [`e69da9e`](https://github.com/lint-staged/lint-staged/commit/e69da9e614db2d45f56e113d45d5ec0157813423) Thanks [@iiroj](https://github.com/iiroj)! - Added more info to the debug logs so that "environment" info doesn't need to be added separately to GitHub issues.

- [#1493](https://github.com/lint-staged/lint-staged/pull/1493) [`fa0fe98`](https://github.com/lint-staged/lint-staged/commit/fa0fe98104f8885f673b98b8b49ae586de699c5e) Thanks [@iiroj](https://github.com/iiroj)! - Added more help messages around the automatic `git stash` that _lint-staged_ creates as a backup (by default). The console output also displays the short git _hash_ of the stash so that it's easier to recover lost files in case some fatal errors are encountered, or the process is killed before completing.

  For example:

  ```
  % npx lint-staged
  ✔ Backed up original state in git stash (20addf8)
  ✔ Running tasks for staged files...
  ✔ Applying modifications from tasks...
  ✔ Cleaning up temporary files...
  ```

  where the backup can be seen with `git show 20addf8`, or `git stash list`:

  ```
  % git stash list
  stash@{0}: lint-staged automatic backup (20addf8)
  ```

## 15.2.11

### Patch Changes

- [#1484](https://github.com/lint-staged/lint-staged/pull/1484) [`bcfe309`](https://github.com/lint-staged/lint-staged/commit/bcfe309fca88aedf42b6a321383de49eb361c5a0) Thanks [@wormsik](https://github.com/wormsik)! - Escape paths containing spaces when using the "shell" option.

- [#1487](https://github.com/lint-staged/lint-staged/pull/1487) [`7dd8caa`](https://github.com/lint-staged/lint-staged/commit/7dd8caa8f80fe1a6ce40939c1224b6774000775a) Thanks [@iiroj](https://github.com/iiroj)! - Do not treat submodule root paths as "staged files". This caused _lint-staged_ to fail to a Git error when only updating the revision of a submodule.

## 15.2.10

### Patch Changes

- [#1471](https://github.com/lint-staged/lint-staged/pull/1471) [`e3f283b`](https://github.com/lint-staged/lint-staged/commit/e3f283b250868b7c15ceb54d2a51b2e5fb3a18a9) Thanks [@iiroj](https://github.com/iiroj)! - Update minor dependencies, including `micromatch@~4.0.8`.

## 15.2.9

### Patch Changes

- [#1463](https://github.com/lint-staged/lint-staged/pull/1463) [`b69ce2d`](https://github.com/lint-staged/lint-staged/commit/b69ce2ddfd5a7ae576f4fef4afc60b8a81f3c945) Thanks [@iiroj](https://github.com/iiroj)! - Set the maximum number of event listeners to the number of tasks. This should silence the console warning `MaxListenersExceededWarning: Possible EventEmitter memory leak detected`.

## 15.2.8

### Patch Changes

- [`f0480f0`](https://github.com/lint-staged/lint-staged/commit/f0480f01b24b9f6443a12515d413a7ba4dda3981) Thanks [@iiroj](https://github.com/iiroj)! - In the previous version the native `git rev-parse --show-toplevel` command was taken into use for resolving the current git repo root. This version switched the `--show-toplevel` flag with `--show-cdup`, because on Git installed via MSYS2 the former was returning absolute paths that do not work with Node.js `child_process`. The new flag returns a path relative to the working directory, avoiding the issue.

  The GitHub Actions workflow has been updated to install Git via MSYS2, to ensure better future compatibility; using the default Git binary in the GitHub Actions runner was working correctly even with MSYS2.

## 15.2.7

### Patch Changes

- [#1440](https://github.com/lint-staged/lint-staged/pull/1440) [`a51be80`](https://github.com/lint-staged/lint-staged/commit/a51be804b63307ac7af3c82f4cb2d43dbe92daac) Thanks [@iiroj](https://github.com/iiroj)! - In the previous version the native `git rev-parse --show-toplevel` command was taken into use for resolving the current git repo root. This version drops the `--path-format=absolute` option to support earlier git versions since it's also the default behavior. If you are still having trouble, please try upgrading `git` to the latest version.

## 15.2.6

### Patch Changes

- [#1433](https://github.com/lint-staged/lint-staged/pull/1433) [`119adb2`](https://github.com/lint-staged/lint-staged/commit/119adb29854cabddbfcf0469d7c8a0126184a5d4) Thanks [@iiroj](https://github.com/iiroj)! - Use native "git rev-parse" commands to determine git repo root directory and the .git config directory, instead of using custom logic. This hopefully makes path resolution more robust on non-POSIX systems.

## 15.2.5

### Patch Changes

- [#1424](https://github.com/lint-staged/lint-staged/pull/1424) [`31a1f95`](https://github.com/lint-staged/lint-staged/commit/31a1f9548ea8202bc5bd718076711f747396e3ca) Thanks [@iiroj](https://github.com/iiroj)! - Allow approximately equivalent versions of direct dependencies by using the "~" character in the version ranges. This means a more recent patch version of a dependency is allowed if available.

- [#1423](https://github.com/lint-staged/lint-staged/pull/1423) [`91abea0`](https://github.com/lint-staged/lint-staged/commit/91abea0d298154d92113ba34bae4020704e22918) Thanks [@iiroj](https://github.com/iiroj)! - Improve error logging when failing to read or parse a configuration file

- [#1424](https://github.com/lint-staged/lint-staged/pull/1424) [`ee43f15`](https://github.com/lint-staged/lint-staged/commit/ee43f154097753dd5448766f792387e60e0ea453) Thanks [@iiroj](https://github.com/iiroj)! - Upgrade micromatch@4.0.7

## 15.2.4

### Patch Changes

- [`4f4537a`](https://github.com/lint-staged/lint-staged/commit/4f4537a75ebfba816826f6f67a325dbc7f25908a) Thanks [@iiroj](https://github.com/iiroj)! - Fix release issue with previous version; update dependencies

## 15.2.3

### Patch Changes

- [#1407](https://github.com/lint-staged/lint-staged/pull/1407) [`d698162`](https://github.com/lint-staged/lint-staged/commit/d6981627472315adb01a46f797c8581393e8a637) Thanks [@iiroj](https://github.com/iiroj)! - Update dependencies

## 15.2.2

### Patch Changes

- [#1391](https://github.com/lint-staged/lint-staged/pull/1391) [`fdcdad4`](https://github.com/lint-staged/lint-staged/commit/fdcdad42ff96fea3c05598e378d3c44ad4a51bde) Thanks [@iiroj](https://github.com/iiroj)! - _Lint-staged_ no longer tries to load configuration from files that are not checked out. This might happen when using sparse-checkout.

## 15.2.1

### Patch Changes

- [#1387](https://github.com/lint-staged/lint-staged/pull/1387) [`e4023f6`](https://github.com/lint-staged/lint-staged/commit/e4023f687616dcf4816545b8eefbcce50e255c9c) Thanks [@iiroj](https://github.com/iiroj)! - Ignore stdin of spawned commands so that they don't get stuck waiting. Until now, _lint-staged_ has used the default settings to spawn linter commands. This means the `stdin` of the spawned commands has accepted input, and essentially gotten stuck waiting. Now the `stdin` is ignored and commands will no longer get stuck. If you relied on this behavior, please open a new issue and describe how; the behavior has not been intended.

## 15.2.0

### Minor Changes

- [#1371](https://github.com/lint-staged/lint-staged/pull/1371) [`f3378be`](https://github.com/lint-staged/lint-staged/commit/f3378be894fb84800341800b1e4f6f8bc8dfd904) Thanks [@iiroj](https://github.com/iiroj)! - Using the `--no-stash` flag no longer discards all unstaged changes to partially staged files, which resulted in inadvertent data loss. This fix is available with a new flag `--no-hide-partially-staged` that is automatically enabled when `--no-stash` is used.

### Patch Changes

- [#1362](https://github.com/lint-staged/lint-staged/pull/1362) [`17bc480`](https://github.com/lint-staged/lint-staged/commit/17bc480c0f8767407a87527931558de8d1d1551d) Thanks [@antonk52](https://github.com/antonk52)! - update lilconfig@3.0.0

- [#1368](https://github.com/lint-staged/lint-staged/pull/1368) [`7c55ca9`](https://github.com/lint-staged/lint-staged/commit/7c55ca9f410043016e8b33b3b523b9b7e764acf4) Thanks [@iiroj](https://github.com/iiroj)! - Update most dependencies

- [#1368](https://github.com/lint-staged/lint-staged/pull/1368) [`777d4e9`](https://github.com/lint-staged/lint-staged/commit/777d4e976852af4c181ffbe055f3531343349695) Thanks [@iiroj](https://github.com/iiroj)! - To improve performance, only use `lilconfig` when searching for config files outside the git repo. In the regular case, _lint-staged_ finds the config files from the Git index and loads them directly.

- [#1373](https://github.com/lint-staged/lint-staged/pull/1373) [`85eb0dd`](https://github.com/lint-staged/lint-staged/commit/85eb0ddab1eba0c0bcc8cc109e17dc2bbb3d044e) Thanks [@iiroj](https://github.com/iiroj)! - When determining git directory, use `fs.realpath()` only for symlinks. It looks like `fs.realpath()` changes some Windows mapped network filepaths unexpectedly, causing issues.

## 15.1.0

### Minor Changes

- [#1344](https://github.com/lint-staged/lint-staged/pull/1344) [`0423311`](https://github.com/lint-staged/lint-staged/commit/04233115a5e25d6fa7d357cbe9d42173ae8a1acf) Thanks [@danielbayley](https://github.com/danielbayley)! - Add support for loading configuration from `package.yaml` and `package.yml` files, supported by `pnpm`.

### Patch Changes

- [#1355](https://github.com/lint-staged/lint-staged/pull/1355) [`105d901`](https://github.com/lint-staged/lint-staged/commit/105d9012fc92fca549987816406450075cf255f3) Thanks [@iiroj](https://github.com/iiroj)! - Suppress some warnings when using the "--quiet" flag

## 15.0.2

### Patch Changes

- [#1339](https://github.com/lint-staged/lint-staged/pull/1339) [`8e82364`](https://github.com/lint-staged/lint-staged/commit/8e82364dd89155e96de574cfb38a94d28b8635af) Thanks [@iiroj](https://github.com/iiroj)! - Update dependencies, including listr2@7.0.2 to fix an upstream issue affecting lint-staged.

## 15.0.1

### Patch Changes

- [#1217](https://github.com/lint-staged/lint-staged/pull/1217) [`d2e6f8b`](https://github.com/lint-staged/lint-staged/commit/d2e6f8b1e1cd84ba6eb2f3f6a7f650c882987041) Thanks [@louneskmt](https://github.com/louneskmt)! - Previously it was possible for a function task to mutate the list of staged files passed to the function, and accidentally affect the generation of other tasks. This is now fixed by passing a copy of the original file list instead.

## 15.0.0

### Major Changes

- [#1322](https://github.com/okonet/lint-staged/pull/1322) [`66b93aa`](https://github.com/okonet/lint-staged/commit/66b93aac870d155ca81302b2574617da99409ca7) Thanks [@iiroj](https://github.com/iiroj)! - **Require at least Node.js 18.12.0**

  This release drops support for Node.js 16, which is EOL after 2023-09-11.
  Please upgrade your Node.js to the latest version.

  Additionally, all dependencies have been updated to their latest versions.

## [v14.0.1](https://github.com/okonet/lint-staged/releases/tag/v14.0.1) - 21 Aug 2023

### Bug Fixes

- fix reading config from stdin, introduced in v14.0.0 ([#1317](https://github.com/okonet/lint-staged/issues/1317)) ([fc3bfea](https://github.com/okonet/lint-staged/commit/fc3bfeabae29b65f99b6911a989b0b41d3d1128e))

## [v14.0.0](https://github.com/okonet/lint-staged/releases/tag/v14.0.0) - 13 Aug 2023

### Features

- drop support for Node.js 14 ([#1312](https://github.com/okonet/lint-staged/issues/1312)) ([9da8777](https://github.com/okonet/lint-staged/commit/9da877711a7547b9122c6af91683fb2a2f398184))

### BREAKING CHANGES

- Please upgrade your Node.js version to at least `16.14.0`.

## [v13.3.0](https://github.com/okonet/lint-staged/releases/tag/v13.3.0) - 13 Aug 2023

### Bug Fixes

- **dependencies:** update most dependencies ([7443870](https://github.com/okonet/lint-staged/commit/7443870b2c24ead8613295cbfa1fe80f96167e1c))
- detect duplicate redundant braces in pattern ([d895aa8](https://github.com/okonet/lint-staged/commit/d895aa8382b769f841c6bdc52ba59755bb0ed28b))

### Features

- **dependencies:** update `listr2@6.6.0` ([09844ca](https://github.com/okonet/lint-staged/commit/09844ca3f6b99feba8f3c0ea10e60a6e6df511ad))

## [v13.2.3](https://github.com/okonet/lint-staged/releases/tag/v13.2.3) - 28 Jun 2023

### Bug Fixes

- the `--diff` option implies `--no-stash` ([66a716d](https://github.com/okonet/lint-staged/commit/66a716d5a32c49f03b9a34350fec1b2411bada17))

## [v13.2.2](https://github.com/okonet/lint-staged/releases/tag/v13.2.2) - 26 Apr 2023

### Bug Fixes

- **dependencies:** update `yaml@2.2.2` (GHSA-f9xv-q969-pqx4) ([#1290](https://github.com/okonet/lint-staged/issues/1290)) ([cf691aa](https://github.com/okonet/lint-staged/commit/cf691aa188719d9479ceaeffbffe814594fdb65f))

## [v13.2.1](https://github.com/okonet/lint-staged/releases/tag/v13.2.1) - 07 Apr 2023

### Bug Fixes

- ignore "package.json" as config file when it's invalid JSON ([#1281](https://github.com/okonet/lint-staged/issues/1281)) ([e7ed6f7](https://github.com/okonet/lint-staged/commit/e7ed6f741d2ea0f084b06f3e1ac3d1d57fadf737))

## [v13.2.0](https://github.com/okonet/lint-staged/releases/tag/v13.2.0) - 10 Mar 2023

### Bug Fixes

- **dependencies:** replace `colorette` with `chalk` for better color support detection ([f598725](https://github.com/okonet/lint-staged/commit/f5987252ae59537727a93373b59ab47bc2651a2f))
- use index-based stash references for improved MSYS2 compatibility ([#1270](https://github.com/okonet/lint-staged/issues/1270)) ([60fcd99](https://github.com/okonet/lint-staged/commit/60fcd99451b88336a05ebbe71cda8909d2733ad7))

### Features

- version bump only ([#1275](https://github.com/okonet/lint-staged/issues/1275)) ([05fb382](https://github.com/okonet/lint-staged/commit/05fb3829faa5437276d98450c34699fecfc8c1c8))

## [v13.1.2](https://github.com/okonet/lint-staged/releases/tag/v13.1.2) - 13 Feb 2023

### Bug Fixes

- disable stash by default when using diff option ([#1259](https://github.com/okonet/lint-staged/issues/1259)) ([142c6f2](https://github.com/okonet/lint-staged/commit/142c6f225087207ec4c63b7847795857d567ce40))

## [v13.1.1](https://github.com/okonet/lint-staged/releases/tag/v13.1.1) - 07 Feb 2023

### Bug Fixes

- allow re-enabling `--stash` when using the `--diff` option ([99390c3](https://github.com/okonet/lint-staged/commit/99390c31a856154e380f04d5c3603d2e6428f1e5))

## [v13.1.0](https://github.com/okonet/lint-staged/releases/tag/v13.1.0) - 04 Dec 2022

### Features

- expose cli entrance from "lint-staged/bin" ([#1237](https://github.com/okonet/lint-staged/issues/1237)) ([eabf1d2](https://github.com/okonet/lint-staged/commit/eabf1d217d8bd2559b1087c92b5ec9b15b8ffa7e))

## [v13.0.4](https://github.com/okonet/lint-staged/releases/tag/v13.0.4) - 25 Nov 2022

### Bug Fixes

- **deps:** update all dependencies ([336f3b5](https://github.com/okonet/lint-staged/commit/336f3b513a8b36579165b2e6fb6e7059b988fe84))
- **deps:** update all dependencies ([ec995e5](https://github.com/okonet/lint-staged/commit/ec995e53fb173f2863cb3cc08a92ffa9252dc25d))

## [v13.0.3](https://github.com/okonet/lint-staged/releases/tag/v13.0.3) - 24 Jun 2022

### Bug Fixes

- correctly handle git stash when using MSYS2 ([#1178](https://github.com/okonet/lint-staged/issues/1178)) ([0d627a5](https://github.com/okonet/lint-staged/commit/0d627a52846d63cd6fc6018a8d7779ef454a99b2))

## [v13.0.2](https://github.com/okonet/lint-staged/releases/tag/v13.0.2) - 16 Jun 2022

### Bug Fixes

- use new `--diff` and `--diff-filter` options when checking task modifications ([1a5a66a](https://github.com/okonet/lint-staged/commit/1a5a66a9574e2a8b857bd62545a6f2a6da5811aa))

## [v13.0.1](https://github.com/okonet/lint-staged/releases/tag/v13.0.1) - 08 Jun 2022

### Bug Fixes

- correct spelling of "0 files" ([f27f1d4](https://github.com/okonet/lint-staged/commit/f27f1d45ea20904e81dda155a802b2eb07d50942))
- suppress error from `process.kill` when killing tasks on failure ([f2c6bdd](https://github.com/okonet/lint-staged/commit/f2c6bdd9114a8d5ba8473cc647ef55a6ee5664e1))
- **deps:** update pidtree@^0.6.0 to fix screen size error in WSL ([1a77e42](https://github.com/okonet/lint-staged/commit/1a77e4224a273bbc192b654d0a0120187e850a61))
- ignore "No matching pid found" error ([cb8a432](https://github.com/okonet/lint-staged/commit/cb8a4328eddbc99a0806276f68b55f6c5ecb3d8a))
- prevent possible race condition when killing tasks on failure ([bc92aff](https://github.com/okonet/lint-staged/commit/bc92aff5fdb6293045c556326df3c0529e59b7e3))

### Performance Improvements

- use `EventsEmitter` instead of `setInterval` for killing tasks on failure ([c508b46](https://github.com/okonet/lint-staged/commit/c508b46a153970114495d3f7fef05d45df0f2e10))

## [v13.0.0](https://github.com/okonet/lint-staged/releases/tag/v13.0.0) - 01 Jun 2022

### Bug Fixes

- **deps:** update `execa@^6.1.0` ([659c85c](https://github.com/okonet/lint-staged/commit/659c85c5cd4c4040a505bbe9fddbe7d416ac15c8))
- **deps:** update `yaml@^2.1.1` ([2750a3d](https://github.com/okonet/lint-staged/commit/2750a3d9d909fd834b95da752f0f6800340922b7))

### Features

- remove support for Node.js 12 ([5fb6df9](https://github.com/okonet/lint-staged/commit/5fb6df94ccd6de6f5fdd743474c094ff366cc671))

### BREAKING CHANGES

- `lint-staged` will no longer support Node.js 12, which is EOL since 30 April 2022

## [v12.5.0](https://github.com/okonet/lint-staged/releases/tag/v12.5.0) - 31 May 2022

### Bug Fixes

- include all files when using `--config <path>` ([641d1c2](https://github.com/okonet/lint-staged/commit/641d1c2fd00992e926ae07defbb98c4d324f3b13))
- skip backup stash when using the `--diff` option ([d4da24d](https://github.com/okonet/lint-staged/commit/d4da24d90cfa85ef8589a5f8c6ba5f51c3b45275))

### Features

- add `--diff-filter` option for overriding list of (staged) files ([753ef72](https://github.com/okonet/lint-staged/commit/753ef7281562e0a25a9fe01400d7108143116b39))
- add `--diff` option for overriding list of (staged) files ([35fcce9](https://github.com/okonet/lint-staged/commit/35fcce9040c8de2926a9113d09f13517e6b23a2e))

## [v12.4.3](https://github.com/okonet/lint-staged/releases/tag/v12.4.3) - 30 May 2022

### Bug Fixes

- **deps:** downgrade yaml@1.10.2 to support Node.js 12 ([383a96e](https://github.com/okonet/lint-staged/commit/383a96e17a21d10278e91ecdb8d80385886ce82f))
- **deps:** update commander@^9.2.0 ([22ebf52](https://github.com/okonet/lint-staged/commit/22ebf524e20b2bf239e22fab83df3edc76327394))
- **deps:** update yaml@^2.0.1 ([ec73af0](https://github.com/okonet/lint-staged/commit/ec73af0ddb3541f5a12e0c83b6112ab747d05d73))

## [v12.4.2](https://github.com/okonet/lint-staged/releases/tag/v12.4.2) - 24 May 2022

### Bug Fixes

- correctly handle --max-arg-length cli option ([1db5f26](https://github.com/okonet/lint-staged/commit/1db5f2651d7f41c56f3ee1eacb57f1be1566bce2))

## [v12.4.1](https://github.com/okonet/lint-staged/releases/tag/v12.4.1) - 26 Apr 2022

### Bug Fixes

- correctly handle symlinked config files ([b3f63ec](https://github.com/okonet/lint-staged/commit/b3f63ec43c04158e0ba00f541aa8ffb609d037d9))

## [v12.4.0](https://github.com/okonet/lint-staged/releases/tag/v12.4.0) - 20 Apr 2022

### Bug Fixes

- handle empty input by returning empty array from `parseGitZOutput` ([a118817](https://github.com/okonet/lint-staged/commit/a118817189a5b41168179fe7268903b1d7f4413a))
- limit configuration discovery to cwd ([d8fdf1d](https://github.com/okonet/lint-staged/commit/d8fdf1d9232fde6d65e6b1f4313edbf8d32f9dcb))
- restore functionality of parent globs for a single configuration file ([877ab4c](https://github.com/okonet/lint-staged/commit/877ab4cc66dfa51f5d8d14c89aeadc3ea41a1916))

### Features

- expose `--max-arg-length` cli option ([e8291b0](https://github.com/okonet/lint-staged/commit/e8291b03fa3f3210795b808f40b9a11968f2d988))

## [v12.3.8](https://github.com/okonet/lint-staged/releases/tag/v12.3.8) - 15 Apr 2022

### Bug Fixes

- avoid passing unexpected arguments from forEach to process.kill() ([1b1f0e4](https://github.com/okonet/lint-staged/commit/1b1f0e4f529dbcb5f73ab7d49c5f7908c3b8a866))
- clear execution interruption interval on first catch ([46952cb](https://github.com/okonet/lint-staged/commit/46952cb0306bb5b54d839f63aecff7288389b195))

## [v12.3.7](https://github.com/okonet/lint-staged/releases/tag/v12.3.7) - 17 Mar 2022

### Bug Fixes

- improve renderer logic for `--silent` and `FORCE_COLOR` settings ([d327873](https://github.com/okonet/lint-staged/commit/d327873b1c0b6fbdeb6fd276e523043d51d6de37))

## [v12.3.6](https://github.com/okonet/lint-staged/releases/tag/v12.3.6) - 16 Mar 2022

### Bug Fixes

- kill other running tasks on failure ([#1117](https://github.com/okonet/lint-staged/issues/1117)) ([34fe319](https://github.com/okonet/lint-staged/commit/34fe31986201983c33ea2bde41f4b451947b826b))

## [v12.3.5](https://github.com/okonet/lint-staged/releases/tag/v12.3.5) - 05 Mar 2022

### Bug Fixes

- search all configs regardless of staged files ([4b605cd](https://github.com/okonet/lint-staged/commit/4b605cd3694cc5bfcf6c5a1a2e75c80ef234ab1a))

## [v12.3.4](https://github.com/okonet/lint-staged/releases/tag/v12.3.4) - 13 Feb 2022

### Bug Fixes

- add `package.json` to exports ([#1059](https://github.com/okonet/lint-staged/issues/1059)) ([3395150](https://github.com/okonet/lint-staged/commit/339515010ccd95a2f952dbe65f8366463f94d26a))

## [v12.3.3](https://github.com/okonet/lint-staged/releases/tag/v12.3.3) - 01 Feb 2022

### Bug Fixes

- use config directory as cwd, when multiple configs present ([#1091](https://github.com/okonet/lint-staged/issues/1091)) ([9a14e92](https://github.com/okonet/lint-staged/commit/9a14e92e37abf658fc3a0d5504ff4e980e49996c))

## [v12.3.2](https://github.com/okonet/lint-staged/releases/tag/v12.3.2) - 26 Jan 2022

### Bug Fixes

- handle symlinked .git directories ([3a897ff](https://github.com/okonet/lint-staged/commit/3a897ff1515bde9fc88769257f38cb2646d624fc))

## [v12.3.1](https://github.com/okonet/lint-staged/releases/tag/v12.3.1) - 23 Jan 2022

### Bug Fixes

- **deps:** update dependencies ([f190fc3](https://github.com/okonet/lint-staged/commit/f190fc31888d0a3c6f7070cb0f97edcbc7018a0e))

## [v12.3.0](https://github.com/okonet/lint-staged/releases/tag/v12.3.0) - 23 Jan 2022

### Features

- add `--cwd` option for overriding task directory ([62b5b83](https://github.com/okonet/lint-staged/commit/62b5b833950774e731b0ca034aa9289ec254a602))

## [v12.2.2](https://github.com/okonet/lint-staged/releases/tag/v12.2.2) - 20 Jan 2022

### Bug Fixes

- always search config from `cwd` first ([4afcda5](https://github.com/okonet/lint-staged/commit/4afcda5addade65ef847e3c5b0c4a38db80d020b))

## [v12.2.1](https://github.com/okonet/lint-staged/releases/tag/v12.2.1) - 19 Jan 2022

### Bug Fixes

- only throw if no configurations were found ([36b9546](https://github.com/okonet/lint-staged/commit/36b9546dda5ca24174b519ce6d132f31077b093b))

## [v12.2.0](https://github.com/okonet/lint-staged/releases/tag/v12.2.0) - 18 Jan 2022

### Bug Fixes

- make console task titles more explicit ([1c94c27](https://github.com/okonet/lint-staged/commit/1c94c2780485f3a2273f8b82db8e74ecafe258b4))

### Features

- support multiple configuration files ([90d1035](https://github.com/okonet/lint-staged/commit/90d1035ef709329d297272e9164b0452c1ed37bd))

## [v12.1.7](https://github.com/okonet/lint-staged/releases/tag/v12.1.7) - 07 Jan 2022

### Bug Fixes

- resolve config modules with ESM createRequire ([#1082](https://github.com/okonet/lint-staged/issues/1082)) ([f9f6538](https://github.com/okonet/lint-staged/commit/f9f65380dc3fc6aaa5627abe92f4e26d5b7a25de))

## [v12.1.6](https://github.com/okonet/lint-staged/releases/tag/v12.1.6) - 07 Jan 2022

### Bug Fixes

- always run non-git tasks in the current working directory ([893f3d7](https://github.com/okonet/lint-staged/commit/893f3d7825f73115a41ddb3be34af15f4c207315))

## [v12.1.5](https://github.com/okonet/lint-staged/releases/tag/v12.1.5) - 02 Jan 2022

### Bug Fixes

- search configuration starting from explicit cwd option ([c7ea359](https://github.com/okonet/lint-staged/commit/c7ea3594c81f7c2724a7babc8e8d57926b4679c8))
- using `--debug` option enables debug mode ([5cceeb6](https://github.com/okonet/lint-staged/commit/5cceeb65630752b646047ae88cacc48b76758f1c))

## [v12.1.4](https://github.com/okonet/lint-staged/releases/tag/v12.1.4) - 24 Dec 2021

### Bug Fixes

- use cwd option when resolving git repo root ([#1075](https://github.com/okonet/lint-staged/issues/1075)) ([a230b03](https://github.com/okonet/lint-staged/commit/a230b0350885194e5f07be667312316ad869b7fc))

## [v12.1.3](https://github.com/okonet/lint-staged/releases/tag/v12.1.3) - 18 Dec 2021

### Bug Fixes

- **deps:** remove enquirer because it's now optional by listr2 ([96a1a29](https://github.com/okonet/lint-staged/commit/96a1a29ab49009d3d7edc98cc7344b1ac9c1cce6))

## [v12.1.2](https://github.com/okonet/lint-staged/releases/tag/v12.1.2) - 22 Nov 2021

### Bug Fixes

- fix Windows JS config loading by using file:// URLs ([f20ddf9](https://github.com/okonet/lint-staged/commit/f20ddf9413bfc2f44ad099b5cb1e5f478de5d35f))
- fix YAML config loading ([0082ec2](https://github.com/okonet/lint-staged/commit/0082ec22101c8f819a8b91872b808ee81d3c4d1e))
- improve error logging in loadConfig ([e7b6412](https://github.com/okonet/lint-staged/commit/e7b6412fb128f314346e28329c17a676cf691135))

## [v12.1.1](https://github.com/okonet/lint-staged/releases/tag/v12.1.1) - 21 Nov 2021

### Bug Fixes

- await for dynamic import promise when loading JS config ([e96b6d9](https://github.com/okonet/lint-staged/commit/e96b6d9674f07b4686876cb40605274577925973))

## [v12.1.0](https://github.com/okonet/lint-staged/releases/tag/v12.1.0) - 21 Nov 2021

### Features

- allow loading `.js` config file with ESM syntax ([410c3ba](https://github.com/okonet/lint-staged/commit/410c3ba36972259aa5b49045b5cd565a6525382b))
- replace `cosmiconfig` with `lilconfig` + `yaml` to reduce dependencies ([e7f9fa0](https://github.com/okonet/lint-staged/commit/e7f9fa0f2e6aa5adbb1a0c31d1ceaff01b43f692))
- support loading `.mjs` config ([8d3b176](https://github.com/okonet/lint-staged/commit/8d3b176a7af75790efbcd1f63f73e7ef51f6b377))

## [v12.0.3](https://github.com/okonet/lint-staged/releases/tag/v12.0.3) - 18 Nov 2021

### Bug Fixes

- install `enquirer` ([e01585f](https://github.com/okonet/lint-staged/commit/e01585f96d6aeef9f5f1b84df9936ce2be47d8f0))

## [v12.0.2](https://github.com/okonet/lint-staged/releases/tag/v12.0.2) - 14 Nov 2021

### Bug Fixes

- remove `npm` version requirement ([#1047](https://github.com/okonet/lint-staged/issues/1047)) ([e50d6d4](https://github.com/okonet/lint-staged/commit/e50d6d4ce53d125b735009bacb3de157fb6d1f2a))

## [v12.0.1](https://github.com/okonet/lint-staged/releases/tag/v12.0.1) - 13 Nov 2021

### Bug Fixes

- read version number from lint-staged package.json instead of package.json in cwd ([#1043](https://github.com/okonet/lint-staged/issues/1043)) ([#1044](https://github.com/okonet/lint-staged/issues/1044)) ([9f9213d](https://github.com/okonet/lint-staged/commit/9f9213d5fbc74e3c3fb11db2a1bd239888c2960c))

## [v12.0.0](https://github.com/okonet/lint-staged/releases/tag/v12.0.0) - 13 Nov 2021

### Features

- convert to native ESM module ([#1038](https://github.com/okonet/lint-staged/issues/1038)) ([7240f61](https://github.com/okonet/lint-staged/commit/7240f61730aa923b18156cc64ff5350f2d5be16d))

### BREAKING CHANGES

- _lint-staged_ is now a pure ESM module, and thus
  requires Node.js version `^12.20.0 || ^14.13.1 || >=16.0.0`.

To update your Node.js integration, please use:

```js
// const lintStaged = require('lint-staged')
import lintStaged from 'lint-staged'
```

## [v11.3.0-beta.2](https://github.com/okonet/lint-staged/releases/tag/v11.3.0-beta.2) - 30 Oct 2021

### Bug Fixes

- correctly import `js-yaml` to fix yaml config loading ([#1033](https://github.com/okonet/lint-staged/issues/1033)) ([612d806](https://github.com/okonet/lint-staged/commit/612d8066aa2c95573a06c125a311dc4aed8f2e71))
- detect git repo root correctly on cygwin ([#1026](https://github.com/okonet/lint-staged/issues/1026)) ([f291824](https://github.com/okonet/lint-staged/commit/f291824efadb1cce47eba62ee8fa57a546aab37f)), closes [#1025](https://github.com/okonet/lint-staged/issues/1025)
- remove dangling chars from git dir ([#1028](https://github.com/okonet/lint-staged/issues/1028)) ([11c004e](https://github.com/okonet/lint-staged/commit/11c004e89dfacc381fdb10b0db70475f693c27f1)), closes [#1027](https://github.com/okonet/lint-staged/issues/1027)
- revert back to `cosmiconfig` from `lilconfig` ([#1035](https://github.com/okonet/lint-staged/issues/1035)) ([e035b80](https://github.com/okonet/lint-staged/commit/e035b80e39da355da57c02db6565b55271ab1afa)), closes [#1033](https://github.com/okonet/lint-staged/issues/1033) [#981](https://github.com/okonet/lint-staged/issues/981)
- unbreak windows by correctly normalizing cwd ([#1029](https://github.com/okonet/lint-staged/issues/1029)) ([f861d8d](https://github.com/okonet/lint-staged/commit/f861d8d17d966809b6cd7ae338c289a125d0e3b4))

### Performance Improvements

- replace `cosmiconfig` with `lilconfig` ([#981](https://github.com/okonet/lint-staged/issues/981)) ([04529e2](https://github.com/okonet/lint-staged/commit/04529e2b9040adc54cc8e5efc66b95bc0023477c))

## [v11.2.6](https://github.com/okonet/lint-staged/releases/tag/v11.2.6) - 26 Oct 2021

### Bug Fixes

- revert back to `cosmiconfig` from `lilconfig` ([#1035](https://github.com/okonet/lint-staged/issues/1035)) ([e035b80](https://github.com/okonet/lint-staged/commit/e035b80e39da355da57c02db6565b55271ab1afa)), closes [#1033](https://github.com/okonet/lint-staged/issues/1033) [#981](https://github.com/okonet/lint-staged/issues/981)

## [v11.2.5](https://github.com/okonet/lint-staged/releases/tag/v11.2.5) - 26 Oct 2021

### Bug Fixes

- correctly import `js-yaml` to fix yaml config loading ([#1033](https://github.com/okonet/lint-staged/issues/1033)) ([612d806](https://github.com/okonet/lint-staged/commit/612d8066aa2c95573a06c125a311dc4aed8f2e71))

## [v11.2.4](https://github.com/okonet/lint-staged/releases/tag/v11.2.4) - 23 Oct 2021

### Performance Improvements

- replace `cosmiconfig` with `lilconfig` ([#981](https://github.com/okonet/lint-staged/issues/981)) ([04529e2](https://github.com/okonet/lint-staged/commit/04529e2b9040adc54cc8e5efc66b95bc0023477c))

## [v11.2.3](https://github.com/okonet/lint-staged/releases/tag/v11.2.3) - 10 Oct 2021

### Bug Fixes

- unbreak windows by correctly normalizing cwd ([#1029](https://github.com/okonet/lint-staged/issues/1029)) ([f861d8d](https://github.com/okonet/lint-staged/commit/f861d8d17d966809b6cd7ae338c289a125d0e3b4))

## [v11.2.2](https://github.com/okonet/lint-staged/releases/tag/v11.2.2) - 09 Oct 2021

### Bug Fixes

- remove dangling chars from git dir ([#1028](https://github.com/okonet/lint-staged/issues/1028)) ([11c004e](https://github.com/okonet/lint-staged/commit/11c004e89dfacc381fdb10b0db70475f693c27f1)), closes [#1027](https://github.com/okonet/lint-staged/issues/1027)

## [v11.2.1](https://github.com/okonet/lint-staged/releases/tag/v11.2.1) - 09 Oct 2021

### Bug Fixes

- detect git repo root correctly on cygwin ([#1026](https://github.com/okonet/lint-staged/issues/1026)) ([f291824](https://github.com/okonet/lint-staged/commit/f291824efadb1cce47eba62ee8fa57a546aab37f)), closes [#1025](https://github.com/okonet/lint-staged/issues/1025)

## [v11.3.0-beta.1](https://github.com/okonet/lint-staged/releases/tag/v11.3.0-beta.1) - 04 Oct 2021

### Bug Fixes

- add `--no-stash` as hidden option for backwards-compatibility ([73db492](https://github.com/okonet/lint-staged/commit/73db492a68c75cfa46e98fb3689329c0e82bfd92))
- do not apply empty patch ([a7c1c0b](https://github.com/okonet/lint-staged/commit/a7c1c0b07550cd54a338a17bee54eea9082d2391))
- do not use `fs/promises` for Node.js 12 compatibility ([c99a6a1](https://github.com/okonet/lint-staged/commit/c99a6a15667c1301c809c3d120c6ede465ebeb40))
- restore original state when preventing an empty commit ([f7ef8ef](https://github.com/okonet/lint-staged/commit/f7ef8ef0b3b6355df63436cbefa11bd5b9edea6e))
- restore previous order of jobs ([ba62b22](https://github.com/okonet/lint-staged/commit/ba62b2284140bb5c7068db2ae0833fa97585c689))

### Features

- do not use a git stash for better performance ([ff0cc0d](https://github.com/okonet/lint-staged/commit/ff0cc0d2d28ca8f4f0b2586eb7c3bf4d31fdc7eb))

### Performance Improvements

- further optimize by reusing previous job ([3066a35](https://github.com/okonet/lint-staged/commit/3066a350b7d09b1ff30d04be10d5793b4e1dc38e))
- re-use figures from listr2 and remove `log-symbols` ([5240c26](https://github.com/okonet/lint-staged/commit/5240c263e19ffa645a37bc16564d1f53d8f61e90))
- replace `chalk` with `colorette` and `supports-color` ([4de4cda](https://github.com/okonet/lint-staged/commit/4de4cdaea1e50c73ca01261bb8dcbd48287ec1ae))

## [v11.2.0](https://github.com/okonet/lint-staged/releases/tag/v11.2.0) - 04 Oct 2021

### Features

- **deps:** update and slim down dependencies ([#1003](https://github.com/okonet/lint-staged/issues/1003)) ([32c08d3](https://github.com/okonet/lint-staged/commit/32c08d3f3c1c929e4fb3996c36fc937f032a2c5a))

## [v11.2.0-beta.1](https://github.com/okonet/lint-staged/releases/tag/v11.2.0-beta.1) - 02 Oct 2021

### Bug Fixes

- add `--no-stash` as hidden option for backwards-compatibility ([73db492](https://github.com/okonet/lint-staged/commit/73db492a68c75cfa46e98fb3689329c0e82bfd92))
- do not apply empty patch ([a7c1c0b](https://github.com/okonet/lint-staged/commit/a7c1c0b07550cd54a338a17bee54eea9082d2391))
- do not use `fs/promises` for Node.js 12 compatibility ([c99a6a1](https://github.com/okonet/lint-staged/commit/c99a6a15667c1301c809c3d120c6ede465ebeb40))
- restore original state when preventing an empty commit ([f7ef8ef](https://github.com/okonet/lint-staged/commit/f7ef8ef0b3b6355df63436cbefa11bd5b9edea6e))
- restore previous order of jobs ([ba62b22](https://github.com/okonet/lint-staged/commit/ba62b2284140bb5c7068db2ae0833fa97585c689))

### Features

- do not use a git stash for better performance ([ff0cc0d](https://github.com/okonet/lint-staged/commit/ff0cc0d2d28ca8f4f0b2586eb7c3bf4d31fdc7eb))

### Performance Improvements

- further optimize by reusing previous job ([3066a35](https://github.com/okonet/lint-staged/commit/3066a350b7d09b1ff30d04be10d5793b4e1dc38e))
- re-use figures from listr2 and remove `log-symbols` ([5240c26](https://github.com/okonet/lint-staged/commit/5240c263e19ffa645a37bc16564d1f53d8f61e90))
- replace `chalk` with `colorette` and `supports-color` ([4de4cda](https://github.com/okonet/lint-staged/commit/4de4cdaea1e50c73ca01261bb8dcbd48287ec1ae))

## [v11.1.2](https://github.com/okonet/lint-staged/releases/tag/v11.1.2) - 06 Aug 2021

### Bug Fixes

- try to automatically fix and warn about invalid brace patterns ([#992](https://github.com/okonet/lint-staged/issues/992)) ([b3d97cf](https://github.com/okonet/lint-staged/commit/b3d97cf4cfb115e51908cd92b95896442494c778))

## [v11.1.1](https://github.com/okonet/lint-staged/releases/tag/v11.1.1) - 24 Jul 2021

### Bug Fixes

- the shell option value should be optional instead of required ([#996](https://github.com/okonet/lint-staged/issues/996)) ([f7302f4](https://github.com/okonet/lint-staged/commit/f7302f4649b52785cdd17e7339e49ff53a6e3eda)), closes [#994](https://github.com/okonet/lint-staged/issues/994)

## [v11.1.0](https://github.com/okonet/lint-staged/releases/tag/v11.1.0) - 22 Jul 2021

### Features

- allow a path to be supplied to the --shell option ([#994](https://github.com/okonet/lint-staged/issues/994)) ([fea8033](https://github.com/okonet/lint-staged/commit/fea80331c768b3642e90fc687e5aceaa419d2b77))

## [v11.0.1](https://github.com/okonet/lint-staged/releases/tag/v11.0.1) - 13 Jul 2021

### Bug Fixes

- do not swallow already detected deprecated usage by last task ([#991](https://github.com/okonet/lint-staged/issues/991)) ([7734156](https://github.com/okonet/lint-staged/commit/7734156ce272189a7c663cccbb38af73a2b954b3))

## [v11.0.0](https://github.com/okonet/lint-staged/releases/tag/v11.0.0) - 07 May 2021

### Bug Fixes

- migrate commander@7 ([f8a0261](https://github.com/okonet/lint-staged/commit/f8a026140d477f906083ae90ffb383ad0c0807a6))
- migrate husky@6 ([5560d97](https://github.com/okonet/lint-staged/commit/5560d97f6a1d034b933d352b953a957d9bee61fa))

### Features

- bump Node.js version requirement to 12.13.0 ([852aa6e](https://github.com/okonet/lint-staged/commit/852aa6ece128c408a7fdfcceaa952d05076fb4bd))

### BREAKING CHANGES

- Node.js 12 LTS 'Erbium' is now the minimum required version

## [v10.5.4](https://github.com/okonet/lint-staged/releases/tag/v10.5.4) - 05 Feb 2021

### Bug Fixes

- concurrent option is not working correctly ([#950](https://github.com/okonet/lint-staged/issues/950)) ([4383815](https://github.com/okonet/lint-staged/commit/43838158b4b2557bf09c06d0d15c4936069e8855))

## [v10.5.3](https://github.com/okonet/lint-staged/releases/tag/v10.5.3) - 04 Dec 2020

### Bug Fixes

- better logging for errors in js config files ([#935](https://github.com/okonet/lint-staged/issues/935)) ([292e882](https://github.com/okonet/lint-staged/commit/292e882cc3422743f4419d98e97200483be82c4a))

## [v10.5.2](https://github.com/okonet/lint-staged/releases/tag/v10.5.2) - 24 Nov 2020

### Bug Fixes

- use bibliography-style links in related posts section of readme ([#932](https://github.com/okonet/lint-staged/issues/932)) ([0ff2917](https://github.com/okonet/lint-staged/commit/0ff29178c8771ab10e43a395e252c6a118306942)), closes [#931](https://github.com/okonet/lint-staged/issues/931)

## [v10.5.1](https://github.com/okonet/lint-staged/releases/tag/v10.5.1) - 31 Oct 2020

### Bug Fixes

- update dependencies ([#921](https://github.com/okonet/lint-staged/issues/921)) ([7933b08](https://github.com/okonet/lint-staged/commit/7933b081396d4a26d4c20fcd04c86c91cd89a8c6))

## [v10.5.0](https://github.com/okonet/lint-staged/releases/tag/v10.5.0) - 26 Oct 2020

### Features

- allow reading config from stdin ([#918](https://github.com/okonet/lint-staged/issues/918)) ([969713d](https://github.com/okonet/lint-staged/commit/969713d030515e4bafa6517244f8c41968f2b40b))

## [v10.4.2](https://github.com/okonet/lint-staged/releases/tag/v10.4.2) - 17 Oct 2020

### Bug Fixes

- update docs on supported config file extensions ([#917](https://github.com/okonet/lint-staged/issues/917)) ([78782f9](https://github.com/okonet/lint-staged/commit/78782f92b1fb0868218dc3463a3fc61dd5e70cfc))

## [v10.4.1](https://github.com/okonet/lint-staged/releases/tag/v10.4.1) - 16 Oct 2020

### Bug Fixes

- add support for .cjs configs ([#909](https://github.com/okonet/lint-staged/issues/909)) ([36e7e58](https://github.com/okonet/lint-staged/commit/36e7e5843b6b8b8744488b4db536d14d2e85e798))

## [v10.4.0](https://github.com/okonet/lint-staged/releases/tag/v10.4.0) - 16 Sep 2020

### Features

- Add ability to use function as config ([#913](https://github.com/okonet/lint-staged/issues/913)) ([67a4d06](https://github.com/okonet/lint-staged/commit/67a4d06e39c4638a546494940bf99934692fb610))

## [v10.3.0](https://github.com/okonet/lint-staged/releases/tag/v10.3.0) - 03 Sep 2020

### Features

- Add support for adding lint-staged using pre-commit.com ([#910](https://github.com/okonet/lint-staged/issues/910)) ([d404d7d](https://github.com/okonet/lint-staged/commit/d404d7d5a2ccfba51d2d59e1fbb6e2e82539646c))

## [v10.2.13](https://github.com/okonet/lint-staged/releases/tag/v10.2.13) - 25 Aug 2020

### Bug Fixes

- disambiguate stash reference ([#906](https://github.com/okonet/lint-staged/issues/906)) ([51c5ac8](https://github.com/okonet/lint-staged/commit/51c5ac80da475f2255e12547018a3366ef6bd5a4))

## [v10.2.12](https://github.com/okonet/lint-staged/releases/tag/v10.2.12) - 25 Aug 2020

### Bug Fixes

- always use the default short diff format for submodules [#902](https://github.com/okonet/lint-staged/issues/902) ([c7923ad](https://github.com/okonet/lint-staged/commit/c7923ad9259e8bc121694f8e8c4ad3668aae73e5))
- ensure supportsColor.level exists before stringifying it ([aa9898e](https://github.com/okonet/lint-staged/commit/aa9898e47ce20d925072ccc93986b28c0593e625))

## [v10.2.11](https://github.com/okonet/lint-staged/releases/tag/v10.2.11) - 17 Jun 2020

### Bug Fixes

- run all git commands with submodule.recurse=false ([#888](https://github.com/okonet/lint-staged/issues/888)) ([86c9ed2](https://github.com/okonet/lint-staged/commit/86c9ed2bde1245a702635b42a57b92b809340b0e))

## [v10.2.10](https://github.com/okonet/lint-staged/releases/tag/v10.2.10) - 12 Jun 2020

### Bug Fixes

- Git directory is not correctly resolved if GIT_WORK_TREE is set to relative path ([#887](https://github.com/okonet/lint-staged/issues/887)) ([a1904ec](https://github.com/okonet/lint-staged/commit/a1904ec6a96b04cd93eeb622b04cf328a10083df))

## [v10.2.9](https://github.com/okonet/lint-staged/releases/tag/v10.2.9) - 04 Jun 2020

### Bug Fixes

- update listr@2.1.0 and add enquirer peer dependency ([#883](https://github.com/okonet/lint-staged/issues/883)) ([0daae61](https://github.com/okonet/lint-staged/commit/0daae611b0637ebc6b9fac8672b842444bee3a38))

## [v10.2.8](https://github.com/okonet/lint-staged/releases/tag/v10.2.8) - 03 Jun 2020

### Bug Fixes

- canceling lint-staged via SIGINT restores state and cleans up ([#881](https://github.com/okonet/lint-staged/issues/881)) ([b078324](https://github.com/okonet/lint-staged/commit/b078324d5e911ec5e667736b2c552af32f475751))

## [v10.2.7](https://github.com/okonet/lint-staged/releases/tag/v10.2.7) - 29 May 2020

### Bug Fixes

- use machine output to avoid escaped and quoted filenames ([ea80a3d](https://github.com/okonet/lint-staged/commit/ea80a3dc4124ce8437d7879dea3c9220fb5b0ca2))

## [v10.2.6](https://github.com/okonet/lint-staged/releases/tag/v10.2.6) - 22 May 2020

### Bug Fixes

- remove nanoid devDependency to remove ExperimentalWarning ([#874](https://github.com/okonet/lint-staged/issues/874)) ([979da5d](https://github.com/okonet/lint-staged/commit/979da5d0d2fed4ef4a1748eaf10bb150005c99c4))

## [v10.2.5](https://github.com/okonet/lint-staged/releases/tag/v10.2.5) - 22 May 2020

### Bug Fixes

- truncate command title to stdout width ([#865](https://github.com/okonet/lint-staged/issues/865)) ([b8e1a4a](https://github.com/okonet/lint-staged/commit/b8e1a4a9683639d961f948283dec0e6dec556493))

## [v10.2.4](https://github.com/okonet/lint-staged/releases/tag/v10.2.4) - 18 May 2020

### Bug Fixes

- node-13 deps issue with listr2 and uuid ([#868](https://github.com/okonet/lint-staged/issues/868)) ([93bc942](https://github.com/okonet/lint-staged/commit/93bc942d9640e152a65c15d42c707c9b63420684))

## [v10.2.3](https://github.com/okonet/lint-staged/releases/tag/v10.2.3) - 18 May 2020

### Bug Fixes

- update listr2@2.0.1 ([157ad3e](https://github.com/okonet/lint-staged/commit/157ad3e97c91551de6f1182c7a8c17f3762f1f47))

## [v10.2.2](https://github.com/okonet/lint-staged/releases/tag/v10.2.2) - 01 May 2020

### Bug Fixes

- chunkFiles chunks normalized files even when maxArgLength is set ([#858](https://github.com/okonet/lint-staged/issues/858)) ([fc72170](https://github.com/okonet/lint-staged/commit/fc721704f223a8b649f949af38311c4d567268a6))

## [v10.2.1](https://github.com/okonet/lint-staged/releases/tag/v10.2.1) - 30 Apr 2020

### Bug Fixes

- normalize chunked paths even when maxArgLength is not set ([ba67f48](https://github.com/okonet/lint-staged/commit/ba67f48f5a8314723cbf1d9de08b6a794d4c112b))
- resolve matched files to cwd instead of gitDir before adding ([defe045](https://github.com/okonet/lint-staged/commit/defe0452e3080b8a13913cde11da43d30ff0e2d0))

## [v10.2.0](https://github.com/okonet/lint-staged/releases/tag/v10.2.0) - 28 Apr 2020

### Bug Fixes

- all lint-staged output respects the `quiet` option ([aba3421](https://github.com/okonet/lint-staged/commit/aba3421b0ec7335e49bc3f06a71441037bb2ae8a))
- do not show incorrect error when verbose and no output ([b8df31a](https://github.com/okonet/lint-staged/commit/b8df31af839a3125fa11fefae25359f1cfd271fd))
- log task output after running listr to keep everything ([d69c65b](https://github.com/okonet/lint-staged/commit/d69c65b8b5f7fa00dfecf52633fa6edd6bad6e29))
- use test renderer during tests and when TERM=dumb ([16848d8](https://github.com/okonet/lint-staged/commit/16848d83f3ec2cf67406755ec0aaa931ffb6787e))

### Features

- add `--verbose` to show output even when tasks succeed ([85de3a3](https://github.com/okonet/lint-staged/commit/85de3a3aff34061211622e5a250a172fcbd6fb5b))
- allow specifying `cwd` using the Node.js API ([a3bd9d7](https://github.com/okonet/lint-staged/commit/a3bd9d7fa0b85983eb25f8483b407a14b15c1f11))
- replace listr with listr2 and print errors inline ([8f32a3e](https://github.com/okonet/lint-staged/commit/8f32a3eb38926fe931c36f788947a62a0b26405c))

## [v10.1.7](https://github.com/okonet/lint-staged/releases/tag/v10.1.7) - 21 Apr 2020

### Bug Fixes

- use stash create/store to prevent files from disappearing from disk ([c9adca5](https://github.com/okonet/lint-staged/commit/c9adca5))

## [v10.1.6](https://github.com/okonet/lint-staged/releases/tag/v10.1.6) - 19 Apr 2020

### Bug Fixes

- **deps:** update dependencies ([e093b1d](https://github.com/okonet/lint-staged/commit/e093b1d))

## [v10.1.5](https://github.com/okonet/lint-staged/releases/tag/v10.1.5) - 18 Apr 2020

### Bug Fixes

- pass correct path to unstaged patch during cleanup ([6066b07](https://github.com/okonet/lint-staged/commit/6066b07))

## [v10.1.4](https://github.com/okonet/lint-staged/releases/tag/v10.1.4) - 17 Apr 2020

### Bug Fixes

- allow lint-staged to run on empty git repo by disabling backup ([0bf1fb0](https://github.com/okonet/lint-staged/commit/0bf1fb0))

## [v10.1.3](https://github.com/okonet/lint-staged/releases/tag/v10.1.3) - 09 Apr 2020

### Bug Fixes

- only run git add on staged files matched to a task ([d39573b](https://github.com/okonet/lint-staged/commit/d39573b))
- run `git add` for staged file chunks serially ([69acfa3](https://github.com/okonet/lint-staged/commit/69acfa3))

## [v10.1.2](https://github.com/okonet/lint-staged/releases/tag/v10.1.2) - 05 Apr 2020

### Bug Fixes

- no longer include untracked files in backup stash ([#827](https://github.com/okonet/lint-staged/issues/827)) ([2f15336](https://github.com/okonet/lint-staged/commit/2f15336))

## [v10.1.1](https://github.com/okonet/lint-staged/releases/tag/v10.1.1) - 31 Mar 2020

### Bug Fixes

- add `--` to `git add` command to denote pathspec starting ([#821](https://github.com/okonet/lint-staged/issues/821)) ([226ccdb](https://github.com/okonet/lint-staged/commit/226ccdb7727c9837fa04528047ced89466c4b833))

## [v10.1.0](https://github.com/okonet/lint-staged/releases/tag/v10.1.0) - 30 Mar 2020

### Bug Fixes

- do not return string from runAll, add info symbol to "No staged files found." message ([1e7298a](https://github.com/okonet/lint-staged/commit/1e7298a23c3c2d09810f6e1a54ead8a449d7fd7d))
- force src and dst prefixes in diff to work around local diff.noprefix setting ([7f2ef33](https://github.com/okonet/lint-staged/commit/7f2ef33dde170e83a8943886a4f1502113dcb50c))
- unset GIT_LITERAL_PATHSPECS env variable before running ([a653c55](https://github.com/okonet/lint-staged/commit/a653c55a397e7e6f04fa5aefb0ddf2c7543569d9))

### Features

- add `--no-stash` option to disable the backup stash, and not revert in case of errors ([c386e4c](https://github.com/okonet/lint-staged/commit/c386e4cf9646dc0953213e9a0ef857cb9664af37))
- only hide/restore unstaged modifications to partially staged files ([52125a9](https://github.com/okonet/lint-staged/commit/52125a9d557e3fc117a421662cf45d6462517d87))

## [v10.0.10](https://github.com/okonet/lint-staged/releases/tag/v10.0.10) - 29 Mar 2020

### Bug Fixes

- support non-ASCII filenames when git is configured with `core.quotepath on` ([2cb26a6](https://github.com/okonet/lint-staged/commit/2cb26a635a313a32c208caf5ba6a9215a68b9c6d))

## [v10.0.9](https://github.com/okonet/lint-staged/releases/tag/v10.0.9) - 24 Mar 2020

### Bug Fixes

- use `path.join` and `normalize` to improve msys compatibility in resolveGitRepo ([1ad263a](https://github.com/okonet/lint-staged/commit/1ad263a5c03d0f3fd90f2dffd0d9083f0ef8112e))

## [v10.0.8](https://github.com/okonet/lint-staged/releases/tag/v10.0.8) - 25 Feb 2020

### Bug Fixes

- do not drop backup stash when reverting to original state fails ([f589336](https://github.com/okonet/lint-staged/commit/f5893365409bf935db058a4f41aeaccc90cd3a18))
- evaluate functional configuration only once ([abe4b92](https://github.com/okonet/lint-staged/commit/abe4b92d7f6213b59d756d172298bc29bb2bd44c))

## [v10.0.7](https://github.com/okonet/lint-staged/releases/tag/v10.0.7) - 31 Jan 2020

### Bug Fixes

- replace fs.promises with util.promisify ([#786](https://github.com/okonet/lint-staged/issues/786)) ([f71c1c9](https://github.com/okonet/lint-staged/commit/f71c1c9ad2d27205199171bf3dc0e908889ba384))

## [v10.0.6](https://github.com/okonet/lint-staged/releases/tag/v10.0.6) - 30 Jan 2020

### Bug Fixes

- make sure deleted files aren't restored due to git bugs ([#778](https://github.com/okonet/lint-staged/issues/778)) ([6bfbe6c](https://github.com/okonet/lint-staged/commit/6bfbe6c204e351bd7055c5ecc810e1f9074304da))

## [v10.0.5](https://github.com/okonet/lint-staged/releases/tag/v10.0.5) - 30 Jan 2020

### Bug Fixes

- always resolve real git config dir location if .git is a file ([#784](https://github.com/okonet/lint-staged/issues/784)) ([b98a5ed](https://github.com/okonet/lint-staged/commit/b98a5ed8d422f637af4157a157676a70e3f1981a))

## [v10.0.4](https://github.com/okonet/lint-staged/releases/tag/v10.0.4) - 29 Jan 2020

### Bug Fixes

- use verbose renderer when TERM=dumb ([#782](https://github.com/okonet/lint-staged/issues/782)) ([9c08e8e](https://github.com/okonet/lint-staged/commit/9c08e8ee0bdf00de7dc6e15cd660e6fc55129832))

## [v10.0.3](https://github.com/okonet/lint-staged/releases/tag/v10.0.3) - 27 Jan 2020

### Bug Fixes

- correctly restore untracked files after running ([#780](https://github.com/okonet/lint-staged/issues/780)) ([4010db0](https://github.com/okonet/lint-staged/commit/4010db09f6d168af677bd4ca1c815ba40460ae80))

## [v10.0.2](https://github.com/okonet/lint-staged/releases/tag/v10.0.2) - 22 Jan 2020

### Bug Fixes

- only warn about git add when it's the exact command ([24febb3](https://github.com/okonet/lint-staged/commit/24febb3c906dd84f8ee19bae74509e42db034380))
- parse command string with string-argv unless --shell is used ([4cb4dde](https://github.com/okonet/lint-staged/commit/4cb4ddee0c6b6500eefd20eb3d1bad249d51b96a))
- print a better warning when the initial commit is missing ([293547d](https://github.com/okonet/lint-staged/commit/293547d46080eac007393709a0d63a63f2063fff))

## [v10.0.1](https://github.com/okonet/lint-staged/releases/tag/v10.0.1) - 20 Jan 2020

### Bug Fixes

- preserve merge states in submodules ([#769](https://github.com/okonet/lint-staged/issues/769)) ([e646b2c](https://github.com/okonet/lint-staged/commit/e646b2c46ad34344b526462200471fa47dcc398f))

## [v10.0.0](https://github.com/okonet/lint-staged/releases/tag/v10.0.0) - 19 Jan 2020

### Bug Fixes

- add all modified files to git index with `git add .` ([bf532c2](https://github.com/okonet/lint-staged/commit/bf532c2af9dbd3514b16768a106fea82ddc99923))
- automatically add modifications only to originally staged files ([083b8e7](https://github.com/okonet/lint-staged/commit/083b8e7d67307a177d427d694ead22cb0c95b0ca))
- better workaround for git stash --keep-index bug ([f3ae378](https://github.com/okonet/lint-staged/commit/f3ae378aa8d7207f990c4ffec854cc8da4d38b1d))
- correctly leave only staged files for running tasks ([cfde9ca](https://github.com/okonet/lint-staged/commit/cfde9ca64bed7fa236eda69e63478c536f9f9068))
- correctly recover when unstaged changes cannot be restored ([d091f71](https://github.com/okonet/lint-staged/commit/d091f71ff50b1eddc59e759b1b09a95ed613c4d2))
- correctly restore untracked files from backup stash ([c7d0592](https://github.com/okonet/lint-staged/commit/c7d05922b24524707795c4045339801c86affe9d))
- error handling skips dropping backup stash after internal git errors ([30b4809](https://github.com/okonet/lint-staged/commit/30b480925a313f5c2b614eb40eb1a340a6cefae5))
- fail with a message when backup stash is missing ([1b64239](https://github.com/okonet/lint-staged/commit/1b64239163f5560b7235843909a9d30ff7ca1b83))
- gitWorkflow handles active merge mode ([2f1e886](https://github.com/okonet/lint-staged/commit/2f1e886cba422844b0496a96696dae5296835862))
- handle git MERGE\_\* files separately; improve error handling ([da22cf2](https://github.com/okonet/lint-staged/commit/da22cf22bbd21be98a73b880a4ce43dbd0129021))
- improve debug logging ([f88e226](https://github.com/okonet/lint-staged/commit/f88e22619b8dea4fbcda3d57a85ca9d1be152908))
- keep untracked files around by backing them up ([fc03fdc](https://github.com/okonet/lint-staged/commit/fc03fdc2e869384eb2d6423ff31f84e3cf22007e))
- max arg length is by default half of the allowed to prevent edge cases ([80406c2](https://github.com/okonet/lint-staged/commit/80406c20fd3d1a86b0a0558c10f6747b2b47698e))
- prevent Listr from hiding git add warning ([cce9809](https://github.com/okonet/lint-staged/commit/cce9809a2ce335a3b2c3f44e4c521270b13f9d4c))
- restore metadata about git merge before running tasks ([f8ddfc2](https://github.com/okonet/lint-staged/commit/f8ddfc22d22fec2b417a67249573e7cd6abdb9fc))
- retry failing apply with 3-way merge ([76cb08f](https://github.com/okonet/lint-staged/commit/76cb08f6eecd68f3ae7e606216b4c5fdc1da94f0))
- support binary files ([7b3a334](https://github.com/okonet/lint-staged/commit/7b3a334ac33ffe1bda930583a055fb1db0b6d181))
- try applying unstaged changes before handling errors ([357934f](https://github.com/okonet/lint-staged/commit/357934fe1e193040d1a138d3d138da1377004be2))
- update warning about git add, and to README ([6467a66](https://github.com/okonet/lint-staged/commit/6467a66b13657f1a39b0f1f3a079dc31a8461fe9))
- workaround for stashing deleted files for git < 2.23 ([1a87333](https://github.com/okonet/lint-staged/commit/1a87333f9ee0704b3bb332bf5fbc11dbd25f7821))

### Features

- automatically stage task modifications ([74ed28d](https://github.com/okonet/lint-staged/commit/74ed28d5edc70c66d769f7658b90b550029a2acf))
- bump Node.js version dependency to at least 10.13.0 ([#747](https://github.com/okonet/lint-staged/issues/747)) ([814b9df](https://github.com/okonet/lint-staged/commit/814b9dfe131f55c18a8996f775dd5dd582d0a766))
- split tasks into chunks to support shells with limited max argument length ([#732](https://github.com/okonet/lint-staged/issues/732)) ([cb43872](https://github.com/okonet/lint-staged/commit/cb43872fb6c05366a8fc25a8bd889b95918f45a3))
- support async function tasks ([20d5c5d](https://github.com/okonet/lint-staged/commit/20d5c5d4cb92f9a4c501e5308cc51379d10581a8))
- throw error to prevent empty commits unless --allow-empty is used ([#762](https://github.com/okonet/lint-staged/issues/762)) ([8bdeec0](https://github.com/okonet/lint-staged/commit/8bdeec067f425150722bd0ee78e310e0992a1444))
- use git stashes for gitWorkflow ([40a5db1](https://github.com/okonet/lint-staged/commit/40a5db1f6b1ad17b5a593974b6db93015f50824c))
- warn when task contains "git add" ([5208399](https://github.com/okonet/lint-staged/commit/52083990166cbea3bfe3d316ad6598c6c198fe1e))

### BREAKING CHANGES

- Previously, lint-staged would allow empty commits in the situation where a linter task like "prettier --write" reverts all staged changes automatically. Now the default behaviour is to throw an error with a helpful warning message. The --allow empty option can be used to allow empty commits, or `allowEmpty: true` for the Node.js API.
- Node.js v8 is no longer supported because it will reach EOL on 2019-12-31
- Prior to version 10, tasks had to manually include `git add` as the final step. This behavior has been integrated into lint-staged itself in order to prevent race conditions with multiple tasks editing the same files. If lint-staged detects `git add` in task configurations, it will show a warning in the console. Please remove `git add` from your configuration after upgrading.

## [v10.0.0-beta.15](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.15) - 08 Jan 2020

### Features

- throw error to prevent empty commits unless --allow-empty is used ([#762](https://github.com/okonet/lint-staged/issues/762)) ([8bdeec0](https://github.com/okonet/lint-staged/commit/8bdeec067f425150722bd0ee78e310e0992a1444))

### BREAKING CHANGES

- Previously, lint-staged would allow empty commits in the situation where a linter task like "prettier --write" reverts all staged changes automatically. Now the default behaviour is to throw an error with a helpful warning message. The --allow empty option can be used to allow empty commits, or `allowEmpty: true` for the Node.js API.

## [v10.0.0-beta.14](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.14) - 24 Dec 2019

### Bug Fixes

- error handling skips dropping backup stash after internal git errors ([30b4809](https://github.com/okonet/lint-staged/commit/30b480925a313f5c2b614eb40eb1a340a6cefae5))

## [v10.0.0-beta.13](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.13) - 20 Dec 2019

### Bug Fixes

- handle git MERGE\_\* files separately; improve error handling ([da22cf2](https://github.com/okonet/lint-staged/commit/da22cf22bbd21be98a73b880a4ce43dbd0129021))

## [v10.0.0-beta.12](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.12) - 18 Dec 2019

### Features

- support async function tasks ([20d5c5d](https://github.com/okonet/lint-staged/commit/20d5c5d4cb92f9a4c501e5308cc51379d10581a8))

## [v10.0.0-beta.11](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.11) - 17 Dec 2019

### Bug Fixes

- fail with a message when backup stash is missing ([1b64239](https://github.com/okonet/lint-staged/commit/1b64239163f5560b7235843909a9d30ff7ca1b83))

## [v10.0.0-beta.10](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.10) - 17 Dec 2019

### Bug Fixes

- correctly recover when unstaged changes cannot be restored ([d091f71](https://github.com/okonet/lint-staged/commit/d091f71ff50b1eddc59e759b1b09a95ed613c4d2))

## [v10.0.0-beta.9](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.9) - 16 Dec 2019

### Bug Fixes

- restore metadata about git merge before running tasks ([f8ddfc2](https://github.com/okonet/lint-staged/commit/f8ddfc22d22fec2b417a67249573e7cd6abdb9fc))

## [v10.0.0-beta.8](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.8) - 14 Dec 2019

### Bug Fixes

- better workaround for git stash --keep-index bug ([f3ae378](https://github.com/okonet/lint-staged/commit/f3ae378aa8d7207f990c4ffec854cc8da4d38b1d))

## [v10.0.0-beta.7](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.7) - 05 Dec 2019

### Bug Fixes

- automatically add modifications only to originally staged files ([083b8e7](https://github.com/okonet/lint-staged/commit/083b8e7d67307a177d427d694ead22cb0c95b0ca))

### Features

- bump Node.js version dependency to at least 10.13.0 ([#747](https://github.com/okonet/lint-staged/issues/747)) ([814b9df](https://github.com/okonet/lint-staged/commit/814b9dfe131f55c18a8996f775dd5dd582d0a766))

### BREAKING CHANGES

- Node.js v8 is no longer supported because it will reach EOL on 2019-12-31

## [v10.0.0-beta.6](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.6) - 27 Nov 2019

### Features

- add support for concurrent CLI option ([6af8307](https://github.com/okonet/lint-staged/commit/6af83070c44003477c00d4c088806af23333ec59))

## [v10.0.0-beta.5](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.5) - 27 Nov 2019

### Bug Fixes

- improve debug logging ([f88e226](https://github.com/okonet/lint-staged/commit/f88e22619b8dea4fbcda3d57a85ca9d1be152908))
- max arg length is by default half of the allowed to prevent edge cases ([80406c2](https://github.com/okonet/lint-staged/commit/80406c20fd3d1a86b0a0558c10f6747b2b47698e))

## [v9.5.0](https://github.com/okonet/lint-staged/releases/tag/v9.5.0) - 27 Nov 2019

### Features

- add support for concurrent CLI option ([6af8307](https://github.com/okonet/lint-staged/commit/6af83070c44003477c00d4c088806af23333ec59))

## [v10.0.0-beta.4](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.4) - 20 Nov 2019

### Features

- split tasks into chunks to support shells with limited max argument length ([#732](https://github.com/okonet/lint-staged/issues/732)) ([cb43872](https://github.com/okonet/lint-staged/commit/cb43872fb6c05366a8fc25a8bd889b95918f45a3))

## [v10.0.0-beta.3](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.3) - 14 Nov 2019

### Bug Fixes

- support binary files ([7b3a334](https://github.com/okonet/lint-staged/commit/7b3a334ac33ffe1bda930583a055fb1db0b6d181))

## [v10.0.0-beta.2](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.2) - 14 Nov 2019

### Bug Fixes

- correctly leave only staged files for running tasks ([cfde9ca](https://github.com/okonet/lint-staged/commit/cfde9ca64bed7fa236eda69e63478c536f9f9068))

### Reverts

- Revert "fix: no need to run `git clean -df` since untracked changes are stashed" ([e58ebbf](https://github.com/okonet/lint-staged/commit/e58ebbfa2dbbcd0c05ae13026a65c33ff791e211))

## [v10.0.0-beta.1](https://github.com/okonet/lint-staged/releases/tag/v10.0.0-beta.1) - 14 Nov 2019

### Bug Fixes

- add all modified files to git index with `git add .` ([bf532c2](https://github.com/okonet/lint-staged/commit/bf532c2af9dbd3514b16768a106fea82ddc99923))
- correctly restore untracked files from backup stash ([c7d0592](https://github.com/okonet/lint-staged/commit/c7d05922b24524707795c4045339801c86affe9d))
- gitWorkflow handles active merge mode ([2f1e886](https://github.com/okonet/lint-staged/commit/2f1e886cba422844b0496a96696dae5296835862))
- keep untracked files around by backing them up ([fc03fdc](https://github.com/okonet/lint-staged/commit/fc03fdc2e869384eb2d6423ff31f84e3cf22007e))
- no need to run `git clean -df` since untracked changes are stashed ([869bac6](https://github.com/okonet/lint-staged/commit/869bac617dd1ef46e6689027c9d3ec67b3a00934))
- prevent Listr from hiding git add warning ([cce9809](https://github.com/okonet/lint-staged/commit/cce9809a2ce335a3b2c3f44e4c521270b13f9d4c))
- retry failing apply with 3-way merge ([76cb08f](https://github.com/okonet/lint-staged/commit/76cb08f6eecd68f3ae7e606216b4c5fdc1da94f0))
- try applying unstaged changes before handling errors ([357934f](https://github.com/okonet/lint-staged/commit/357934fe1e193040d1a138d3d138da1377004be2))
- update warning about git add, and to README ([6467a66](https://github.com/okonet/lint-staged/commit/6467a66b13657f1a39b0f1f3a079dc31a8461fe9))
- workaround for stashing deleted files for git < 2.23 ([1a87333](https://github.com/okonet/lint-staged/commit/1a87333f9ee0704b3bb332bf5fbc11dbd25f7821))

### Features

- automatically stage task modifications ([74ed28d](https://github.com/okonet/lint-staged/commit/74ed28d5edc70c66d769f7658b90b550029a2acf))
- use git stashes for gitWorkflow ([40a5db1](https://github.com/okonet/lint-staged/commit/40a5db1f6b1ad17b5a593974b6db93015f50824c))
- warn when task contains "git add" ([5208399](https://github.com/okonet/lint-staged/commit/52083990166cbea3bfe3d316ad6598c6c198fe1e))

### BREAKING CHANGES

- Prior to version 10, tasks had to manually include `git add` as the final step. This behavior has been integrated into lint-staged itself in order to prevent race conditions with multiple tasks editing the same files. If lint-staged detects `git add` in task configurations, it will show a warning in the console. Please remove `git add` from your configuration after upgrading.

## [v9.4.3](https://github.com/okonet/lint-staged/releases/tag/v9.4.3) - 13 Nov 2019

### Bug Fixes

- **deps:** bump eslint-utils from 1.4.0 to 1.4.3 to fix a security vulnerability ([#722](https://github.com/okonet/lint-staged/issues/722)) ([ed84d8e](https://github.com/okonet/lint-staged/commit/ed84d8e812010f6da333eff7ca31c71ebf35e7df))

## [v9.5.0-beta.2 (v9.5.0-beta.2@beta)](https://github.com/okonet/lint-staged/releases/tag/v9.5.0-beta.2@beta) - 03 Nov 2019

### Bug Fixes

- no need to run `git clean -df` since untracked changes are stashed ([bbfae43](https://github.com/okonet/lint-staged/commit/bbfae432c319eabb980bf9491c64f545521f5f64))
- update warning about git add, and to README ([4fe53ef](https://github.com/okonet/lint-staged/commit/4fe53efbc6a7b68afe1786fc0c17b688dcc5fa0e))

### BREAKING CHANGES

- Prior to version 10, tasks had to manually include `git add` as the final step. This behavior has been integrated into lint-staged itself in order to prevent race conditions with multiple tasks editing the same files. If lint-staged detects `git add` in task configurations, it will show a warning in the console. Please remove `git add` from your configuration after upgrading.

## [v9.5.0-beta.1 (v9.5.0-beta.1@beta)](https://github.com/okonet/lint-staged/releases/tag/v9.5.0-beta.1@beta) - 31 Oct 2019

### Bug Fixes

- correctly restore untracked files from backup stash ([0111f48](https://github.com/okonet/lint-staged/commit/0111f4848e4043cfaf45b528e952db6ea7182cb4))
- gitWorkflow handles active merge mode ([959d9d9](https://github.com/okonet/lint-staged/commit/959d9d926d42958feca74a0ca355ffd04c42d113))
- keep untracked files around by backing them up ([d20c5be](https://github.com/okonet/lint-staged/commit/d20c5be11acd3dc2fca3e74830305f3309617ad2))
- prevent Listr from hiding git add warning ([2b57db0](https://github.com/okonet/lint-staged/commit/2b57db07ac44870063e15d7f6aaea0d54f9833bf))
- retry failing apply with 3-way merge ([30939b9](https://github.com/okonet/lint-staged/commit/30939b91b52a53b0045cffdcacd8cb0ec15e2c05))
- try applying unstaged changes before handling errors ([080f1c6](https://github.com/okonet/lint-staged/commit/080f1c62c74c2ffb26df2e7a8f44d349584db53b))
- workaround for stashing deleted files for git < 2.23 ([50afea0](https://github.com/okonet/lint-staged/commit/50afea0ffc6d08f89dd98372a3ff8f48d76f3070))

### Features

- automatically stage task modifications ([7d0379d](https://github.com/okonet/lint-staged/commit/7d0379db4f61a0ef460133e0488d2766777bbf32))
- use git stashes for gitWorkflow ([bfd2adc](https://github.com/okonet/lint-staged/commit/bfd2adc27dff016b7aa84df1cb0570ed836c6426))
- warn when task contains "git add" ([4014f3c](https://github.com/okonet/lint-staged/commit/4014f3c926be1fca183c35de17eb35f939690283))

## [v9.4.2](https://github.com/okonet/lint-staged/releases/tag/v9.4.2) - 08 Oct 2019

### Bug Fixes

- create fn title with mock file list of correct length ([8c3ca58](https://github.com/okonet/lint-staged/commit/8c3ca58))

## [v9.4.1](https://github.com/okonet/lint-staged/releases/tag/v9.4.1) - 01 Oct 2019

### Bug Fixes

- add note about next version ([#708](https://github.com/okonet/lint-staged/issues/708)) ([8ec040c](https://github.com/okonet/lint-staged/commit/8ec040c))

## [v9.4.0](https://github.com/okonet/lint-staged/releases/tag/v9.4.0) - 26 Sep 2019

### Features

- Use shorter title for function tasks with many staged files ([#706](https://github.com/okonet/lint-staged/issues/706)) ([1dcdb89](https://github.com/okonet/lint-staged/commit/1dcdb89)), closes [#674](https://github.com/okonet/lint-staged/issues/674)

## [v9.3.0](https://github.com/okonet/lint-staged/releases/tag/v9.3.0) - 22 Sep 2019

### Features

- allow to pass config instead of configPath ([14c46d2](https://github.com/okonet/lint-staged/commit/14c46d2))

## [v9.2.5](https://github.com/okonet/lint-staged/releases/tag/v9.2.5) - 27 Aug 2019

### Bug Fixes

- validateConfig validates function task return values ([d8fad78](https://github.com/okonet/lint-staged/commit/d8fad78))

## [v9.2.4](https://github.com/okonet/lint-staged/releases/tag/v9.2.4) - 25 Aug 2019

### Bug Fixes

- include renames when getting list of staged files ([2243a83](https://github.com/okonet/lint-staged/commit/2243a83))

## [v9.2.3](https://github.com/okonet/lint-staged/releases/tag/v9.2.3) - 17 Aug 2019

### Bug Fixes

- don't normalize path gitDir path for better Windows compatibility ([eb3fa83](https://github.com/okonet/lint-staged/commit/eb3fa83))
- generateTasks handles parent dir globs correctly ([82b5182](https://github.com/okonet/lint-staged/commit/82b5182))
- normalize gitDir path to posix using normalize-path ([f485e51](https://github.com/okonet/lint-staged/commit/f485e51))

## [v9.2.2](https://github.com/okonet/lint-staged/releases/tag/v9.2.2) - 17 Aug 2019

### Bug Fixes

- apply patch only if there's a diff ([e70e08f](https://github.com/okonet/lint-staged/commit/e70e08f))

## [v9.2.1](https://github.com/okonet/lint-staged/releases/tag/v9.2.1) - 25 Jul 2019

### Bug Fixes

- pin commitizen@3.1.2 to support node 8 ([ee774e3](https://github.com/okonet/lint-staged/commit/ee774e3))
- pin cz-conventional-changelog@2.1.0 to support node 8 ([e879b6a](https://github.com/okonet/lint-staged/commit/e879b6a))
- remove empty spaces from warning ([6126b72](https://github.com/okonet/lint-staged/commit/6126b72))

## [v9.2.0](https://github.com/okonet/lint-staged/releases/tag/v9.2.0) - 10 Jul 2019

### Features

- add --relative option for controlling file paths ([242deb5](https://github.com/okonet/lint-staged/commit/242deb5))

## [v9.1.0](https://github.com/okonet/lint-staged/releases/tag/v9.1.0) - 06 Jul 2019

### Bug Fixes

- snapshot with fully-resolved path name ([b1a08b8](https://github.com/okonet/lint-staged/commit/b1a08b8))

### Features

- make node-api accessible ([ca37906](https://github.com/okonet/lint-staged/commit/ca37906))

## [v9.0.2](https://github.com/okonet/lint-staged/releases/tag/v9.0.2) - 03 Jul 2019

### Bug Fixes

- run all commands returned by function linters ([0dd0c94](https://github.com/okonet/lint-staged/commit/0dd0c94))

## [v9.0.1](https://github.com/okonet/lint-staged/releases/tag/v9.0.1) - 02 Jul 2019

### Bug Fixes

- Update node version requirement ([#646](https://github.com/okonet/lint-staged/issues/646)) ([6c1e42f](https://github.com/okonet/lint-staged/commit/6c1e42f))

## [v9.0.0](https://github.com/okonet/lint-staged/releases/tag/v9.0.0) - 01 Jul 2019

### Bug Fixes

- parse titles for function linters ([e24aaf2](https://github.com/okonet/lint-staged/commit/e24aaf2))

### Code Refactoring

- remove advanced configuration options ([04190c8](https://github.com/okonet/lint-staged/commit/04190c8))
- remove support for chunking ([2ca9050](https://github.com/okonet/lint-staged/commit/2ca9050))
- use execa's shell option to run commands ([bed9127](https://github.com/okonet/lint-staged/commit/bed9127))

### Features

- add --shell and --quiet flags ([ecf9227](https://github.com/okonet/lint-staged/commit/ecf9227))
- add deprecation error for advanced configuration ([4bef26e](https://github.com/okonet/lint-staged/commit/4bef26e))
- support function linter returning array of commands ([36e54a2](https://github.com/okonet/lint-staged/commit/36e54a2))
- support functions as linter commands ([f76c0d1](https://github.com/okonet/lint-staged/commit/f76c0d1))

### BREAKING CHANGES

- The advanced configuration options have been deprecated in favour of the simple format
- Local commands are no longer resolved by lint-staged, but execa will do this instead. In effect, there are no longer pretty error messages when commands are not found.
- Very long arguments strings are no longer chunked on Windows. Function linters should be used instead to customise this behaviour.

## [v8.2.1](https://github.com/okonet/lint-staged/releases/tag/v8.2.1) - 13 Jun 2019

### Bug Fixes

- Override env GIT_DIR variable to resolve to the correct git dir path ([#629](https://github.com/okonet/lint-staged/issues/629)) ([5892455](https://github.com/okonet/lint-staged/commit/5892455)), closes [#627](https://github.com/okonet/lint-staged/issues/627)

## [v8.2.0](https://github.com/okonet/lint-staged/releases/tag/v8.2.0) - 06 Jun 2019

### Bug Fixes

- normalize gitDir path for Windows compatibility ([90e343b](https://github.com/okonet/lint-staged/commit/90e343b))

### Features

- throw error in runAll if outside git directory ([6ac666d](https://github.com/okonet/lint-staged/commit/6ac666d))

## [v8.1.7](https://github.com/okonet/lint-staged/releases/tag/v8.1.7) - 15 May 2019

### Bug Fixes

- Resolve security vulnerability in dependencies ([#615](https://github.com/okonet/lint-staged/issues/615)) ([315890a](https://github.com/okonet/lint-staged/commit/315890a)), closes [#600](https://github.com/okonet/lint-staged/issues/600)

## [v8.1.6](https://github.com/okonet/lint-staged/releases/tag/v8.1.6) - 03 May 2019

### Bug Fixes

- update yup to 0.27.0 ([#607](https://github.com/okonet/lint-staged/issues/607)) ([0984524](https://github.com/okonet/lint-staged/commit/0984524))

## [v8.1.5](https://github.com/okonet/lint-staged/releases/tag/v8.1.5) - 01 Mar 2019

### Bug Fixes

- fix issue with scoped pkg listr-update-renderer ([#587](https://github.com/okonet/lint-staged/issues/587)) ([63b085f](https://github.com/okonet/lint-staged/commit/63b085f)), closes [#585](https://github.com/okonet/lint-staged/issues/585)

## [v8.1.4](https://github.com/okonet/lint-staged/releases/tag/v8.1.4) - 14 Feb 2019

### Bug Fixes

- Use lodash version with prototype pollution fix ([#578](https://github.com/okonet/lint-staged/issues/578)) ([0be88a0](https://github.com/okonet/lint-staged/commit/0be88a0))

## [v8.1.3](https://github.com/okonet/lint-staged/releases/tag/v8.1.3) - 02 Feb 2019

### Bug Fixes

- Display package name when node-please-upgrade is being used ([#575](https://github.com/okonet/lint-staged/issues/575)) ([f5bed7b](https://github.com/okonet/lint-staged/commit/f5bed7b))

## [v8.1.2](https://github.com/okonet/lint-staged/releases/tag/v8.1.2) - 02 Feb 2019

### Bug Fixes

- Avoid stashing if no staged files has been changed ([#570](https://github.com/okonet/lint-staged/issues/570)) ([#573](https://github.com/okonet/lint-staged/issues/573)) ([8c4d9c9](https://github.com/okonet/lint-staged/commit/8c4d9c9))

## [v8.1.1](https://github.com/okonet/lint-staged/releases/tag/v8.1.1) - 28 Jan 2019

### Bug Fixes

- Fix configuration validation and allow specifying custom renderers ([#572](https://github.com/okonet/lint-staged/issues/572)) ([d5e738d](https://github.com/okonet/lint-staged/commit/d5e738d)), closes [#567](https://github.com/okonet/lint-staged/issues/567)

## [v8.1.0](https://github.com/okonet/lint-staged/releases/tag/v8.1.0) - 21 Nov 2018

### Features

- Add `relative` option to allow passing relative paths to linters ([#534](http://git+https/github.com/okonet/lint-staged/issues/534)) ([fcb774b](http://git+https/github.com/okonet/lint-staged/commit/fcb774b))

## [v8.0.5](https://github.com/okonet/lint-staged/releases/tag/v8.0.5) - 17 Nov 2018

### Bug Fixes

- Use listr-update-renderer from npm ([#542](http://git+https/github.com/okonet/lint-staged/issues/542)) ([503110d](http://git+https/github.com/okonet/lint-staged/commit/503110d)), closes [#533](http://git+https/github.com/okonet/lint-staged/issues/533)

## [v8.0.4](https://github.com/okonet/lint-staged/releases/tag/v8.0.4) - 31 Oct 2018

### Bug Fixes

- **package:** update staged-git-files to version 1.1.2 ([ce434d3](http://git+https/github.com/okonet/lint-staged/commit/ce434d3))

## [v8.0.3](https://github.com/okonet/lint-staged/releases/tag/v8.0.3) - 30 Oct 2018

### Bug Fixes

- Allow to use lint-staged on CI ([#523](http://git+https/github.com/okonet/lint-staged/issues/523)) ([225a904](http://git+https/github.com/okonet/lint-staged/commit/225a904))

## [v8.0.2](https://github.com/okonet/lint-staged/releases/tag/v8.0.2) - 29 Oct 2018

### Bug Fixes

- **git:** Use resolveGitDir in hasPartiallyStagedFiles ([#520](http://git+https/github.com/okonet/lint-staged/issues/520)) ([af99172](http://git+https/github.com/okonet/lint-staged/commit/af99172)), closes [#514](http://git+https/github.com/okonet/lint-staged/issues/514)

## [v8.0.1](https://github.com/okonet/lint-staged/releases/tag/v8.0.1) - 29 Oct 2018

### Bug Fixes

- **git:** Use resolveGitDir to resolve to .git for git commands ([#518](http://git+https/github.com/okonet/lint-staged/issues/518)) ([da42f8a](http://git+https/github.com/okonet/lint-staged/commit/da42f8a)), closes [#514](http://git+https/github.com/okonet/lint-staged/issues/514)

## [v8.0.0](https://github.com/okonet/lint-staged/releases/tag/v8.0.0) - 29 Oct 2018

### Features

- Add support for partially staged files ([#75](http://git+https/github.com/okonet/lint-staged/issues/75)) ([f82443c](http://git+https/github.com/okonet/lint-staged/commit/f82443c)), closes [#62](http://git+https/github.com/okonet/lint-staged/issues/62)

### BREAKING CHANGES

- Node >= 8.6 is required

## [v7.3.0](https://github.com/okonet/lint-staged/releases/tag/v7.3.0) - 20 Sep 2018

### Features

- Allow linting files outside of project folder ([#495](https://github.com/okonet/lint-staged/issues/495)) ([d386c80](https://github.com/okonet/lint-staged/commit/d386c80))

## [v7.2.2](https://github.com/okonet/lint-staged/releases/tag/v7.2.2) - 12 Aug 2018

### Bug Fixes

- Make app package.json load error tolerant ([#479](https://github.com/okonet/lint-staged/issues/479)) ([d59fad7](https://github.com/okonet/lint-staged/commit/d59fad7))

## [v7.2.1](https://github.com/okonet/lint-staged/releases/tag/v7.2.1) - 12 Aug 2018

### Bug Fixes

- Disable recursive checks for jest-validate ([#483](https://github.com/okonet/lint-staged/issues/483)) ([c350a0e](https://github.com/okonet/lint-staged/commit/c350a0e))

## [v7.2.0](https://github.com/okonet/lint-staged/releases/tag/v7.2.0) - 11 Jun 2018

### Features

- Resolve a npm package passed as --config ([#464](https://github.com/okonet/lint-staged/issues/464)) ([c34a3f7](https://github.com/okonet/lint-staged/commit/c34a3f7))

## [v7.1.3](https://github.com/okonet/lint-staged/releases/tag/v7.1.3) - 01 Jun 2018

### Bug Fixes

- **package:** Update jest-validate to version 23.0.0 ([#458](https://github.com/okonet/lint-staged/issues/458)) ([3d0ccb2](https://github.com/okonet/lint-staged/commit/3d0ccb2))

## [v7.1.2](https://github.com/okonet/lint-staged/releases/tag/v7.1.2) - 21 May 2018

### Bug Fixes

- **package:** Update cosmiconfig to version 5.0.2 ([#444](https://github.com/okonet/lint-staged/issues/444)) ([2fc7aa3](https://github.com/okonet/lint-staged/commit/2fc7aa3)), closes [#441](https://github.com/okonet/lint-staged/issues/441)
- **package:** Update listr to version 0.14.1 ([#445](https://github.com/okonet/lint-staged/issues/445)) ([a56d7c9](https://github.com/okonet/lint-staged/commit/a56d7c9)), closes [#426](https://github.com/okonet/lint-staged/issues/426)
- Add .lintstagedrc.js to list of config files to search ([9e27620](https://github.com/okonet/lint-staged/commit/9e27620))

## [v7.1.1](https://github.com/okonet/lint-staged/releases/tag/v7.1.1) - 18 May 2018

### Bug Fixes

- **cli:** Correct value for FORCE_COLOR env var ([#451](https://github.com/okonet/lint-staged/issues/451)) ([9823d26](https://github.com/okonet/lint-staged/commit/9823d26)), closes [#448](https://github.com/okonet/lint-staged/issues/448)

## [v7.1.0](https://github.com/okonet/lint-staged/releases/tag/v7.1.0) - 07 May 2018

### Features

- Chunked execution of linters on Windows only ([#439](https://github.com/okonet/lint-staged/issues/439)) ([1601c02](https://github.com/okonet/lint-staged/commit/1601c02))

## [v7.0.5](https://github.com/okonet/lint-staged/releases/tag/v7.0.5) - 26 Apr 2018

### Bug Fixes

- Update "please-upgrade-node" to version 3.0.2 ([#434](https://github.com/okonet/lint-staged/issues/434)) ([b9d84ce](https://github.com/okonet/lint-staged/commit/b9d84ce))

## [v7.0.4](https://github.com/okonet/lint-staged/releases/tag/v7.0.4) - 05 Apr 2018

### Bug Fixes

- Parse arguments with single quotes properly. Better tests. ([29fc479](https://github.com/okonet/lint-staged/commit/29fc479)), closes [#419](https://github.com/okonet/lint-staged/issues/419)

## [v7.0.3](https://github.com/okonet/lint-staged/releases/tag/v7.0.3) - 03 Apr 2018

### Bug Fixes

- Fix cli-command-parser to parse arguments for execa ([b4fbc3b](https://github.com/okonet/lint-staged/commit/b4fbc3b)), closes [#419](https://github.com/okonet/lint-staged/issues/419)
- Use double quotes to make command work on Windows ([06635c6](https://github.com/okonet/lint-staged/commit/06635c6))

## [v7.0.2](https://github.com/okonet/lint-staged/releases/tag/v7.0.2) - 01 Apr 2018

### Bug Fixes

- Hide error message in a private field to avoid duplicate logs ([#421](https://github.com/okonet/lint-staged/issues/421)) ([4d6f165](https://github.com/okonet/lint-staged/commit/4d6f165))

## [v7.0.1](https://github.com/okonet/lint-staged/releases/tag/v7.0.1) - 30 Mar 2018

### Bug Fixes

- **package:** update staged-git-files to version 1.1.1 ([31176c9](https://github.com/okonet/lint-staged/commit/31176c9))

## [v7.0.0](https://github.com/okonet/lint-staged/releases/tag/v7.0.0) - 21 Feb 2018

### Bug Fixes

- **package:** Bump dependencies ([267ff0f](https://github.com/okonet/lint-staged/commit/267ff0f))

### Code Refactoring

- Drop support for Node.js 4 ([#399](https://github.com/okonet/lint-staged/issues/399)) ([05a062d](https://github.com/okonet/lint-staged/commit/05a062d))

### Features

- Remove support for npm scripts ([#390](https://github.com/okonet/lint-staged/issues/390)) ([d8b836c](https://github.com/okonet/lint-staged/commit/d8b836c))

### Performance Improvements

- Switch from minimatch to micromatch ([#388](https://github.com/okonet/lint-staged/issues/388)) ([5a333a0](https://github.com/okonet/lint-staged/commit/5a333a0))

### BREAKING CHANGES

- **Requires Node.js v6 or later.**
- **Remove implicit support for running npm scripts.**

  Consider example `lint-staged` config:

  ```json
  {
    "name": "My project",
    "version": "0.1.0",
    "scripts": {
      "my-custom-script": "linter --arg1 --arg2",
      "precommit": "lint-staged"
    },
    "lint-staged": {
      "*.js": ["my-custom-script", "git add"]
    }
  }
  ```

  The list of commands should be changed to the following:

  ```
    "*.js": ["npm run my-custom-script --", "git add"]
  ```

- **The following `minimatch` options are not supported in `micromatch`:**
  - `nocomment`: https://github.com/isaacs/minimatch#nocomment
  - `flipnegate`: https://github.com/isaacs/minimatch#flipnegate

## [v6.1.1](https://github.com/okonet/lint-staged/releases/tag/v6.1.1) - 16 Feb 2018

### Bug Fixes

- **package:** Update staged-git-files to version 1.0.0 ([677e860](https://github.com/okonet/lint-staged/commit/677e860))

## [v6.1.0](https://github.com/okonet/lint-staged/releases/tag/v6.1.0) - 26 Jan 2018

### Features

- **config:** Add `ignore` config option ([#385](https://github.com/okonet/lint-staged/issues/385)) ([5b7bc67](https://github.com/okonet/lint-staged/commit/5b7bc67))

## [v6.0.1](https://github.com/okonet/lint-staged/releases/tag/v6.0.1) - 19 Jan 2018

### Bug Fixes

- **package:** update cosmiconfig to version 4.0.0 ([80596c3](https://github.com/okonet/lint-staged/commit/80596c3))

## [v6.0.0](https://github.com/okonet/lint-staged/releases/tag/v6.0.0) - 01 Dec 2017

### Features

- Add debug mode, deprecate verbose option ([#344](https://github.com/okonet/lint-staged/issues/344)) ([8f214f0](https://github.com/okonet/lint-staged/commit/8f214f0))

### BREAKING CHANGES

- `verbose` config option has been deprecated and is superseded
  by the command line option `--debug`.

## [v5.0.0](https://github.com/okonet/lint-staged/releases/tag/v5.0.0) - 11 Nov 2017

### Features

- Remove gitDir option and resolve it automatically ([#327](https://github.com/okonet/lint-staged/issues/327)) ([0ed5135](https://github.com/okonet/lint-staged/commit/0ed5135)), closes [#271](https://github.com/okonet/lint-staged/issues/271)

### BREAKING CHANGES

- `gitDir` option deprecated and will be ignored. Additionally, glob patterns for linters should not be relative to the git root directory.

Consider a project with the following file structure:

```
`-- packages
    |-- prj
    |   |-- package.json
    |   |-- src
    |   |   `-- index.js
    |   `-- yarn.lock
    `-- prj-2
        `-- file
```

With `lint-staged@4.3.0`, the config would need to be something like this:

```yml
gitDir: ../..
linters:
  packages/prj/src/*.js:
    - eslint --fix
    - git add
```

With `lint-staged@5`, this simplifies to:

```yml
linters:
  src/*.js:
    - eslint --fix
    - git add
```

<details>

<summary><code>diff</code> view</summary>

```diff
@@ -1,5 +1,4 @@
-gitDir: ../..
 linters:
-  packages/prj/src/*.js:
+  src/*.js:
     - eslint --fix
     - git add
```

</details>

## [v4.3.0](https://github.com/okonet/lint-staged/releases/tag/v4.3.0) - 18 Oct 2017

### Features

- Allow config to be provided via command-line ([#304](https://github.com/okonet/lint-staged/issues/304)) ([54809ae](https://github.com/okonet/lint-staged/commit/54809ae))

## [v4.2.3](https://github.com/okonet/lint-staged/releases/tag/v4.2.3) - 25 Sep 2017

### Bug Fixes

- **findBin:** Add separator before npm args ([#297](https://github.com/okonet/lint-staged/issues/297)) ([065f362](https://github.com/okonet/lint-staged/commit/065f362))

## [v4.2.2](https://github.com/okonet/lint-staged/releases/tag/v4.2.2) - 22 Sep 2017

### Bug Fixes

- **findBin:** Resolve package script with args ([#295](https://github.com/okonet/lint-staged/issues/295)) ([1dc3bd6](https://github.com/okonet/lint-staged/commit/1dc3bd6))

## [v4.2.1](https://github.com/okonet/lint-staged/releases/tag/v4.2.1) - 15 Sep 2017

### Bug Fixes

- Missing entry file ([#283](https://github.com/okonet/lint-staged/issues/283)) ([e17ba5f](https://github.com/okonet/lint-staged/commit/e17ba5f)), closes [#284](https://github.com/okonet/lint-staged/issues/284)

## [v4.2.0](https://github.com/okonet/lint-staged/releases/tag/v4.2.0) - 15 Sep 2017

### Features

- Print friendlier error if config is missing ([#281](https://github.com/okonet/lint-staged/issues/281)) ([30fa594](https://github.com/okonet/lint-staged/commit/30fa594))

## [v4.1.3](https://github.com/okonet/lint-staged/releases/tag/v4.1.3) - 07 Sep 2017

### Bug Fixes

- Unicode symbols compatibility on Windows ([#248](https://github.com/okonet/lint-staged/issues/248)) ([49b11e4](https://github.com/okonet/lint-staged/commit/49b11e4))

## [v4.1.2](https://github.com/okonet/lint-staged/releases/tag/v4.1.2) - 06 Sep 2017

### Bug Fixes

- Handle the case when staged-git-files errors properly ([#267](https://github.com/okonet/lint-staged/issues/267)) ([a8a585a](https://github.com/okonet/lint-staged/commit/a8a585a)), closes [#264](https://github.com/okonet/lint-staged/issues/264)

## [v4.1.1](https://github.com/okonet/lint-staged/releases/tag/v4.1.1) - 06 Sep 2017

### Bug Fixes

- Use lodash `has` to check config keys presence ([#265](https://github.com/okonet/lint-staged/issues/265)) ([c0287e6](https://github.com/okonet/lint-staged/commit/c0287e6)), closes [#263](https://github.com/okonet/lint-staged/issues/263)

## [v4.1.0](https://github.com/okonet/lint-staged/releases/tag/v4.1.0) - 04 Sep 2017

### Features

- **config:** Config validation ([#141](https://github.com/okonet/lint-staged/issues/141)) ([d99eb38](https://github.com/okonet/lint-staged/commit/d99eb38))

## [v4.0.4](https://github.com/okonet/lint-staged/releases/tag/v4.0.4) - 24 Aug 2017

### Bug Fixes

- Disable concurrent sub task execution by default ([#229](https://github.com/okonet/lint-staged/issues/229)) ([48c8c6ff](https://github.com/okonet/lint-staged/commit/48c8c6ff), closes [#225](https://github.com/okonet/lint-staged/issues/225))

## [v4.0.3](https://github.com/okonet/lint-staged/releases/tag/v4.0.3) - 06 Aug 2017

### Bug Fixes

- **package:** update execa to version 0.8.0 ([#222](https://github.com/okonet/lint-staged/issues/222)) ([27adf8bb](https://github.com/okonet/lint-staged/commit/27adf8bb))

## [v4.0.2](https://github.com/okonet/lint-staged/releases/tag/v4.0.2) - 17 Jul 2017

### Bug Fixes

- Remove unportable postinstall step ([#213](https://github.com/okonet/lint-staged/issues/213)) ([a2dcd047](https://github.com/okonet/lint-staged/commit/a2dcd047), closes [#212](https://github.com/okonet/lint-staged/issues/212), [#192](https://github.com/okonet/lint-staged/issues/192))

## [v4.0.1](https://github.com/okonet/lint-staged/releases/tag/v4.0.1) - 06 Jul 2017

### Bug Fixes

- Bail on fatal errors ([#208](https://github.com/okonet/lint-staged/issues/208)) ([ca85d82a](https://github.com/okonet/lint-staged/commit/ca85d82a))

## [v4.0.0](https://github.com/okonet/lint-staged/releases/tag/v4.0.0) - 18 Jun 2017

### Bug Fixes

- Skip '--' argument for non-npm commands ([#196](https://github.com/okonet/lint-staged/issues/196)) ([ad265664](https://github.com/okonet/lint-staged/commit/ad265664), closes [#195](https://github.com/okonet/lint-staged/issues/195))

### Breaking Changes

-

This might affect existing setups which depend on the `--` argument.
([ad265664](https://github.com/okonet/lint-staged/commit/ad265664))

## [v3.6.1](https://github.com/okonet/lint-staged/releases/tag/v3.6.1) - 10 Jun 2017

### Bug Fixes

- **package:** update execa to version 0.7.0 ([#187](https://github.com/okonet/lint-staged/issues/187)) ([4bfe017d](https://github.com/okonet/lint-staged/commit/4bfe017d))

## [v3.6.0](https://github.com/okonet/lint-staged/releases/tag/v3.6.0) - 01 Jun 2017

### Features

- Add advanced option `globOptions` to customise minimatch ([#179](https://github.com/okonet/lint-staged/issues/179)) ([c5b9804b](https://github.com/okonet/lint-staged/commit/c5b9804b), closes [#173](https://github.com/okonet/lint-staged/issues/173))

## [v3.5.1](https://github.com/okonet/lint-staged/releases/tag/v3.5.1) - 29 May 2017

### Bug Fixes

- **gitDir:** Fix for checking if task contains `git.exe` on Windows ([#178](https://github.com/okonet/lint-staged/issues/178)) ([4c600178](https://github.com/okonet/lint-staged/commit/4c600178))

## [v3.5.0](https://github.com/okonet/lint-staged/releases/tag/v3.5.0) - 25 May 2017

### Features

- Run linters with configurable concurrency ([#149](https://github.com/okonet/lint-staged/issues/149)) ([79ad8b3f](https://github.com/okonet/lint-staged/commit/79ad8b3f), closes [#147](https://github.com/okonet/lint-staged/issues/147))

## [v3.4.2](https://github.com/okonet/lint-staged/releases/tag/v3.4.2) - 17 May 2017

### Bug Fixes

- Only pass gitDir for git specific executables ([#162](https://github.com/okonet/lint-staged/issues/162)) ([c7283b77](https://github.com/okonet/lint-staged/commit/c7283b77), closes [#158](https://github.com/okonet/lint-staged/issues/158))

## [v3.4.1](https://github.com/okonet/lint-staged/releases/tag/v3.4.1) - 28 Apr 2017

### Bug Fixes

- **package:** update listr to version 0.12.0 ([#155](https://github.com/okonet/lint-staged/issues/155)) ([21df53ec](https://github.com/okonet/lint-staged/commit/21df53ec), closes [#142](https://github.com/okonet/lint-staged/issues/142))

## [v3.4.0](https://github.com/okonet/lint-staged/releases/tag/v3.4.0) - 13 Mar 2017

### Features

- Display a message if there are no files that match a pattern. ([#139](https://github.com/okonet/lint-staged/issues/139)) ([b0204ee4](https://github.com/okonet/lint-staged/commit/b0204ee4), closes [#135](https://github.com/okonet/lint-staged/issues/135))

## [v3.3.2](https://github.com/okonet/lint-staged/releases/tag/v3.3.2) - 13 Mar 2017

### Bug Fixes

- Remove unnecessary `which` dependency and code block in findBin.js ([3acd6c7b](https://github.com/okonet/lint-staged/commit/3acd6c7b))

## [v3.3.1](https://github.com/okonet/lint-staged/releases/tag/v3.3.1) - 19 Feb 2017

### Bug Fixes

- **concurrent:** Wait for all tasks to finish before showing errors ([5a44bea4](https://github.com/okonet/lint-staged/commit/5a44bea4), closes [#86](https://github.com/okonet/lint-staged/issues/86))
- **package:** update listr to version 0.11.0 ([3c75c16b](https://github.com/okonet/lint-staged/commit/3c75c16b))

## [v3.3.0](https://github.com/okonet/lint-staged/releases/tag/v3.3.0) - 30 Jan 2017

### Bug Fixes

- **gitDir:** Run `npm run` scripts in the current working directory instead of git directory. ([9c45d8ee](https://github.com/okonet/lint-staged/commit/9c45d8ee), closes [#122](https://github.com/okonet/lint-staged/issues/122))

### Features

- **verbose:** Add verbose option ([9dae19f9](https://github.com/okonet/lint-staged/commit/9dae19f9))

## [v3.2.9](https://github.com/okonet/lint-staged/releases/tag/v3.2.9) - 30 Jan 2017

### Bug Fixes

- **concurrent:** Fix `concurrent: false` could not be set using config ([22a1d774](https://github.com/okonet/lint-staged/commit/22a1d774))

## [v3.2.8](https://github.com/okonet/lint-staged/releases/tag/v3.2.8) - 24 Jan 2017

### Bug Fixes

- **windows:** Do not reuse execa options object for runners since it breaks on Windows ([#124](https://github.com/okonet/lint-staged/issues/124)) ([be8aa3f0](https://github.com/okonet/lint-staged/commit/be8aa3f0), closes [#114](https://github.com/okonet/lint-staged/issues/114))

## [v3.2.7](https://github.com/okonet/lint-staged/releases/tag/v3.2.7) - 18 Jan 2017

### Bug Fixes

- Generate absolute paths for all paths relative to git root ([#121](https://github.com/okonet/lint-staged/issues/121)) ([41ae0cb3](https://github.com/okonet/lint-staged/commit/41ae0cb3), closes [#118](https://github.com/okonet/lint-staged/issues/118), [#120](https://github.com/okonet/lint-staged/issues/120))

## [v3.2.6](https://github.com/okonet/lint-staged/releases/tag/v3.2.6) - 09 Jan 2017

### Bug Fixes

- **package:** update execa to version 0.6.0 ([#117](https://github.com/okonet/lint-staged/issues/117)) ([6fd017bf](https://github.com/okonet/lint-staged/commit/6fd017bf))

## [v3.2.5](https://github.com/okonet/lint-staged/releases/tag/v3.2.5) - 30 Dec 2016

### Bug Fixes

- **resolvePaths:** Use cwd-relative paths instead of absolute paths ([#116](https://github.com/okonet/lint-staged/issues/116)) ([968e0d8f](https://github.com/okonet/lint-staged/commit/968e0d8f), closes [#115](https://github.com/okonet/lint-staged/issues/115), [#115](https://github.com/okonet/lint-staged/issues/115))

## [v3.2.4](https://github.com/okonet/lint-staged/releases/tag/v3.2.4) - 19 Dec 2016

### Bug Fixes

- When rejecting, use new Error and error.message respectively. ([#113](https://github.com/okonet/lint-staged/issues/113)) ([97ad4b46](https://github.com/okonet/lint-staged/commit/97ad4b46), closes [#112](https://github.com/okonet/lint-staged/issues/112))

## [v3.2.3](https://github.com/okonet/lint-staged/releases/tag/v3.2.3) - 14 Dec 2016

### Bug Fixes

- Run commands in the context of `gitDir` if it is set ([#110](https://github.com/okonet/lint-staged/issues/110)) ([a74135d6](https://github.com/okonet/lint-staged/commit/a74135d6), closes [#109](https://github.com/okonet/lint-staged/issues/109))

## [v3.2.2](https://github.com/okonet/lint-staged/releases/tag/3.2.2) - 07 Dec 2016

- [fix]: Force colors only when running in TTY ([#108](https://github.com/okonet/lint-staged/issues/108))
- [docs]: Added npm version badge

## [v3.2.1](https://github.com/okonet/lint-staged/releases/tag/3.2.1) - 04 Nov 2016

- [fix]: Added `{ dot: true }` to allow more complex globs with dots in path ([#93](https://github.com/okonet/lint-staged/issues/93))
- [docs] Simpler pattern for matching js/jsx in the README. <Artem Sapegin>
- [docs] Be more specific about where to put `pre-commit` in the installation instructions. ([#87](https://github.com/okonet/lint-staged/issues/87)) <Artem Sapegin>
- [chore]: Added commitizen conventional changelog ([#92](https://github.com/okonet/lint-staged/issues/92))
- [chore] update eslint to version 3.9.1 ([#88](https://github.com/okonet/lint-staged/issues/88))
- [chore]: update listr to version 0.7.0 ([#85](https://github.com/okonet/lint-staged/issues/85))
- [chore]: Removed unused dev dependencies.

## [v3.2.0](https://github.com/okonet/lint-staged/releases/tag/3.2.0) - 18 Oct 2016

- [feature] Support rc files extensions (`.json`, `.yml` etc) as they aren't supported by default

## [v3.1.1](https://github.com/okonet/lint-staged/releases/tag/3.1.1) - 17 Oct 2016

- [fix] Properly resolve paths when the git directory differs from the current working directory. [#78](https://github.com/okonet/lint-staged/issues/78)
- [fix] Fixed `TypeError: Path must be a string. Received undefined` when `gitDir` isn't defined in the config.

## [v3.1.0](https://github.com/okonet/lint-staged/releases/tag/3.1.0) - 13 Oct 2016

- Split code into smaller modules + added tests for them. Closes [#68](https://github.com/okonet/lint-staged/issues/68)
- Support for different configs via https://github.com/davidtheclark/cosmiconfig. Closes [#64](https://github.com/okonet/lint-staged/issues/64)
- Run separate linters concurrently by default
- Added concurrent option to the config. Closes [#63](https://github.com/okonet/lint-staged/issues/63)
- Switched to https://github.com/okonet/eslint-config-okonet
- lint-staged now work from sub-directories. [#65](https://github.com/okonet/lint-staged/issues/65) by [@TheWolfNL](https://github.com/TheWolfNL)
- Output both `stdout` and `stderr` in case of error. Closes [#66](https://github.com/okonet/lint-staged/issues/66)

## [v3.0.3](https://github.com/okonet/lint-staged/releases/tag/3.0.3) - 22 Sep 2016

- Added `FORCE_COLOR` env variable to force colors for packages that depend on https://www.npmjs.com/package/supports-color. Closes [#50](https://github.com/okonet/lint-staged/issues/50)

## [v3.0.2](https://github.com/okonet/lint-staged/releases/tag/3.0.2) - 12 Sep 2016

- Removed unused dependecies

## [v3.0.1](https://github.com/okonet/lint-staged/releases/tag/3.0.1) - 08 Sep 2016

- Switched to listr. Simplified code and more beautiful output.
- Switched to execa. Should fix [#30](https://github.com/okonet/lint-staged/issues/30)
- Use ES2015. Dropped support for Node < 4.x
- Support commands with arguments in the lint-staged config. Closes [#47](https://github.com/okonet/lint-staged/issues/47)
- Support binaries from $PATH. Closes [#47](https://github.com/okonet/lint-staged/issues/47)
- Removed `--color` option from runner. You should pass arguments yourself.

## [v2.0.3](https://github.com/okonet/lint-staged/releases/tag/2.0.3) - 02 Aug 2016

- Use `cross-spawn` to fix issues with Windows. Closes [#30](https://github.com/okonet/lint-staged/issues/30). ([#34](https://github.com/okonet/lint-staged/issues/34))
- Updated dependencies

## [v2.0.2](https://github.com/okonet/lint-staged/releases/tag/2.0.2) - 11 Jul 2016

- Fixes an error when running a config with just one task ([#28](https://github.com/okonet/lint-staged/issues/28)). [#27](https://github.com/okonet/lint-staged/issues/27) [@Anber](https://github.com/Anber).
- Beautiful string representation for multiple linters in case of error.
- Added tests to getLintersAsString.

## [v2.0.1](https://github.com/okonet/lint-staged/releases/tag/2.0.1) - 08 Jul 2016

- When on of the sequential tasks fails, exit the process. Closes [#26](https://github.com/okonet/lint-staged/issues/26)

## [v2.0.0](https://github.com/okonet/lint-staged/releases/tag/2.0.0) - 08 Jul 2016

- Support for sequences of commands. Needs config update! [#25](https://github.com/okonet/lint-staged/issues/25) [@okonet](https://github.com/okonet)
- Allow adding files to the commit after running a task. [#16](https://github.com/okonet/lint-staged/issues/16) [@okonet](https://github.com/okonet)

## [v1.0.2](https://github.com/okonet/lint-staged/releases/tag/1.0.2) - 30 Jun 2016

- Fixed path resolution to the app root on Windows. [#19](https://github.com/okonet/lint-staged/issues/19) by <OJ Kwon>

## [v1.0.1](https://github.com/okonet/lint-staged/releases/tag/1.0.1) - 07 Jun 2016

- Fixed support of local npm scripts from package.json

## [v1.0.0](https://github.com/okonet/lint-staged/releases/tag/1.0.0) - 07 Jun 2016

- Complete re-write using Node.js API to fix [#5](https://github.com/okonet/lint-staged/issues/5), [#6](https://github.com/okonet/lint-staged/issues/6), [#7](https://github.com/okonet/lint-staged/issues/7), [#8](https://github.com/okonet/lint-staged/issues/8)
- Switched to staged-git-files that supports git filter. Exclude deleted files. Closes [#12](https://github.com/okonet/lint-staged/issues/12)

## [v0.2.2](https://github.com/okonet/lint-staged/releases/tag/v0.2.2) - 02 May 2016

- Switch to bin/bash and fix file existncy check [#9](https://github.com/okonet/lint-staged/issues/9) [@fubhy](https://github.com/fubhy)
- Switch to `$(npm bin)` instead of hardcoding path [#9](https://github.com/okonet/lint-staged/issues/9) [@fubhy](https://github.com/fubhy)
- Updated flow installation instructions [@okonet](https://github.com/okonet)

## [v0.2.1](https://github.com/okonet/lint-staged/releases/tag/v0.2.1) - 02 May 2016

- Fixed path for flow binary [#4](https://github.com/okonet/lint-staged/issues/4) [@nikgraf](https://github.com/nikgraf)

## [v0.2.0](https://github.com/okonet/lint-staged/releases/tag/v0.2.0) - 02 May 2016

- Added more linters: flow, JSCS [@okonet](https://github.com/okonet)
- Better console output when no binary is found [@okonet](https://github.com/okonet)
- Better README [@okonet](https://github.com/okonet)

## [v0.1.1](https://github.com/okonet/lint-staged/releases/tag/v0.1.1) - 02 May 2016

- Initial release
