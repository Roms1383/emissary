const utils = require('../utils')
let octokit = require('@octokit/rest')

octokit = jest.fn()
octokit.authenticate = jest.fn()

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
