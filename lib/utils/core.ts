import { debug } from '@actions/core'
import { Octokit } from '@octokit/core'
import { Endpoints } from '@octokit/types'

const octokit = new Octokit({
  auth: `${process.env.GITHUB_TOKEN || process.env.INPUT_TOKEN}`,
})
const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')

type Commits =
  Endpoints['GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls']['response']

interface SimpleUser {
  readonly login: string
}

interface Repository {
  readonly owner?: SimpleUser
}

interface Base {
  readonly repo?: Repository
}

interface PullRequestSimple {
  readonly base?: Base
  readonly number: string
}

const pr = async (commit_sha: string): Promise<Commits> =>
  await octokit
    .request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
      owner,
      repo,
      commit_sha,
    })
    .then((v) => {
      debug(`utils.core.pr:\n${JSON.stringify(v, null, 2)}\n\n`)
      return v
    })

type Replies =
  Endpoints['POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies']['response']

const reply = async (
  owner: string,
  repo: string,
  pull_number: number,
  comment_id: number,
  body: string
): Promise<Replies> =>
  octokit
    .request(
      'POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies',
      {
        owner,
        repo,
        pull_number,
        comment_id,
        body,
      }
    )
    .then((v) => {
      debug(`utils.core.reply:\n${JSON.stringify(v, null, 2)}\n\n`)
      return v
    })

export {
  pr,
  reply,
  Commits,
  Replies,
  PullRequestSimple,
  Base,
  SimpleUser,
  Repository,
}
