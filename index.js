require('dotenv').config()
const utils = require('./utils')
const { box, info } = utils.log
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')

const analyze = async () => {
    const event = await utils.event()
    const { commits, ref } = event
    // info('github.event', event, true)
    // info('ref', ref)
    // info('commits', commits.map(({ id }) => id).join(', '))
    for (commit of commits) {
        const sha = commit.id
        const matches = utils.matches(commit.message)
        if (matches) {
            // box('found pattern', matches)
            const { data: prs } = await utils.core.pr(sha)
            // info('prs', prs, true)
            for (pr of prs) {
                if (pr.state == 'open' && !pr.locked) {
                    const { next, threads, decision, total, reviews } =
                        await utils.graphql.pr(
                            pr.number,
                            pr.base?.repo?.owner?.login
                        )
                    // info('pr node id', pr.node_id)
                    // info('reviews', reviews, true)
                    // info('decision', decision)
                    // info('total', total)
                    // console.log('\n')
                    for (thread of threads) {
                        // info('thread id', thread.id)
                        // info('is thread resolved?', thread.resolved)
                        // info('can viewer reply to thread?', thread.canReply)
                        // info('can viewer resolve thread?', thread.canResolve)
                        // info('path file thread', thread.path)
                        // info('total comments', thread.total)
                        // console.log('\n')
                        if (!thread.resolved) {
                            // console.warn('find root comment to reply to')
                            for (comment of thread.comments) {
                                // info(
                                //     'commit infos:',
                                //     `@${comment.interlocutor} said:\n${comment.message}\n(${comment.state})\npath comment file: ${comment.path}\ncomment id: ${comment.id}\ncomment url: ${comment.url}`
                                // )
                                const searched = comment.url
                                    .split('#')[1]
                                    .substr('discussion_r'.length)
                                if (searched === matches) {
                                    // info(
                                    //     'found!',
                                    //     `${comment.url} matches with ${matches}`
                                    // )
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
