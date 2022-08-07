require('dotenv').config()
const utils = require('./utils')
const [_, repo] = process.env.GITHUB_REPOSITORY.split('/')

const analyze = async () => {
    const event = await utils.event()
    const { commits, ref } = event
    const main = event.repository.master_branch

    if (event.created) {
        console.info(
            'emissary does not act on a freshly created branch, skipping...'
        )
        return
    }
    if (event.deleted) {
        console.info('emissary does not act on a deleted branch, skipping...')
        return
    }
    if (event.forced) {
        console.info(
            'emissary does not act on force-pushed commit(s), skipping...'
        )
        return
    }
    if (event.repository?.disabled) {
        console.info(
            'emissary does not act on disabled repository, skipping...'
        )
        return
    }
    if (ref === `refs/heads/${main}`) {
        console.info('emissary does not act on your main branch, skipping...')
        return
    }

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
                                if (searched === matches) {
                                    await utils.core.reply(
                                        pr.base?.repo?.owner?.login,
                                        repo,
                                        pr.number,
                                        searched,
                                        `@${commit.author?.name} marked it as done in ${sha}`
                                    )
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
}

analyze().catch(console.error)

module.exports = analyze
