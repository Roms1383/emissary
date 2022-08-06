const { Octokit } = require('@octokit/rest')
const octokit = new Octokit({
    auth: `token ${process.env.GITHUB_TOKEN}`,
})

const reply = async (owner, repo, issue_number, body) =>
    octokit.issues
        .createComment({
            owner,
            repo,
            issue_number,
            body,
        })
        .catch((err) => {
            console.log(err)
        })

module.exports = { reply }
