require('dotenv').config()
const { info, warning, error } = require('@actions/core')
const utils = require('./utils')
const [_, repo] = process.env.GITHUB_REPOSITORY.split('/')

const action = async () => {
    const event = await utils.eventOrSkip()
    if (event === 'skip') process.exit(0)

    const { commits } = event
    const total = {}
    total.commits = commits.length
    total.matches = 0
    for (commit of commits) {
        const sha = commit.id
        const matches = utils.matches(commit.message)
        if (matches && commit.distinct) {
            total.matches++
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
                                    info(
                                        `${matches.act}ing to PR ${pr.number} thread ${thread.id} discussion ${searched}`
                                    )
                                    await utils.core.reply(
                                        pr.base?.repo?.owner?.login,
                                        repo,
                                        pr.number,
                                        searched,
                                        matches.extra
                                            ? `@${commit.author?.name} ${matches.act} it in ${sha}\n${matches.extra}`
                                            : `@${commit.author?.name} ${matches.act} it in ${sha}`
                                    )
                                    if (matches.act === 'resolve')
                                        await utils.graphql.resolve(thread.id)
                                }
                                warning('TODO: pagination')
                                if (comment.next) {
                                    warning('there are more comments')
                                }
                            }
                        }
                    }
                    warning('TODO: pagination')
                    if (next) {
                        warning('there are more threads')
                    }
                }
            }
        }
    }
    info(
        `push event contains ${total.commits} commit(s), ${total.matches} match(es)`
    )
    info('finished')
}

action().catch(error)

module.exports = action
