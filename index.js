require('dotenv').config()
const utils = require('./utils')
const [_, repo] = process.env.GITHUB_REPOSITORY.split('/')

const action = async () => {
    const event = await utils.eventOrSkip()
    if (event === 'skip') process.exit(0)

    const { commits } = event
    for (commit of commits) {
        const sha = commit.id
        const matches = utils.matches(commit.message)
        if (matches && commit.distinct) {
            const { data: prs } = await utils.core.pr(sha)
            for (pr of prs) {
                if (pr.state == 'open' && !pr.locked) {
                    const { next, threads, decision, total, reviews } =
                        await utils.graphql.pr(
                            pr.base?.repo?.owner?.login,
                            pr.number
                        )
                    for (thread of threads) {
                        if (!thread.resolved) {
                            for (comment of thread.comments) {
                                const searched = comment.url
                                    .split('#')[1]
                                    .substr('discussion_r'.length)
                                if (searched === matches.discussion) {
                                    console.info(
                                        `${matches.act}ing to PR ${pr.number} thread ${thread.id} discussion ${searched}`
                                    )
                                    await utils.core.reply(
                                        pr.base?.repo?.owner?.login,
                                        repo,
                                        pr.number,
                                        searched,
                                        `@${commit.author?.name} marked it as done in ${sha}`
                                    )
                                    if (matches.act === 'resolve')
                                        await utils.graphql.resolve(thread.id)
                                }
                                console.warn('TODO: pagination')
                                if (comment.next) {
                                    console.warn('there are more comments')
                                }
                            }
                        }
                    }
                    console.warn('TODO: pagination')
                    if (next) {
                        console.warn('there are more threads')
                    }
                }
            }
        }
    }
    console.info('finished')
}

action().catch(console.error)

module.exports = action
