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
    node_id,
    reviewDecision,
    reviews(last: 3) {
      pageInfo { endCursor, hasNextPage },
      totalCount,
      nodes { id, body }
    }
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
          nodes { author { login }, bodyText, state, path, id, url }
        }
      },
    }
  }
}
}
`,
    variables: { repo },
}

const NOTIFY_THREAD = {
    query: `
mutation MarkThreadAsDone($owner: String!, $repo: String!, $pr: ID!, $review: ID!, $body: String!) {
  addPullRequestReviewComment(input:{ owner: $owner, repo: $repo, pullRequestReviewId: $review, pullRequestId: $pr, body: $body }) {
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
    }).then(map_pr)

const notify = async (owner, pr, review, body) =>
    await octokit(NOTIFY_THREAD.query, {
        ...NOTIFY_THREAD.variables,
        owner,
        pr,
        review,
        body,
    })

const map_pr = (response) => {
    const {
        repository: {
            pullRequest: {
                reviews: {
                    // pageInfo: { endCursor: cursor, hasNextPage: next },
                    // totalCount: total,
                    nodes: reviews,
                },
                reviewThreads: {
                    pageInfo: { endCursor: cursor, hasNextPage: next },
                    totalCount: total,
                    nodes: threads,
                },
                reviewDecision: decision,
                node_id,
            },
        },
    } = response
    return {
        cursor,
        next,
        total,
        threads: threads.map(map_thread),
        decision,
        reviews,
        node_id,
    }
}

const map_thread = (thread) => {
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
        comments: comments.map(map_comment),
    }
}

const map_comment = (comment) => {
    const interlocutor = comment.author?.login
    const { bodyText: message, state, path, url } = comment
    return {
        message,
        state,
        path,
        interlocutor,
        url,
    }
}

module.exports = { pr, notify }
