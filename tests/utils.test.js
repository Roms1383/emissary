const utils = require('../utils')

describe('comment', () => {
    it('should return false if commit does NOT include a comment', async () => {
        const message = 'added initial logic'
        const result = utils.matches(message)
        expect(result).toBe(false)
    })

    it('should return act, discussion and extra if commit does include a comment', async () => {
        const message =
            'added initial logic\n\nresolve discussion 937716034 also thanks for your review\n\nand some other reminder details'
        const { act, discussion, extra } = utils.matches(message)
        expect(act).toBe('resolve')
        expect(discussion).toBe('937716034')
        expect(extra).toBe('also thanks for your review')
    })

    it('should handle different formatting', async () => {
        let messages = [
            'reply   discussion   937716034 also thanks for your review',
            'replies discussion-937716034 also thanks for your review',
            'replied discussion_r937716034 also thanks for your review',
        ]
        for (message of messages) {
            const { act, discussion, extra } = utils.matches(message)
            expect(act).toBe('reply')
            expect(discussion).toBe('937716034')
            expect(extra).toBe('also thanks for your review')
        }

        messages = [
            'resolve   discussion   937716034 also thanks for your review',
            'resolves discussion-937716034 also thanks for your review',
            'resolved discussion_r937716034 also thanks for your review',
        ]
        for (message of messages) {
            const { act, discussion, extra } = utils.matches(message)
            expect(act).toBe('resolve')
            expect(discussion).toBe('937716034')
            expect(extra).toBe('also thanks for your review')
        }
    })
})
