const fs = require('fs').promises

const { debug } = require('@actions/core')
const core = require('./core')
const graphql = require('./graphql')

const maybe_skip = (event) => {
  debug(`github.event:\n${JSON.stringify(event, null, 2)}\n\n`)
  const { created, deleted, forced, ref } = event
  const disabled = event.repository?.disabled
  const main = ref === `refs/heads/${event.repository.master_branch}`
  if (!created && !deleted && !forced && !disabled && !main) return false
  if (created) {
    console.info(
      'emissary does not act on a freshly created branch or branch tagging, skipping...'
    )
  }
  if (deleted) {
    console.info('emissary does not act on a deleted branch, skipping...')
  }
  if (forced) {
    console.info('emissary does not act on force-pushed commit(s), skipping...')
  }
  if (disabled) {
    console.info('emissary does not act on disabled repository, skipping...')
  }
  if (main) {
    console.info('emissary does not act on your main branch, skipping...')
  }
  return true
}

const eventOrSkip = async () =>
  fs
    .readFile(`${process.env.GITHUB_EVENT_PATH}`, 'utf8')
    .then(JSON.parse)
    .then((event) => (maybe_skip(event) ? 'skip' : event))

const extract = (url) =>
  url.indexOf('#') !== -1
    ? url.split('#')[1].substr('discussion_r'.length)
    : url

const matches = (ref) => {
  const lines = ref.split(/\n+/m).map((line) => line.trim())
  const which = lines.findIndex((line) =>
    line.match(/(reply|replies|replied|resolve|resolves|resolved).+/i)
  )
  if (which === -1) return false
  const sentence = lines[which]
  let words = sentence.split(/[ ]+/)
  const [act] = words.splice(0, 1)
  if (
    ['discussion', 'discussions', 'conversation', 'conversations'].includes(
      words[0]
    )
  )
    words.splice(0, 1)
  const discussion = words
    .filter((word) =>
      word.match(
        /(https\:\/\/github\.com\/.+\/.+\/pull\/discussion\_r)?([0-9]{9,})/
      )
    )
    .map(extract)
  if (discussion.length === 0) return false
  const lastDiscussion = discussion[discussion.length - 1]
  const extra = sentence
    .substr(sentence.indexOf(lastDiscussion) + lastDiscussion.length)
    .trim()

  return {
    act: ['reply', 'replies', 'replied'].includes(act) ? 'reply' : 'resolve',
    discussion,
    extra,
  }
}

module.exports = {
  eventOrSkip,
  matches,
  extract,
  core,
  graphql,
}
