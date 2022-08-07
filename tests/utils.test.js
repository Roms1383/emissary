const utils = require('../utils')

describe('comment', () => {
    it('should return false if commit does NOT include a comment', async () => {
        const message = 'added initial logic'
        const result = utils.matches(message)
        expect(result).toBe(false)
    })

    it('should return act, topic and discussion if commit does include a comment', async () => {
        const message =
            'added initial logic\n\nresolve discussion 937716034 also thanks for your review\n\nand some other reminder details'
        const { act, topic, discussion, extra } = utils.matches(message)
        expect(act).toBe('resolve')
        expect(topic).toBe('discussion')
        expect(discussion).toBe('937716034')
        expect(extra).toBe('also thanks for your review')
    })
})
