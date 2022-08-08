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
            'emissary does not act on a freshly created branch, skipping...'
        )
    }
    if (deleted) {
        console.info('emissary does not act on a deleted branch, skipping...')
    }
    if (forced) {
        console.info(
            'emissary does not act on force-pushed commit(s), skipping...'
        )
    }
    if (disabled) {
        console.info(
            'emissary does not act on disabled repository, skipping...'
        )
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

const matches = (ref) => {
    let found = ref.match(
        /(reply|replies|replied|resolve|resolves|resolved) +(discussion|discussion_r)(\-|\_| +)?([0-9]{9,})(.*)/im
    )
    return found
        ? {
              act: ['reply', 'replies', 'replied'].includes(
                  found[1].toLowerCase()
              )
                  ? 'reply'
                  : 'resolve',
              discussion: found[4],
              extra: found[5].trim(),
          }
        : false
}

module.exports = {
    eventOrSkip,
    matches,
    core,
    graphql,
}
