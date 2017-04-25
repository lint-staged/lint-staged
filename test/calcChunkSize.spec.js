import calcChunkSize from '../src/calcChunkSize'

// This is only ever used for length so the contents do not matter much
const testFilePath =
    'This-is-only-ever-used-for-length-so-the-contents-do-not-matter-much.length-is-100-for-simplicity.js'

describe('calcChunkSize', () => {
    it('should not return high chunk size for less files', () => {
        let chunkSize = calcChunkSize([testFilePath], 50)
        expect(chunkSize).toEqual(1)

        chunkSize = calcChunkSize([testFilePath, testFilePath], 50)
        expect(chunkSize).toEqual(2)
    })

    it('should not return chunk size which will fail max command length', () => {
        const fakeFilePaths = Array(200).fill(testFilePath)
        const chunkSize = calcChunkSize(fakeFilePaths, Number.MAX_SAFE_INTEGER)
        expect(chunkSize).toEqual(80)
    })

    it('should respect option chunkSize where ever possible', () => {
        const fakeFilePaths = Array(200).fill(testFilePath)
        const chunkSize = calcChunkSize(fakeFilePaths, 50)
        expect(chunkSize).toEqual(50)
    })
})
