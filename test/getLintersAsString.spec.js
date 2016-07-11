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

    it('should return a single entry for an array with 1 element', () => {
        expect(getLintersAsString(['eslint'])).toEqual('eslint')
    })
})
