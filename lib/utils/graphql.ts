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

const pr = async (owner: string, pr: number): Promise<EmissaryPullRequest> => {
  const parameters = {
    ...LIST_THREADS.variables,
    pr,
    owner,
  }
  return octokit(LIST_THREADS.query, parameters)
    .then(map_pr)
    .then((v: EmissaryPullRequest) => {
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

const map_thread = (
  thread: PullRequestReviewThread
): EmissaryReviewThread => {
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

const map_comment = (
  comment: PullRequestReviewComment
): EmissaryComment => {
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

enum PullRequestReviewCommentState {
  SUBMITTED = 'submitted',
  PENDING = 'pending',
}

interface Actor {
  readonly login: string
}

interface PullRequestReviewComment {
  readonly author?: Actor
  readonly bodyText: string
  readonly state: PullRequestReviewCommentState
  readonly path: string
  readonly id: string
  readonly url: string
}

interface PullRequestReviewCommentConnection {
  readonly pageInfo: ForwardPagination
  readonly totalCount: number
  readonly nodes: PullRequestReviewComment[]
}

interface BackwardPagination {
  readonly startCursor: string
  readonly hasPreviousPage: boolean
}

interface ForwardPagination {
  readonly endCursor: string
  readonly hasNextPage: boolean
}

interface PullRequestReviewThread {
  readonly id: string
  readonly isResolved: boolean
  readonly viewerCanReply: boolean
  readonly viewerCanResolve: boolean
  readonly path: string
  readonly comments: PullRequestReviewCommentConnection
}

interface PullRequestReviewThreadConnection {
  readonly pageInfo: BackwardPagination
  readonly totalCount: number
  readonly nodes: PullRequestReviewThread[]
}

interface PullRequest {
  readonly reviewThreads: PullRequestReviewThreadConnection
  readonly id: string
}

interface Repository {
  readonly pullRequest: PullRequest
}

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
  pr,
  resolve,
  EmissaryPullRequest,
  EmissaryReviewThread,
  EmissaryComment,
}
