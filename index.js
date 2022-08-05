const Octokit = require('@octokit/rest')
const octokit = new Octokit({
    auth: `token ${process.env.GITHUB_TOKEN}`,
})
const utils = require('./utils')

const event = process.env.GITHUB_REPOSITORY
const owner = utils.owner(event)
const repo = utils.repo(event)

const analyze = async () => {
    const { commits, ref } = await utils
        .read(`./${process.env.GITHUB_EVENT_PATH}`)
        .then(JSON.parse)
    const num = utils.issue(ref)
    if (num) {
        for (commit of commits) {
            console.info(commit)
            const found = utils.comment(commit.message)
            if (found) {
                const comment = `${found} *from @${
                    commit.author.username
                } in [${commit.id.substring(0, 6)}](${commit.url})*`
            }
        }
    }
}

analyze()

module.exports = analyze
