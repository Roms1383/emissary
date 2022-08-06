const { Octokit } = require('@octokit/core')
const octokit = new Octokit({ auth: `${process.env.GITHUB_TOKEN}` })
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
const reply = (owner, repo, pull_number, comment_id, body) => {
  await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies', {
    owner,
    repo,
    pull_number,
    comment_id,
    body
  })
}

module.exports = { pr,reply }
