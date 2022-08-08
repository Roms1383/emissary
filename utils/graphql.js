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
query pullRequestThread($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      id,
      reviewThreads(last: 50) {
        pageInfo { startCursor, hasPreviousPage },
        totalCount,
        nodes {
          id,
          isResolved,
          viewerCanReply,
          viewerCanResolve,
          path,
          comments(last: 50) {
            pageInfo { startCursor, hasPreviousPage },
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
                reviewThreads: {
                    pageInfo: {
                        startCursor: cursor,
                        hasPreviousPage: previous,
                    },
                    totalCount: total,
                    nodes: threads,
                },
                id,
            },
        },
    } = response
    return {
        cursor,
        previous,
        total,
        threads: threads.map(map_thread),
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
            pageInfo: { startCursor: cursor, hasPreviousPage: previous },
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
        previous,
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
