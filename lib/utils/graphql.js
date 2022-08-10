const { debug } = require('@actions/core')
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
          comments(first: 50) {
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

const pr = async (owner, pr) => {
  const parameters = {
    ...LIST_THREADS.variables,
    pr,
    owner,
  }
  return octokit(LIST_THREADS.query, parameters)
    .then(map_pr)
    .then((v) => {
      debug(`utils.graphql.pr:\n${JSON.stringify(v, null, 2)}\n\n`)
      return v
    })
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

const resolve = async (thread) =>
  octokit(RESOLVE_THREAD.query, { ...RESOLVE_THREAD.variables, thread }).then(
    (v) => {
      debug(`utils.graphql.resolve:\n${JSON.stringify(v, null, 2)}\n\n`)
      return v
    }
  )

const map_pr = (pr) => {
  const {
    repository: {
      pullRequest: {
        reviewThreads: {
          pageInfo: { startCursor: cursor, hasPreviousPage: previous },
          totalCount: total,
          nodes: threads,
        },
        id,
      },
    },
  } = pr
  return {
    cursor,
    previous,
    total,
    threads: (threads || []).map(map_thread),
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
    comments: (comments || []).map(map_comment),
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
