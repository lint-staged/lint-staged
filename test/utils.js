import expect, { assert } from 'expect'
import isPromise from 'is-promise'

export function toBeAPromise() {
    assert(
        isPromise(this.actual),
        'expected %s to be a Promise',
        this.actual
    )
    return this
}

export function toEventuallyEqual(value) {
    if (!isPromise(this.actual)) {
        assert(false, '%s is not a Promise', this.actual)
    }
    return this.actual
        .then(res => expect(res.stdout).toEqual(value))
        .catch(err => assert(false, 'Error in Promise %s', err))

}

export default {
    toBeAPromise,
    toEventuallyEqual
}
