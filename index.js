require('dotenv').config()
const boxen = require('boxen')
const utils = require('./utils')
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')

const box = (key, value, stringify) => {
    if (stringify) value = JSON.stringify(value, null, 2)
    console.log(
        boxen(`${value}`, {
            padding: 1,
            title: `${key}`,
            float: 'center',
            titleAlignment: 'center',
            textAlignment: 'left',
            borderStyle: 'round',
        })
    )
}

const info = (key, value, stringify) => {
    if (stringify) value = JSON.stringify(value, null, 2)
    console.info(`${key}:\n${value}\n`)
}

const analyze = async () => {
    const eventPath = await utils
        .read(`${process.env.GITHUB_EVENT_PATH}`)
        .then(JSON.parse)
    info('github.event', eventPath, true)
    const { commits, ref } = eventPath
    info('ref', ref)
    info('commits', commits.map(({ id }) => id).join(', '))
    let commitsMatch = 0
    for (commit of commits) {
        const sha = commit.id
        const matches = utils.matches(commit.message)
        if (matches) {
            commitsMatch += 1
            box('found pattern', matches)
            const { data: prs } = await utils.core.pr(sha).catch(console.error)
            let prFound = 0
            info('prs', prs, true)
            for (pr of prs) {
                if (pr.state == 'open' && !pr.locked) {
                    prFound += 1
                    const num = pr.number
                    const base = pr.base.repo.owner.login
                    const { next, threads, decision, total, reviews } =
                        await utils.graphql.pr(base, num).catch(console.error)
                    info('pr node id', pr.node_id)
                    info('reviews', reviews, true)
                    info('decision', decision)
                    info('total', total)
                    console.log('\n')
                    for (thread of threads) {
                        info('thread id', thread.id)
                        info('is thread resolved?', thread.resolved)
                        info('can viewer reply to thread?', thread.canReply)
                        info('can viewer resolve thread?', thread.canResolve)
                        info('path file thread', thread.path)
                        info('total comments', thread.total)
                        console.log('\n')
                        if (
                            !thread.resolved &&
                            thread.canReply /* && thread.canResolve */
                        ) {
                            console.warn('find root comment to reply to')
                            for (comment of thread.comments) {
                                info(
                                    'commit infos:',
                                    `@${comment.interlocutor} said:\n${comment.message}\n(${comment.state})\npath comment file: ${comment.path}\ncomment id: ${comment.id}\ncomment url: ${comment.url}`
                                )
                                const searched = comment.url
                                    .split('#')[1]
                                    .substr('discussion_r'.length)
                                if (searched === matches) {
                                    info(
                                        'found!',
                                        `${comment.url} matches with ${matches}`
                                    )
                                    // await utils.graphql.notify(
                                    //     pr.node_id,
                                    //     reviews[0].id,
                                    //     `done in ${sha}`
                                    // )
                                    await utils.core.reply(
                                        base,
                                        repo,
                                        num,
                                        searched,
                                        `done in ${sha}`
                                    ).then(console.info).catch(console.error)
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
    box('total commits matches', commitsMatch)
}

analyze()

module.exports = analyze
