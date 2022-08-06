require('dotenv').config()
const boxen = require('boxen')
const utils = require('./utils')
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')

const box = (key, value) => {
    console.log(
        boxen(`${value}`, {
            padding: 1,
            title: `${key}`,
            titleAlignment: 'center',
            textAlignment: 'center',
            borderStyle: 'round'
        })
    )
}

const line = (level, value, stringify) => {
    if (stringify) value = JSON.stringify(value, null, 2)
    switch (level) {
        case 'warn':
            console.warn(value)
            break
        case 'info':
            console.info(value)
            break
        default:
            console.debug(value)
            break
    }
}

const analyze = async () => {
    const { commits, ref } = await utils
        .read(`${process.env.GITHUB_EVENT_PATH}`)
        .then(JSON.parse)
    box('ref', ref)
    box('total commits', commits.length)
    for (commit of commits) {
        const sha = commit.id
        const matches = utils.matches(commit.message)
        if (matches) {
            box('found pattern', matches)
            const { data: prs } = await utils.core.pr(sha).catch(console.error)
            let prFound = 0
            for (pr of prs) {
                if (pr.state == 'open' && !pr.locked) {
                    prFound += 1
                    const num = pr.number
                    const base = pr.base.repo.owner.login
                    const { next, threads, decision, total } =
                        await utils.graphql.pr(base, num).catch(console.error)
                    box('decision', decision)
                    box('total', total)
                    console.log('\n')
                    for (thread of threads) {
                        box('thread id', thread.id)
                        box('is thread resolved?', thread.resolved)
                        box('can viewer reply to thread?', thread.canReply)
                        box('can viewer resolve thread?', thread.canResolve)
                        box('path file thread', thread.path)
                        box('total comments', thread.total)
                        console.log('\n')
                        if (
                            !thread.resolved &&
                            thread.canReply /* && thread.canResolve */
                        ) {
                            console.warn('find root comment to reply to')
                            for (comment of thread.comments) {
                                const interlocutor = comment.author?.login
                                const message = comment.bodyText
                                const state = comment.state
                                const pathComment = comment.path
                                console.info(
                                    `@${interlocutor} said:\n${message}\n(${state})\npath comment file: ${pathComment}\ncomment id: ${comment.id}`
                                )
                                console.info(`\n`)
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

analyze()

module.exports = analyze
