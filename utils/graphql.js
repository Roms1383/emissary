const { graphql } = require('@octokit/graphql')
const octokit = graphql.defaults({
    headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
})
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')

const ASSOCIATED_PR = {
    query: `
  query associatedPRs($repo: String!, $owner: String!, $ref: String!){
    repository(name: $repo, owner: $owner) {
      ref(qualifiedName: $ref) {
        associatedPullRequests(first:5){
          edges{
            node{
              title
              number
              body
            }
          }
        }
      }
    }
  }
`,
    variables: { owner, repo },
}

const pr = async (sha, ref) =>
    await octokit(ASSOCIATED_PR.query, { ...ASSOCIATED_PR.variables, sha, ref })

module.exports = { pr }
