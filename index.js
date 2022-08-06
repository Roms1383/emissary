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
    for (commit of commits) {
        console.info(`searching for pr related to ${commit.id}`)
        let { data: prs } = await utils.core.pr(commit.id).catch(console.error)
        for (pr of prs) {
            if (pr.state == 'open' && !pr.locked) {
                const num = pr.number
                const base = pr.base.repo.owner.login
                await utils.graphql
                    .pr(base, num)
                    .then(console.info)
                    .catch(console.error)
            }
        }
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
