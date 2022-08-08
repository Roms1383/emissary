const { graphql } = require('@octokit/graphql')
const octokit = graphql.defaults({
    headers: {
        authorization: `token ${
            process.env.GITHUB_TOKEN || process.env.INPUT_TOKEN
        }`,
    },
})
const [_, repo] = process.env.GITHUB_REPOSITORY.split('/')

const LIST_THREADS = {
    query: `
query pullRequestThread($owner: String!, $repo: String!, $pr: Int!, $reviewsBefore: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      id,
      reviewDecision,
      reviews(last: 3, before: $reviewsBefore) {
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

const RESOLVE_THREAD = {
    query: `
mutation resolveThread($thread: ID!) {
  resolveReviewThread(input: { threadId: $thread }) {
    thread { id }
  }
}
  `,
    variables: {},
}

const pr = async (owner, pr) =>
    octokit(LIST_THREADS.query, {
        ...LIST_THREADS.variables,
        pr,
        owner,
    }).then(map_pr)

const resolve = async (thread) =>
    octokit(RESOLVE_THREAD.query, { ...RESOLVE_THREAD.variables, thread })

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
                id,
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
        id,
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
    const { bodyText: message, state, path, url, id } = comment
    return {
        message,
        state,
        path,
        interlocutor,
        url,
        id,
    }
}

module.exports = { pr, resolve }
