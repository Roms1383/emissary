const { graphql } = require('@octokit/graphql')
const octokit = graphql.defaults({
    headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
})
const [_, repo] = process.env.GITHUB_REPOSITORY.split('/')

const PULL_REQUEST_THREAD = {
    query: `
query pullRequestThread($owner: String!, $repo: String!, $pr: Int!) {
repository(owner: $owner, name: $repo) {
  pullRequest(number: $pr) {
    reviewThreads(last: 10) {
      pageInfo { endCursor, hasNextPage },
      totalCount,
      nodes {
        isResolved,
        viewerCanReply,
        viewerCanResolve,
        path,
        comments(last: 10) {
          pageInfo { endCursor, hasNextPage },
          totalCount,
          nodes { author { login }, bodyText, state, path }
        }
      },
    },
    reviewDecision
  }
}
}
`,
    variables: { repo },
}

const pr = async (owner, pr) =>
    await octokit(PULL_REQUEST_THREAD.query, {
        ...PULL_REQUEST_THREAD.variables,
        pr,
        owner,
    })

module.exports = { pr }
