const fs = require('fs').promises

const core = require('./core')
const rest = require('./rest')
const graphql = require('./graphql')

const read = async (at) => fs.readFile(at, 'utf8')

const matches = (ref) => {
    let found = ref.match(/#resolve discussion_r([0-9]{9,}).*/im)
    return found ? found[1] : false
}

module.exports = {
    read,
    matches,
    core,
    rest,
    graphql,
}
