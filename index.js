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
    total.replied = 0
    total.resolved = 0
    for (commit of commits) {
        const sha = commit.id
        const matches = utils.matches(commit.message)
        if (matches && commit.distinct) {
            total.matches += 1
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
                                        `${matches.act} discussion ${searched} in thread ${thread.id} in PR ${pr.number}`
                                    )
                                    const act =
                                        matches.act === 'reply'
                                            ? 'marked it as done'
                                            : 'resolved it'
                                    let message = `@${commit.author?.name} ${act} in ${sha}`
                                    if (matches.extra)
                                        message = `${message}\n${matches.extra}`
                                    await utils.core.reply(
                                        pr.base?.repo?.owner?.login,
                                        repo,
                                        pr.number,
                                        searched,
                                        message
                                    )
                                    if (matches.act === 'resolve') {
                                        await utils.graphql.resolve(thread.id)
                                        total.resolved += 1
                                    } else {
                                        total.replied += 1
                                    }
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
        `push event contains ${total.commits} commit(s), ${
            total.matches
        } match(es): ${total.replied} discussion${
            total.replied > 1 ? 's' : ''
        } replied to and ${total.resolved} directly resolved`
    )
    info('finished')
}

action().catch(error)

module.exports = action
