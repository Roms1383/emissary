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
                                totalCount: totalThreads,
                                nodes: threads,
                            },
                            reviewDecision: decision,
                        },
                    },
                } = await utils.graphql.pr(base, num).catch(console.error)
                console.info(`decision: ${decision}`)
                console.info(`total: ${totalThreads}`)
                for (thread of threads) {
                    const {
                        isResolved: resolved,
                        viewerCanReply: canReply,
                        viewerCanResolve: canResolve,
                        path,
                        comments: {
                            pageInfo: { endCursor: cursor, hasNextPage: next },
                            totalCount: totalComments,
                            nodes: comments,
                        },
                    } = thread
                    console.info(`resolved? ${resolved}`)
                    console.info(`can reply? ${canReply}`)
                    console.info(`can resolve? ${canResolve}`)
                    console.info(`path: ${path}`)
                    console.info(`total: ${totalComments}`)
                    if (!resolved && canReply /* && canResolve */) {
                        console.warn('find root comment to reply to')
                        for (comment of comments) {
                            const interlocutor = comment.author?.login
                            const message = comment.bodyText
                            const state = comment.state
                            console.info(
                                `@${interlocutor} said:\n${message}\n(${state})`
                            )
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

analyze()

module.exports = analyze
