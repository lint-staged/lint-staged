/* eslint no-unused-expressions: 0 */

import expect from 'expect'
import getLintersAsString from '../src/getLintersAsString'

describe('getLintersAsString', () => {
    it('should return same string for a string', () => {
        expect(getLintersAsString('eslint')).toEqual('eslint')
    })

    it('should return a concatenated string for an array', () => {
        expect(getLintersAsString(['eslint', 'stylelint'])).toEqual('eslint → stylelint')
    })
})
