require('dotenv').config()
const { info, warning, debug, setFailed } = require('@actions/core')
const utils = require('./utils')
const [_, repo] = process.env.GITHUB_REPOSITORY.split('/')

const matching = (kept, commit) => {
    const sha = commit.id
    const matches = utils.matches(commit.message)
    if (matches && commit.distinct) kept.push({ sha, matches })
    return kept
}
const opened = (pr) => pr.state == 'open' && !pr.locked
const unresolved = (thread) => !thread.resolved
const same = (discussion) => (comment) =>
    comment.url.split('#')[1].substr('discussion_r'.length) === discussion
const resolutions = ({ matches }) => matches.act === 'resolve'

const handle = async ({ sha, matches }) => {
    const { data: prs } = await utils.core.pr(sha)
    debug(`utils.core.pr:\n${JSON.stringify(prs, null, 2)}\n\n`)

    const openedPRs = (prs || []).filter(opened)
    let source
    outer: for (pr of openedPRs) {
        const { previous, threads } = await utils.graphql.pr(
            pr.base?.repo?.owner?.login,
            pr.number
        )
        debug(
            `utils.graphql.pr[threads]:\n${JSON.stringify(
                threads,
                null,
                2
            )}\n\n`
        )
        const unresolvedThreads = (threads || []).filter(unresolved)
        for (thread of unresolvedThreads) {
            source = (thread.comments || []).find(same(matches.discussion))
            if (source) break outer
        }
    }
    if (source) {
        const act =
            matches.act === 'reply' ? 'marked it as done' : 'resolved it'
        let message = `@${commit.author?.name} ${act} in ${sha}`
        if (matches.extra) message = `${message}\n${matches.extra}`
        await utils.core.reply(
            pr.base?.repo?.owner?.login,
            repo,
            pr.number,
            searched,
            message
        )
        if (matches.act === 'resolve') {
            await utils.graphql.resolve(thread.id)
        }
        return true
    }
    return false
}

const action = async () => {
    const event = await utils.eventOrSkip()
    if (event === 'skip') process.exit(0)

    const { commits } = event
    let success = []
    const kept = commits.reduce(matching, [])
    for (commit of kept) {
        if (await handle(commit)) {
            success.push(commit)
        }
    }
    const resolved = success.filter(resolutions).length
    const replied = success.length - resolved
    info(
        `push event contains ${commits.length} commit${
            commits.length > 1 ? 's' : ''
        }, ${kept.length} match(es): ${replied} discussion${
            replied > 1 ? 's' : ''
        } replied to and ${resolved} directly resolved`
    )
    info('finished')
}

action().catch(setFailed)

module.exports = action
