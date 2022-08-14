import { info, setFailed, warning } from '@actions/core'

import * as utils from './utils'
import { EmissaryComment } from './utils/graphql'

require('dotenv').config()
const [_, repo] = process.env.GITHUB_REPOSITORY!.split('/')

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

const matching = (
  kept: EmissaryMatchingCommit[],
  commit: utils.GithubCommit
): EmissaryMatchingCommit[] => {
  const sha = commit.id
  const matches = utils.matches(commit.message)
  const contributor = commit.author?.name
  if (matches && commit.distinct) kept.push({ sha, matches, contributor })
  return kept
}
const opened = (pr: { state: string; locked: boolean }) =>
  pr.state == 'open' && !pr.locked
const unresolved = (thread: { resolved: boolean }) => !thread.resolved
const same =
  (discussion: string) => (comment: { url: string; state: string }) =>
    utils.extract(comment.url) == discussion &&
    comment.state.toLowerCase() === 'submitted'
const resolutions = ({ matches }: EmissaryMatchingCommit) =>
  matches.act === 'resolve'

const search = async (
  owner: string,
  pr: { number: number },
  discussion: string
): Promise<EmissaryComment | false> => {
  let found: EmissaryComment | false = false
  let { threads } = await utils.graphql.pr(owner, pr.number)
  threads = threads.filter(unresolved)
  for (const thread of threads) {
    found = thread.comments.find(same(discussion)) || false
    if (found) return found
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

  let { data: prs } = await utils.core.pr(sha)
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
    const action = act === 'reply' ? 'marked it as done' : 'resolved it'
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

action().catch(setFailed)

module.exports = action
