const utils = require('../utils')
let octokit = require('@octokit/rest')

octokit = jest.fn()
octokit.authenticate = jest.fn()

describe('owner', () => {
    it('should return owner when passed GITHUB_REPOSITORY env variable', () => {
        const result = utils.owner('Roms1383/emissary')
        expect(result).toBe('Roms1383')
    })
})

describe('repo', () => {
    it('should return repo when passed GITHUB_REPOSITORY env variable', () => {
        const result = utils.repo('Roms1383/emissary')
        expect(result).toBe('emissary')
    })
})

describe('issue', () => {
    it('should return false if branch does NOT start with issue number', async () => {
        const ref = 'refs/heads/mybranch'
        const result = utils.issue(ref)
        expect(result).toBe(false)
    })

    it('should return issue number if branch does start with issue number', async () => {
        const ref = 'refs/heads/22-mybranch'
        const result = utils.issue(ref)
        expect(result).toBe('22')
    })
})

describe('comment', () => {
    it('should return false if commit does NOT include a comment', async () => {
        const message = 'added initial ui'
        const result = utils.comment(message)
        expect(result).toBe(false)
    })

    it('should return false if commit does NOT include a comment', async () => {
        const message =
            'added initial ui #comment fyi @Roms1383 you might want to take a break'
        const result = utils.comment(message)
        expect(result).toBe('fyi @Roms1383 you might want to take a break')
    })
})
