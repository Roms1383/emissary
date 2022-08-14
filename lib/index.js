require('dotenv').config()
const { info, warning, setFailed, debug } = require('@actions/core')
const utils = require('./utils')
const [_, repo] = process.env.GITHUB_REPOSITORY.split('/')

const matching = (kept, commit) => {
  const sha = commit.id
  const matches = utils.matches(commit.message)
  const contributor = commit.author?.name
  if (matches && commit.distinct) kept.push({ sha, matches, contributor })
  return kept
}
const opened = (pr) => pr.state == 'open' && !pr.locked
const unresolved = (thread) => !thread.resolved
const same = (discussion) => (comment) =>
  utils.extract(comment.url) == discussion &&
  comment.state.toLowerCase() === 'submitted'
const resolutions = ({ matches }) => matches.act === 'resolve'

const search = async (owner, pr, discussion) => {
  let found = false
  let { threads } = await utils.graphql.pr(owner, pr.number)
  threads = threads.filter(unresolved)
  for (thread of threads) {
    found = thread.comments.find(same(discussion))
    if (found) return found
  }
  return await search(owner, pr, discussion)
}

const handle = async ({
  sha,
  matches: { act, discussion, extra },
  contributor,
}) => {
  let found = false
  let owner = undefined

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
    if (process.env.DRY_RUN) {
      warning(`[dry-run] would have sent ${message}`)
      return true
    }
    await utils.core.reply(owner, repo, pr.number, discussion, message)
    if (act === 'resolve') {
      await utils.graphql.resolve(thread.id)
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
  for (commit of kept) {
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
