import readConfigOption from '../src/readConfigOption'

describe('readConfigOption', () => {

    it('should return default value if config is undefined', () => {
        const configOption = readConfigOption(undefined, 'my_key', 'default_value')
        expect(configOption).toEqual('default_value')
    })

    it('should return default value if config option is undefined', () => {
        const configOption = readConfigOption({}, 'my_key', 'default_value')
        expect(configOption).toEqual('default_value')
    })

    it('should return config option if not undefined', () => {
        const configOption = readConfigOption({ my_key: 'my_value' }, 'my_key', 'default_value')
        expect(configOption).toEqual('my_value')
    })

})
