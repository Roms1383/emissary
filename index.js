const utils = require('./utils')

const event = process.env.GITHUB_REPOSITORY
const owner = utils.owner(event)
const repo = utils.repo(event)

const analyze = async () => {
    const { commits, ref } = await utils
        .read(`./${process.env.GITHUB_EVENT_PATH}`)
        .then(JSON.parse)
    const num = utils.issue(ref)
    // if (num) {
    for (commit of commits) {
        console.info(JSON.stringify(commit, null, 2))
        const found = utils.comment(commit.message)
        if (found) {
            const comment = `${found} *from @${
                commit.author.username
            } in [${commit.id.substring(0, 6)}](${commit.url})*`
            console.warn('todo')
        }
    }
    // }
}

analyze()

module.exports = analyze
