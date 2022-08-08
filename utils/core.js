const { debug } = require('@actions/core')
const { Octokit } = require('@octokit/core')
const octokit = new Octokit({
    auth: `${process.env.GITHUB_TOKEN || process.env.INPUT_TOKEN}`,
})
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')

const pr = async (commit_sha) =>
    await octokit
        .request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
            owner,
            repo,
            commit_sha,
        })
        .then((v) => {
            debug(`utils.core.pr:\n${JSON.stringify(v, null, 2)}\n\n`)
            return v
        })
const reply = async (owner, repo, pull_number, comment_id, body) =>
    octokit
        .request(
            'POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies',
            {
                owner,
                repo,
                pull_number,
                comment_id,
                body,
            }
        )
        .then((v) => {
            debug(`utils.core.reply:\n${JSON.stringify(v, null, 2)}\n\n`)
            return v
        })

module.exports = { pr, reply }
