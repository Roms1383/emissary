const fs = require('fs').promises

const core = require('./core')
const rest = require('./rest')
const graphql = require('./graphql')
const log = require('./log')

const event = async () =>
    fs.readFile(`${process.env.GITHUB_EVENT_PATH}`, 'utf8').then(JSON.parse)

const matches = (ref) => {
    let found = ref.match(/#resolves? discussion_r([0-9]{9,}).*/im)
    return found ? found[1] : false
}

module.exports = {
    event,
    matches,
    core,
    rest,
    graphql,
    log,
}
