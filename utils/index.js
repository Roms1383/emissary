const fs = require('fs').promises

const core = require('./core')
const rest = require('./rest')
const graphql = require('./graphql')
const log = require('./log')

const maybe_skip = (event) => {
    if (
        !event.created &&
        !event.deleted &&
        !event.forced &&
        !event.repository?.disabled
    )
        return false
    if (event.created) {
        console.info(
            'emissary does not act on a freshly created branch, skipping...'
        )
    }
    if (event.deleted) {
        console.info('emissary does not act on a deleted branch, skipping...')
    }
    if (event.forced) {
        console.info(
            'emissary does not act on force-pushed commit(s), skipping...'
        )
    }
    if (event.repository?.disabled) {
        console.info(
            'emissary does not act on disabled repository, skipping...'
        )
    }
    const main = event.repository.master_branch
    if (event.ref === `refs/heads/${main}`) {
        console.info('emissary does not act on your main branch, skipping...')
        return
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
        /(reply|resolve) (discussion|discussion_r|review)(\-|\_| )?([0-9]{9,})(.*)/im
    )
    return found
        ? {
              act: found[1],
              topic: found[2],
              discussion: found[4],
              extra: found[5].trim(),
          }
        : false
}

module.exports = {
    eventOrSkip,
    matches,
    core,
    rest,
    graphql,
    log,
}
