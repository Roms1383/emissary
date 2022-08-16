import { debug } from '@actions/core'
import { graphql } from '@octokit/graphql'

const octokit = graphql.defaults({
  headers: {
    authorization: `token ${
      process.env.GITHUB_TOKEN || process.env.INPUT_TOKEN
    }`,
  },
})
const [_, repo] = process.env.GITHUB_REPOSITORY!.split('/')

const THREADS_PER_PAGE = 50
const COMMENTS_PER_PAGE = 50

const LIST_THREADS = {
  query: `
query pullRequestThread($owner: String!, $repo: String!, $pr: Int!, $start: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      id,
      reviewThreads(last: ${THREADS_PER_PAGE}, startCursor: $start) {
        pageInfo { startCursor, hasPreviousPage },
        totalCount,
        nodes {
          id,
          isResolved,
          viewerCanReply,
          viewerCanResolve,
          path,
          comments(first: 1) {
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

const threads = async (
  owner: string,
  pr: number,
  start?: string,
  accumulator?: EmissaryPullRequest,
  page: number = 1
): Promise<EmissaryPullRequest> => {
  const parameters = {
    ...LIST_THREADS.variables,
    pr,
    owner,
    start,
  }
  return octokit(LIST_THREADS.query, parameters)
    .then(map_pr)
    .then((v: EmissaryPullRequest) => {
      debug(
        `utils.graphql.threads (page ${page}):\n${JSON.stringify(
          v,
          null,
          2
        )}\n\n`
      )
      return v
    })
    .then((v) => {
      if (!accumulator) {
        accumulator = v
      } else {
        accumulator = {
          cursor: v.cursor,
          previous: v.previous,
          threads: [...accumulator.threads, ...v.threads],
          total: v.total,
          id: v.id,
        } as EmissaryPullRequest
      }
      if (v.previous) {
        return threads(owner, pr, v.cursor, accumulator, page++)
      }
      return v
    })
}

const LIST_COMMENTS = {
  query: `
query pullRequestThreadComment($owner: String!, $repo: String!, $pr: Int!, $previous: String, $end: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      id,
      reviewThreads(last: 1, startCursor: $previous) {
        pageInfo { startCursor, hasPreviousPage },
        totalCount,
        nodes {
          id,
          isResolved,
          viewerCanReply,
          viewerCanResolve,
          path,
          comments(first: ${COMMENTS_PER_PAGE}, endCursor: $end) {
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

const comments = async (
  owner: string,
  pr: number,
  previous?: string,
  end?: string,
  accumulator?: EmissaryPullRequest,
  page: number = 1
): Promise<EmissaryPullRequest> => {
  const parameters = {
    ...LIST_COMMENTS.variables,
    pr,
    owner,
    previous,
    end,
  }
  return octokit(LIST_COMMENTS.query, parameters)
    .then(map_pr)
    .then((v: EmissaryPullRequest) => {
      debug(
        `utils.graphql.comments (page ${page}):\n${JSON.stringify(
          v,
          null,
          2
        )}\n\n`
      )
      return v
    })
    .then((v) => {
      const thread = v.threads[0]
      if (!accumulator) {
        accumulator = v
      } else {
        accumulator = {
          cursor: v.cursor,
          previous: v.previous,
          threads: [{ ...accumulator.threads[0], ...thread }],
          total: v.total,
          id: v.id,
        } as EmissaryPullRequest
      }
      if (thread.next) {
        return comments(owner, pr, previous, thread.cursor, accumulator, page++)
      }
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

const resolve = async (thread: string) =>
  octokit(RESOLVE_THREAD.query, { ...RESOLVE_THREAD.variables, thread }).then(
    (v: any) => {
      debug(`utils.graphql.resolve:\n${JSON.stringify(v, null, 2)}\n\n`)
      return v
    }
  )

const map_pr = (response: unknown): EmissaryPullRequest => {
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
  } = response as PullRequestThreadResponse
  return {
    cursor,
    previous,
    total,
    threads: (threads || []).map(map_thread),
    id,
  }
}

const map_thread = (thread: PullRequestReviewThread): EmissaryReviewThread => {
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

const map_comment = (comment: PullRequestReviewComment): EmissaryComment => {
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

/**
 * Github GraphQL API
 * see {@link https://docs.github.com/en/graphql/reference/enums#pullrequestreviewcommentstate}
 */
enum PullRequestReviewCommentState {
  SUBMITTED = 'submitted',
  PENDING = 'pending',
}

/**
 * Github GraphQL API
 * see {@link https://docs.github.com/en/graphql/reference/interfaces#actor}
 */
interface Actor {
  readonly login: string
}

/**
 * Github GraphQL API
 * see {@link https://docs.github.com/en/graphql/reference/objects#pullrequestreviewcomment}
 */
interface PullRequestReviewComment {
  readonly author?: Actor
  readonly bodyText: string
  readonly state: PullRequestReviewCommentState
  readonly path: string
  readonly id: string
  readonly url: string
}

/**
 * Github GraphQL API
 * see {@link https://docs.github.com/en/graphql/reference/objects#pullrequestreviewcommentconnection}
 */
interface PullRequestReviewCommentConnection {
  readonly pageInfo: ForwardPagination
  readonly totalCount: number
  readonly nodes: PullRequestReviewComment[]
}

/**
 * Github GraphQL API
 * see {@link https://docs.github.com/en/graphql/reference/objects#pageinfo}
 */
interface BackwardPagination {
  readonly startCursor: string
  readonly hasPreviousPage: boolean
}

/**
 * Github GraphQL API
 * see {@link https://docs.github.com/en/graphql/reference/objects#pageinfo}
 */
interface ForwardPagination {
  readonly endCursor: string
  readonly hasNextPage: boolean
}

/**
 * Github GraphQL API
 * see {@link https://docs.github.com/en/graphql/reference/objects#pullrequestreviewthread}
 */
interface PullRequestReviewThread {
  readonly id: string
  readonly isResolved: boolean
  readonly viewerCanReply: boolean
  readonly viewerCanResolve: boolean
  readonly path: string
  readonly comments: PullRequestReviewCommentConnection
}

/**
 * Github GraphQL API
 * see {@link https://docs.github.com/en/graphql/reference/objects#pullrequestreviewthreadconnection}
 */
interface PullRequestReviewThreadConnection {
  readonly pageInfo: BackwardPagination
  readonly totalCount: number
  readonly nodes: PullRequestReviewThread[]
}

/**
 * Github GraphQL API
 * see {@link https://docs.github.com/en/graphql/reference/objects#pullrequest}
 */
interface PullRequest {
  readonly reviewThreads: PullRequestReviewThreadConnection
  readonly id: string
}

/**
 * Github GraphQL API
 * see {@link https://docs.github.com/en/graphql/reference/objects#repository}
 */
interface Repository {
  readonly pullRequest: PullRequest
}

/**
 * see {@link LIST_THREADS}
 */
interface PullRequestThreadResponse {
  readonly repository: Repository
}

interface EmissaryComment {
  readonly message: string
  readonly state: PullRequestReviewCommentState
  readonly path: string
  readonly interlocutor?: string
  readonly url: string
  readonly id: string
}

interface EmissaryReviewThread {
  readonly id: string
  readonly resolved: boolean
  readonly canReply: boolean
  readonly canResolve: boolean
  readonly path: string
  readonly cursor: string
  readonly next: boolean
  readonly total: number
  readonly comments: EmissaryComment[]
}

interface EmissaryPullRequest {
  readonly cursor: string
  readonly previous: boolean
  readonly total: number
  readonly threads: EmissaryReviewThread[]
  readonly id: string
}

export {
  threads,
  comments,
  resolve,
  EmissaryPullRequest,
  EmissaryReviewThread,
  EmissaryComment,
  PullRequestReviewCommentState,
}
