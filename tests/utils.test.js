const utils = require('../utils')

describe('comment', () => {
    it('should return false if commit does NOT include a comment', async () => {
        const message = 'added initial logic'
        const result = utils.matches(message)
        expect(result).toBe(false)
    })

    it('should return false if commit does NOT include a comment', async () => {
        const message =
            'added initial logic\n\nresolve discussion 937716034 you might want to take a break'
        const { act, topic, discussion } = utils.matches(message)
        expect(act).toBe('resolve')
        expect(topic).toBe('discussion')
        expect(discussion).toBe('937716034')
    })
})
