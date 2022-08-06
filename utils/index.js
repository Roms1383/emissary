const fs = require('fs').promises

const core = require('./core')
const rest = require('./rest')
const graphql = require('./graphql')

const read = async (at) => fs.readFile(at, 'utf8')

const issue = (ref) => {
    let found = ref.match(/refs\/heads\/(\d+)/i)
    return found ? found[1] : false
}

const comment = (ref) => {
    let found = ref.match(/#resolve discussion_r([0-9]{9,}).*/im)
    return found ? found[1] : false
}

module.exports = {
    read,
    comment,
    issue,
    core,
    rest,
    graphql,
}
