const Octokit = require('@octokit/rest')
const octokit = new Octokit({
    auth: `token ${process.env.GITHUB_TOKEN}`,
})
const utils = require('./utils')

const event = process.env.GITHUB_REPOSITORY
const owner = utils.owner(event)
const repo = utils.repo(event)

const analyze = async () => {
    const data = utils
        .read(`../${process.env.GITHUB_EVENT_PATH}`)
        .then(JSON.parse)
    const num = utils.issue(data.ref)
    if (num) {
        for (commit in data.commits) {
            const found = utils.comment(commit.message)
            if (found) {
                const comment = `${found} *from @${
                    commit.author.username
                } in [${commit.id.substring(0, 6)}](${commit.url})*`
                helpers.reply(octokit, owner, repo, num, comment)
            }
        }
    }
}

analyze()

module.exports = analyze
