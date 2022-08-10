const utils = require('../lib/utils')

describe('comment', () => {
  describe('should return false if commit does NOT include a comment', () => {
    it('without keyword', async () => {
      const message = 'added initial logic'
      const result = utils.matches(message)
      expect(result).toBe(false)
    })
    it('with keyword but no discussion', async () => {
      const message =
        'added initial logic\n\nresolve discussion\n\nbut forgot to specify'
      const result = utils.matches(message)
      expect(result).toBe(false)
    })
    it('with keyword but malformed discussion', async () => {
      const message =
        'added initial logic\n\nresolve discussion 049f011f9363ddd17160c47d57380fbfe4ab8d84\n\nbut specified a commit instead'
      const result = utils.matches(message)
      expect(result).toBe(false)
    })
  })

  describe('should return act, discussion and extra if commit does include a comment', () => {
    it("with leading 'discussion'", async () => {
      let message =
        'added initial logic\n\nresolve discussion 937716034\n\nand some other reminder details'
      const { act, discussion, extra } = utils.matches(message)
      expect(act).toBe('resolve')
      expect(discussion).toStrictEqual(['937716034'])
      expect(extra).toBe('')
    })
    it("without leading 'discussion'", async () => {
      let message =
        'added initial logic\n\nresolve 937716034\n\nand some other reminder details'
      const { act, discussion, extra } = utils.matches(message)
      expect(act).toBe('resolve')
      expect(discussion).toStrictEqual(['937716034'])
      expect(extra).toBe('')
    })

    it('without extra', async () => {
      let message =
        'added initial logic\n\nresolve 937716034\n\nand some other reminder details'
      const { act, discussion, extra } = utils.matches(message)
      expect(act).toBe('resolve')
      expect(discussion).toStrictEqual(['937716034'])
      expect(extra).toBe('')
    })

    it('with extra', async () => {
      let message =
        'added initial logic\n\nresolve 937716034 also thanks for your review\n\nand some other reminder details'
      const { act, discussion, extra } = utils.matches(message)
      expect(act).toBe('resolve')
      expect(discussion).toStrictEqual(['937716034'])
      expect(extra).toBe('also thanks for your review')
    })

    it('with multiple discussions', async () => {
      let message =
        'added initial logic\n\nresolve 937716034 940389955\n\nand some other reminder details'
      const { act, discussion, extra } = utils.matches(message)
      expect(act).toBe('resolve')
      expect(discussion).toStrictEqual(['937716034', '940389955'])
      expect(extra).toBe('')
    })

    it('with urls', async () => {
      let message =
        'added initial logic\n\nresolve https://github.com/Roms1383/emissary/pull/10#discussion_r937716034 https://github.com/Roms1383/emissary/pull/10#discussion_r940389955\n\nand some other reminder details'
      const { act, discussion, extra } = utils.matches(message)
      expect(act).toBe('resolve')
      expect(discussion).toStrictEqual(['937716034', '940389955'])
      expect(extra).toBe('')
    })

    it('with keyword in unrelated line', async () => {
      let message =
        ':bug: fix parameter order\n\nlet\'s try to reply to "three" comment\n\nreply discussion https://github.com/Roms1383/emissary/pull/15#discussion_r942010360'
      const { act, discussion, extra } = utils.matches(message)
      expect(act).toBe('reply')
      expect(discussion).toStrictEqual(['942010360'])
      expect(extra).toBe('')
    })
  })
})
