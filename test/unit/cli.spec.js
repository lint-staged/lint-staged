import path from 'node:path'

import { describe, it, suite } from 'vitest'

import { getVersionNumber, parseCliOptions, printHelpText } from '../../lib/cli.js'

suite('cli', () => {
  describe('parseCliOptions', () => {
    it('should return default options', ({ expect }) => {
      const options = parseCliOptions()

      expect(options).toStrictEqual({
        allowEmpty: false,
        concurrent: true,
        configPath: undefined,
        continueOnError: false,
        cwd: undefined,
        debug: false,
        diff: undefined,
        diffFilter: undefined,
        failOnChanges: false,
        help: false,
        hidePartiallyStaged: true,
        hideUnstaged: false,
        hideAll: false,
        maxArgLength: NaN,
        quiet: false,
        relative: false,
        revert: true,
        stash: true,
        verbose: false,
        version: false,
      })
    })

    it('implies disabling stash option, when using diff option', ({ expect }) => {
      const options = parseCliOptions(['--diff=main...HEAD'])
      expect(options.diff).toBe('main...HEAD')
      expect(options.stash).toBe(false)
    })

    it('implies disabling revert option, when using fail-on-changes option', ({ expect }) => {
      const options = parseCliOptions(['--fail-on-changes'])
      expect(options.failOnChanges).toBe(true)
      expect(options.revert).toBe(false)
    })

    it('implies disabling revert option, when stash option disabled', ({ expect }) => {
      const options = parseCliOptions(['--no-stash'])
      expect(options.stash).toBe(false)
      expect(options.revert).toBe(false)
    })

    it('implies disabling hide-partially-changed option, when using hide-unstaged option', ({
      expect,
    }) => {
      const options = parseCliOptions(['--hide-unstaged'])
      expect(options.hideUnstaged).toBe(true)
      expect(options.hidePartiallyStaged).toBe(false)
    })

    it('implies disabling hide-partially-changed and hide-unstaged options, when using hide-all option', ({
      expect,
    }) => {
      const options = parseCliOptions(['--hide-all'])
      expect(options.hideAll).toBe(true)
      expect(options.hidePartiallyStaged).toBe(false)
      expect(options.hideUnstaged).toBe(false)
    })

    it('should parse concurrent=false option', ({ expect }) => {
      const options = parseCliOptions(['--concurrent=false'])
      expect(options.concurrent).toBe(false)
    })

    it('should parse concurrent=10 option', ({ expect }) => {
      const options = parseCliOptions(['--concurrent=10'])
      expect(options.concurrent).toBe(10)
    })

    it('should parse max-arg-length option', ({ expect }) => {
      const options = parseCliOptions(['--max-arg-length=100'])
      expect(options.maxArgLength).toBe(100)
    })
  })

  describe('getVersionNumber', () => {
    it('should return version number from package.json', async ({ expect }) => {
      const { default: packageJson } = await import(
        path.join(import.meta.dirname, '../../package.json'),
        { with: { as: 'json' } }
      )

      const version = await getVersionNumber()
      expect(version).toBe(packageJson.version)
    })
  })

  describe('printHelpText', () => {
    it('should print help text at width 120', async ({ expect }) => {
      const helpText = await printHelpText(180)

      expect(helpText).toMatchInlineSnapshot(`
        "Usage: lint-staged [options]

        -h, --help                         display this help message
        -V, --version                      display the current version number
        --allow-empty                      allow empty commits when tasks revert all staged changes (default: false)
        -p, --concurrent <number|boolean>  the number of tasks to run concurrently, or false for serial (default: true)
        -c, --config [path]                path to configuration file, or - to read from stdin
        --continue-on-error                run all tasks to completion even if one fails (default: false)
        --cwd [path]                       run all tasks in specific directory, instead of the current
        -d, --debug                        print additional debug information (default: false)
        --diff [string]                    override the default "--staged" flag of "git diff" to get list of files. Implies "--no-stash".
        --diff-filter [string]             override the default "--diff-filter=ACMR" flag of "git diff" to get list of files
        --fail-on-changes                  fail with exit code 1 when tasks modify tracked files (default: false)
        --no-hide-partially-staged         hide unstaged changes from partially staged files (default: true)
        --hide-unstaged                    hide all unstaged changes, instead of just partially staged (default: false)
        --hide-all                         hide all unstaged changes and untracked files (default: false)
        --max-arg-length [number]          maximum length of the command-line argument string (default: 0)
        -q, --quiet                        disable lint-staged's own console output (default: false)
        -r, --relative                     pass relative filepaths to tasks (default: false)
        --no-revert                        revert to original state in case of errors (default: true)
        --no-stash                         enable the backup stash (default: true)
        -v, --verbose                      show task output even when tasks succeed; by default only failed output is shown (default: false)

        Any lost modifications can be restored from a git stash:

          > git stash list --format="%h %s"
          <git-hash> On main: lint-staged automatic backup
          > git apply --index <git-hash>
        "
      `)
    })

    it('should print help text at undefined width', async ({ expect }) => {
      const helpText = await printHelpText(undefined)

      expect(helpText).toMatchInlineSnapshot(`
        "Usage: lint-staged [options]

        -h, --help                         display this help message
        -V, --version                      display the current version number
        --allow-empty                      allow empty commits when tasks revert all
                                           staged changes (default: false)
        -p, --concurrent <number|boolean>  the number of tasks to run concurrently, or
                                           false for serial (default: true)
        -c, --config [path]                path to configuration file, or - to read from
                                           stdin
        --continue-on-error                run all tasks to completion even if one fails
                                           (default: false)
        --cwd [path]                       run all tasks in specific directory, instead
                                           of the current
        -d, --debug                        print additional debug information (default:
                                           false)
        --diff [string]                    override the default "--staged" flag of "git
                                           diff" to get list of files. Implies
                                           "--no-stash".
        --diff-filter [string]             override the default "--diff-filter=ACMR"
                                           flag of "git diff" to get list of files
        --fail-on-changes                  fail with exit code 1 when tasks modify
                                           tracked files (default: false)
        --no-hide-partially-staged         hide unstaged changes from partially staged
                                           files (default: true)
        --hide-unstaged                    hide all unstaged changes, instead of just
                                           partially staged (default: false)
        --hide-all                         hide all unstaged changes and untracked files
                                           (default: false)
        --max-arg-length [number]          maximum length of the command-line argument
                                           string (default: 0)
        -q, --quiet                        disable lint-staged's own console output
                                           (default: false)
        -r, --relative                     pass relative filepaths to tasks (default:
                                           false)
        --no-revert                        revert to original state in case of errors
                                           (default: true)
        --no-stash                         enable the backup stash (default: true)
        -v, --verbose                      show task output even when tasks succeed; by
                                           default only failed output is shown (default:
                                           false)

        Any lost modifications can be restored from a git stash:

          > git stash list --format="%h %s"
          <git-hash> On main: lint-staged automatic backup
          > git apply --index <git-hash>
        "
      `)
    })
  })
})
