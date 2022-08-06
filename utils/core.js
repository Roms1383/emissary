const { Octokit } = require('@octokit/request')
const octokit = new Octokit({
    auth: `token ${process.env.GITHUB_TOKEN}`,
})
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')

const pr = async (commit_sha) =>
    await octokit.request(
        'GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls',
        {
            owner,
            repo,
            commit_sha,
        }
    )

module.exports = { pr }
