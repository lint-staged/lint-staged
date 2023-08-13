/**
 * Reimplementation of "normalize-path"
 * @see https://github.com/jonschlinkert/normalize-path/blob/52c3a95ebebc2d98c1ad7606cbafa7e658656899/test.js
 */

/*!
 * normalize-path <https://github.com/jonschlinkert/normalize-path>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Licensed under the MIT License
 */

import { normalizePath } from '../../lib/normalizePath'

describe('normalizePath', () => {
  describe('single slash', () => {
    it('should always return a single forward slash', () => {
      expect(normalizePath('/')).toEqual('/')
      expect(normalizePath('\\')).toEqual('/')
    })
  })

  describe('strip trailing slashes', () => {
    it.each([
      ['../../foo/bar', '../../foo/bar'],
      ['..\\..\\foo/bar', '../../foo/bar'],
      ['..\\\\..\\\\foo/bar', '../../foo/bar'],
      ['//foo/bar\\baz', '/foo/bar/baz'],
      ['//foo\\bar\\baz', '/foo/bar/baz'],
      ['/user/docs/Letter.txt', '/user/docs/Letter.txt'],
      ['\\?\\C:\\user\\docs\\Letter.txt', '/?/C:/user/docs/Letter.txt'],
      ['\\?\\UNC\\Server01\\user\\docs\\Letter.txt', '/?/UNC/Server01/user/docs/Letter.txt'],
      ['\\\\.\\CdRomX', '//./CdRomX'],
      ['\\\\.\\PhysicalDiskX', '//./PhysicalDiskX'],
      ['\\\\?\\C:\\user\\docs\\Letter.txt', '//?/C:/user/docs/Letter.txt'],
      ['\\\\?\\UNC\\Server01\\user\\docs\\Letter.txt', '//?/UNC/Server01/user/docs/Letter.txt'],
      ['\\Server01\\user\\docs\\Letter.txt', '/Server01/user/docs/Letter.txt'],
      ['C:\\user\\docs\\Letter.txt', 'C:/user/docs/Letter.txt'],
      [
        'C:\\user\\docs\\somefile.ext:alternate_stream_name',
        'C:/user/docs/somefile.ext:alternate_stream_name',
      ],
      ['C:Letter.txt', 'C:Letter.txt'],
      ['E://foo//bar//baz', 'E:/foo/bar/baz'],
      ['E://foo//bar//baz//', 'E:/foo/bar/baz'],
      ['E://foo//bar//baz//////', 'E:/foo/bar/baz'],
      ['E://foo/bar\\baz', 'E:/foo/bar/baz'],
      ['E://foo\\bar\\baz', 'E:/foo/bar/baz'],
      ['E:/foo/bar/baz/', 'E:/foo/bar/baz'],
      ['E:/foo/bar/baz///', 'E:/foo/bar/baz'],
      ['E:\\\\foo/bar\\baz', 'E:/foo/bar/baz'],
      ['foo\\bar\\baz', 'foo/bar/baz'],
      ['foo\\bar\\baz\\', 'foo/bar/baz'],
      ['foo\\bar\\baz\\\\\\', 'foo/bar/baz'],
    ])('should normalize %s', (input, output) => {
      expect(normalizePath(input)).toEqual(output)
    })
  })
})
