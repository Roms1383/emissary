require('dotenv').config()
const [_, repo] = process.env.GITHUB_REPOSITORY!.split('/')

import { info, setFailed, warning } from '@actions/core'

import * as utils from './utils'
import { Act, Commit } from './utils'
import {
  EmissaryComment,
  EmissaryPullRequest,
  PullRequestReviewCommentState,
} from './utils/graphql'

let threadsMap: Map<string, EmissaryPullRequest> = new Map()
const list_threads = async (
  owner: string,
  pr: { number: number }
): Promise<EmissaryPullRequest> => {
  if (!threadsMap.has(`${owner}/#${pr.number}`)) {
    threadsMap.set(
      `${owner}/#${pr.number}`,
      await utils.graphql.threads(owner, pr.number)
    )
  }
  return threadsMap.get(`${owner}/#${pr.number}`)!
}
const list_comments = async (
  owner: string,
  pr: { number: number },
  cursor?: string
) => {
  let threads = await list_threads(owner, pr)
  if (!cursor) {
    let first = threads.threads[0]!
    let comments = await utils.graphql.comments(owner, pr.number)
    first.comments = comments.threads[0].comments
  } else {
    let element = threads.threads.find((v) => v.cursor === cursor)!
    let comments = await utils.graphql.comments(owner, pr.number, cursor)
    element.comments = comments.threads[0].comments
  }
  return threads
}

const matching = (
  kept: EmissaryMatchingCommit[],
  commit: Commit
): EmissaryMatchingCommit[] => {
  const sha = commit.id
  const matches = utils.matches(commit.message)
  const contributor = commit.author?.name
  if (matches && commit.distinct) kept.push({ sha, matches, contributor })
  return kept
}

const opened = (pr: PullRequestState) => pr.state == 'open' && !pr.locked
const unresolved = (thread: PullRequestReviewThreadState) => !thread.resolved
const same =
  (discussion: string) => (comment: PullRequestReviewThreadCommentState) =>
    utils.extract(comment.url) == discussion &&
    comment.state.toLowerCase() === PullRequestReviewCommentState.SUBMITTED
const resolutions = ({ matches }: EmissaryMatchingCommit) =>
  matches.act === 'resolve'

const search = async (
  owner: string,
  pr: { number: number },
  discussion: string
): Promise<EmissaryComment | false> => {
  let found: EmissaryComment | false = false
  let { threads } = await list_threads(owner, pr)
  threads = threads.filter(unresolved)
  for (const thread of threads) {
    found = thread.comments.find(same(discussion)) || false
    if (found) return found
  }
  let previous = undefined
  for (const thread of threads) {
    let {
      threads: [first],
    } = await list_comments(owner, pr, previous?.cursor)
    found = first.comments.find(same(discussion)) || false
    if (found) return found
    previous = thread
  }
  return await search(owner, pr, discussion)
}

const handle = async ({
  sha,
  matches: { act, discussion, extra },
  contributor,
}: EmissarySingleMatchingCommit) => {
  let found: false | object = false
  let owner: string | undefined = undefined
  let pr = undefined

  let { data: prs } = (await utils.core.associatedPR(sha)) || { data: [] }
  prs = prs.filter(opened)
  outer: for (pr of prs) {
    owner = pr.base?.repo?.owner?.login
    if (!owner) {
      warning(`owner not found for PR #${pr.number}`)
      continue
    }

    found = await search(owner, pr, discussion)
    if (found) break outer
  }
  if (found) {
    const action = act === Act.REPLY ? 'marked it as done' : 'resolved it'
    let message = `@${contributor ?? 'unknown'} ${action} in ${sha}`
    if (extra) message = `${message}\n${extra}`
    if (process.env.DRYRUN || process.env.INPUT_DRYRUN === 'true') {
      warning(`[dry-run] would have sent ${message}`)
      return true
    }
    await utils.core.reply(
      owner!,
      repo,
      pr!.number,
      parseInt(discussion),
      message
    )
    if (act === 'resolve') {
      await utils.graphql.resolve(discussion)
    }
    return true
  }
  return false
}

const action = async () => {
  const event = await utils.eventOrSkip()
  if (event === 'skip') process.exit(0)

  const { commits } = event
  let success = []
  const kept = commits.reduce(matching, [])
  for (const commit of kept) {
    for (const discussion of commit.matches.discussion) {
      if (
        await handle({ ...commit, matches: { ...commit.matches, discussion } })
      ) {
        success.push(commit)
      }
    }
  }
  const resolved = success.filter(resolutions).length
  const replied = success.length - resolved
  info(
    `push event contains ${commits.length} commit${
      commits.length > 1 ? 's' : ''
    }, ${kept.length} match(es): ${replied} discussion${
      replied > 1 ? 's' : ''
    } replied to and ${resolved} directly resolved`
  )
  info('finished')
}

type PullRequestState = { state: string; locked: boolean }
type PullRequestReviewThreadState = { resolved: boolean }
type PullRequestReviewThreadCommentState = { url: string; state: string }

interface EmissaryMatchingCommit {
  readonly matches: utils.EmissaryMatch
  readonly contributor?: string
  readonly sha: string
}

interface EmissarySingleMatchingCommit {
  readonly matches: utils.EmissarySingleMatch
  readonly contributor?: string
  readonly sha: string
}

action().catch(setFailed)

module.exports = action
