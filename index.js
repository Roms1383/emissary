require('dotenv').config()
const utils = require('./utils')

const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')

const analyze = async () => {
    const { commits, ref } = await utils
        .read(`${process.env.GITHUB_EVENT_PATH}`)
        .then(JSON.parse)
    console.info('commits')
    console.info(commits)
    console.info('ref')
    console.info(ref)
    let belongs = false
    for (commit of commits) {
        let pr = await utils.core.pr(commit.id)
        console.info('pr:')
        console.info(pr)
    }
    // const num = utils.issue(ref)
    // if (num) {
    // for (commit of commits) {
    //     console.info(JSON.stringify(commit, null, 2))
    //     const found = utils.comment(commit.message)
    //     if (found) {
    //         const comment = `${found} *from @${
    //             commit.author.username
    //         } in [${commit.id.substring(0, 6)}](${commit.url})*`
    //         console.warn('todo')
    //     }
    // }
    // }
}

analyze()

module.exports = analyze
