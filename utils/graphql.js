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
        id,
        isResolved,
        viewerCanReply,
        viewerCanResolve,
        path,
        comments(last: 10) {
          pageInfo { endCursor, hasNextPage },
          totalCount,
          nodes { author { login }, bodyText, state, path, id }
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

const NOTIFY_THREAD = {
    query: `
mutation MarkThreadAsDone($owner: String!, $repo: String!, $pr: Int!, $review: String!, $thread: String!) {
  addPullRequestReviewComment(input:{owner: $owner, repo: $repo}) {
    comment
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
    }).then((response) => {
        const {
            repository: {
                pullRequest: {
                    reviewThreads: {
                        pageInfo: { endCursor: cursor, hasNextPage: next },
                        totalCount: total,
                        nodes: threads,
                    },
                    reviewDecision: decision,
                },
            },
        } = response
        threads.map((thread) => {
            const {
                id,
                isResolved: resolved,
                viewerCanReply: canReply,
                viewerCanResolve: canResolve,
                path,
                comments: {
                    pageInfo: { endCursor: cursor, hasNextPage: next },
                    totalCount: total,
                    nodes: comments,
                },
            } = thread
            return {
                id,
                resolved,
                canReply,
                canResolve,
                path,
                cursor,
                next,
                total,
                comments,
            }
        })
        return { cursor, next, total, threads, decision }
    })

const notify = async () =>
    await octokit(NOTIFY_THREAD.query, {
        ...NOTIFY_THREAD.variables,
        owner,
        pr,
        review,
        thread,
    })

module.exports = { pr, notify }
