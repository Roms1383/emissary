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
        const { data: prs } = await utils.core
            .pr(commit.id)
            .catch(console.error)
        for (pr of prs) {
            if (pr.state == 'open' && !pr.locked) {
                const num = pr.number
                const base = pr.base.repo.owner.login
                const {
                    repository: {
                        pullRequest: {
                            reviewThreads: {
                                pageInfo: {
                                    endCursor: cursor,
                                    hasNextPage: next,
                                },
                                totalCount: total,
                                nodes: threads,
                            },
                            reviewDecision: decision,
                        },
                    },
                } = await utils.graphql.pr(base, num).catch(console.error)
                console.info(`decision: ${decision}`)
                console.info(`total: ${total}`)
                const count = threads.length
                for (thread of threads) {
                    const {
                        author: { login: contributor },
                        bodyText: message,
                    } = thread
                    console.info(
                        `contributor @${contributor} committed with:\n${message}`
                    )
                }
                console.warn('TODO: pagination')
                if (next) {
                    console.warn('there are more threads')
                }
            }
        }
    }
}

analyze()

module.exports = analyze
