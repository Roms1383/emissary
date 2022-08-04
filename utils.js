const fs = require('fs').promises

const owner = (event) => event.slice(0, event.indexOf('/'))
const repo = (event) => event.slice(event.indexOf('/') + 1, event.length)

const read = async (at) => fs.readFile(at, 'utf8')

const issue = (ref) => {
    let found = ref.match(/refs\/heads\/(\d+)/i)
    return found ? found[1] : false
}

const comment = (ref) => {
    let found = ref.match(/#resolve discussion_r[0-9]{9,}(.*)/i)
    console.info(`checking for comment:\n${found}`)
    return found ? found[1] : false
}

const reply = async (octokit, owner, repo, issue_number, body) =>
    octokit.issues
        .createComment({
            owner,
            repo,
            issue_number,
            body,
        })
        .catch((err) => {
            console.log(err)
        })

module.exports = {
    owner,
    repo,
    read,
    comment,
    issue,
    reply,
}
