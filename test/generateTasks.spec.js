import os from 'os'
import path from 'path'
import generateTasks from '../src/generateTasks'

const files = [
  'test.js',
  'deeper/test.js',
  'deeper/test2.js',
  'even/deeper/test.js',
  '.hidden/test.js',

  'test.css',
  'deeper/test.css',
  'deeper/test2.css',
  'even/deeper/test.css',
  '.hidden/test.css',

  'test.txt',
  'deeper/test.txt',
  'deeper/test2.txt',
  'even/deeper/test.txt',
  '.hidden/test.txt'
]

const workDir = path.join(os.tmpdir(), 'tmp-lint-staged')

describe('generateTasks', () => {
  it('should work with simple configuration', () => {
    const result = generateTasks(
      {
        '*.js': 'lint'
      },
      ['test.js']
    )
    const [{ commands }] = result
    expect(commands).toEqual(['lint'])
  })

  it('should work with advanced configuration', () => {
    const result = generateTasks(
      {
        gitDir: '../',
        linters: {
          '*.js': 'lint'
        }
      },
      ['test.js']
    )
    const [{ commands }] = result
    expect(commands).toEqual(['lint'])
  })

  it('should return absolute paths', () => {
    const result = generateTasks(
      {
        gitDir: '..',
        linters: {
          '*': 'lint'
        }
      },
      files
    )
    const [{ fileList }] = result
    fileList.forEach(file => {
      expect(path.isAbsolute(file)).toBe(true)
    })
  })

  describe('shorthand linters syntax', () => {
    const config = {
      gitDir: workDir,
      linters: {
        '*.js': 'root-js',
        '**/*.js': 'any-js',
        'deeper/*.js': 'deeper-js',
        '.hidden/*.js': 'hidden-js',
        'unknown/*.js': 'unknown-js',
        '*.{css,js}': 'root-css-or-js'
      }
    }

    it('should return an empty file list for linters with no matches.', () => {
      const result = generateTasks(config, files)
      result.forEach(({ commands: [command], fileList }) => {
        if (command === 'unknown-js') {
          expect(fileList.length).toEqual(0)
        } else {
          expect(fileList.length).not.toEqual(0)
        }
      })
    })

    it('should match pattern "*.js" for relative path', () => {
      const relPath = path.resolve(path.join(process.cwd(), '..'))
      const result = generateTasks(Object.assign({}, config, { gitDir: '..' }), files)
      const linter = result.find(item => item.title === '*.js')
      expect(linter).toEqual({
        title: '*.js',
        commands: ['root-js'],
        fileList: [
          `${relPath}/test.js`,
          `${relPath}/deeper/test.js`,
          `${relPath}/deeper/test2.js`,
          `${relPath}/even/deeper/test.js`,
          `${relPath}/.hidden/test.js`
        ].map(path.normalize)
      })
    })

    it('should match pattern "*.js"', () => {
      const result = generateTasks(config, files)
      const linter = result.find(item => item.title === '*.js')
      expect(linter).toEqual({
        title: '*.js',
        commands: ['root-js'],
        fileList: [
          `${workDir}/test.js`,
          `${workDir}/deeper/test.js`,
          `${workDir}/deeper/test2.js`,
          `${workDir}/even/deeper/test.js`,
          `${workDir}/.hidden/test.js`
        ].map(path.normalize)
      })
    })

    it('should match pattern "**/*.js"', () => {
      const result = generateTasks(config, files)
      const linter = result.find(item => item.title === '**/*.js')
      expect(linter).toEqual({
        title: '**/*.js',
        commands: ['any-js'],
        fileList: [
          `${workDir}/test.js`,
          `${workDir}/deeper/test.js`,
          `${workDir}/deeper/test2.js`,
          `${workDir}/even/deeper/test.js`,
          `${workDir}/.hidden/test.js`
        ].map(path.normalize)
      })
    })

    it('should match pattern "deeper/*.js"', () => {
      const result = generateTasks(config, files)
      const linter = result.find(item => item.title === 'deeper/*.js')
      expect(linter).toEqual({
        title: 'deeper/*.js',
        commands: ['deeper-js'],
        fileList: [`${workDir}/deeper/test.js`, `${workDir}/deeper/test2.js`].map(path.normalize)
      })
    })

    it('should match pattern ".hidden/*.js"', () => {
      const result = generateTasks(config, files)
      const linter = result.find(item => item.title === '.hidden/*.js')
      expect(linter).toEqual({
        title: '.hidden/*.js',
        commands: ['hidden-js'],
        fileList: [path.normalize(`${workDir}/.hidden/test.js`)]
      })
    })

    it('should match pattern "*.{css,js}"', () => {
      const result = generateTasks(config, files)
      const linter = result.find(item => item.title === '*.{css,js}')
      expect(linter).toEqual({
        title: '*.{css,js}',
        commands: ['root-css-or-js'],
        fileList: [
          `${workDir}/test.js`,
          `${workDir}/deeper/test.js`,
          `${workDir}/deeper/test2.js`,
          `${workDir}/even/deeper/test.js`,
          `${workDir}/.hidden/test.js`,
          `${workDir}/test.css`,
          `${workDir}/deeper/test.css`,
          `${workDir}/deeper/test2.css`,
          `${workDir}/even/deeper/test.css`,
          `${workDir}/.hidden/test.css`
        ].map(path.normalize)
      })
    })
  })

  describe('expanded linters syntax', () => {
    const filesPlus = files.concat([
      'test.ignore.js',
      'deeper/test.ignore.js',
      'even/deeper/test.ignore.js',
      '.hidden/test.ignore.js',

      'test.ignore.css',
      'deeper/test.ignore.css',
      'even/deeper/test.ignore.css',
      '.hidden/test.ignore.css'
    ])

    const config = {
      gitDir: workDir,
      linters: [
        { includes: ['*.js'], excludes: ['*.ignore.js'], commands: ['root-js'] },
        { includes: ['**/*.js'], excludes: ['**/*.ignore.js'], commands: ['any-js'] },
        { includes: ['deeper/*.js'], excludes: ['deeper/*.ignore.js'], commands: ['deeper-js'] },
        { includes: ['.hidden/*.js'], excludes: ['.hidden/*.ignore.js'], commands: ['hidden-js'] },
        { includes: ['*.{css,js}'], excludes: ['*.ignore.{css,js}'], commands: ['root-css-or-js'] }
      ]
    }

    it('should match pattern "*.js" and exclude "*.ignore.js" for relative path', () => {
      const relPath = path.resolve(path.join(process.cwd(), '..'))
      const result = generateTasks(Object.assign({}, config, { gitDir: '..' }), filesPlus)
      const linter = result.find(item => item.title === '*.js, !*.ignore.js')
      expect(linter).toEqual({
        title: '*.js, !*.ignore.js',
        commands: ['root-js'],
        fileList: [
          `${relPath}/test.js`,
          `${relPath}/deeper/test.js`,
          `${relPath}/deeper/test2.js`,
          `${relPath}/even/deeper/test.js`,
          `${relPath}/.hidden/test.js`
        ].map(path.normalize)
      })
    })

    it('should match pattern "*.js" and exclude "*.ignore.js"', () => {
      const result = generateTasks(config, filesPlus)
      const linter = result.find(item => item.title === '*.js, !*.ignore.js')
      expect(linter).toEqual({
        title: '*.js, !*.ignore.js',
        commands: ['root-js'],
        fileList: [
          `${workDir}/test.js`,
          `${workDir}/deeper/test.js`,
          `${workDir}/deeper/test2.js`,
          `${workDir}/even/deeper/test.js`,
          `${workDir}/.hidden/test.js`
        ].map(path.normalize)
      })
    })

    it('should match pattern "**/*.js" and exclude "**/*.ignore.js"', () => {
      const result = generateTasks(config, filesPlus)
      const linter = result.find(item => item.title === '**/*.js, !**/*.ignore.js')
      expect(linter).toEqual({
        title: '**/*.js, !**/*.ignore.js',
        commands: ['any-js'],
        fileList: [
          `${workDir}/test.js`,
          `${workDir}/deeper/test.js`,
          `${workDir}/deeper/test2.js`,
          `${workDir}/even/deeper/test.js`,
          `${workDir}/.hidden/test.js`
        ].map(path.normalize)
      })
    })

    it('should match pattern "deeper/*.js" and exclude "deeper/*.ignore.js"', () => {
      const result = generateTasks(config, filesPlus)
      const linter = result.find(item => item.title === 'deeper/*.js, !deeper/*.ignore.js')
      expect(linter).toEqual({
        title: 'deeper/*.js, !deeper/*.ignore.js',
        commands: ['deeper-js'],
        fileList: [`${workDir}/deeper/test.js`, `${workDir}/deeper/test2.js`].map(path.normalize)
      })
    })

    it('should match pattern ".hidden/*.js" and exclude ".hidden/*.ignore.js"', () => {
      const result = generateTasks(config, filesPlus)
      const linter = result.find(item => item.title === '.hidden/*.js, !.hidden/*.ignore.js')
      expect(linter).toEqual({
        title: '.hidden/*.js, !.hidden/*.ignore.js',
        commands: ['hidden-js'],
        fileList: [path.normalize(`${workDir}/.hidden/test.js`)]
      })
    })

    it('should match pattern "*.{css,js}" and exclude "*.ignore.{css,js}"', () => {
      const result = generateTasks(config, filesPlus)
      const linter = result.find(item => item.title === '*.{css,js}, !*.ignore.{css,js}')
      expect(linter).toEqual({
        title: '*.{css,js}, !*.ignore.{css,js}',
        commands: ['root-css-or-js'],
        fileList: [
          `${workDir}/test.js`,
          `${workDir}/deeper/test.js`,
          `${workDir}/deeper/test2.js`,
          `${workDir}/even/deeper/test.js`,
          `${workDir}/.hidden/test.js`,
          `${workDir}/test.css`,
          `${workDir}/deeper/test.css`,
          `${workDir}/deeper/test2.css`,
          `${workDir}/even/deeper/test.css`,
          `${workDir}/.hidden/test.css`
        ].map(path.normalize)
      })
    })
  })

  it('should support globOptions specified in advanced configuration', () => {
    const result = generateTasks(
      {
        gitDir: workDir,
        globOptions: {
          matchBase: false,
          nocase: true
        },
        linters: {
          'TeSt.*': 'lint'
        }
      },
      files
    )
    const linter = result.find(item => item.title === 'TeSt.*')
    expect(linter).toEqual({
      title: 'TeSt.*',
      commands: ['lint'],
      fileList: [`${workDir}/test.js`, `${workDir}/test.css`, `${workDir}/test.txt`].map(
        path.normalize
      )
    })
  })
})
