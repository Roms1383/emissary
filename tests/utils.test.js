const utils = require('../utils')

describe('comment', () => {
    it('should return false if commit does NOT include a comment', async () => {
        const message = 'added initial logic'
        const result = utils.matches(message)
        expect(result).toBe(false)
    })

    it('should return false if commit does NOT include a comment', async () => {
        const message =
            'added initial logic #resolve discussion_r937716034 you might want to take a break'
        const result = utils.matches(message)
        expect(result).toBe('937716034')
    })
})
