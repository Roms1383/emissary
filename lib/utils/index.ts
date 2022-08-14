import { debug } from '@actions/core'
import fs from 'fs/promises'

import * as core from './core'
import * as graphql from './graphql'

interface GithubRepository {
  readonly disabled: boolean
  readonly master_branch: string
}

interface GithubEvent {
  readonly created: boolean
  readonly deleted: boolean
  readonly forced: boolean
  readonly ref: string
  readonly repository?: GithubRepository
  readonly commits: GithubCommit[]
}

interface GithubAuthor {
  readonly name: string
}

interface GithubCommit {
  readonly id: string
  readonly message: string
  readonly author?: GithubAuthor
  readonly distinct: boolean
}

const maybe_skip = (event: GithubEvent) => {
  debug(`github.event:\n${JSON.stringify(event, null, 2)}\n\n`)
  const { created, deleted, forced, ref } = event
  const disabled = event.repository?.disabled
  const main = ref === `refs/heads/${event.repository?.master_branch}`
  if (!created && !deleted && !forced && !disabled && !main) return false
  if (created) {
    console.info(
      'emissary does not act on a freshly created branch or branch tagging, skipping...'
    )
  }
  if (deleted) {
    console.info('emissary does not act on a deleted branch, skipping...')
  }
  if (forced) {
    console.info('emissary does not act on force-pushed commit(s), skipping...')
  }
  if (disabled) {
    console.info('emissary does not act on disabled repository, skipping...')
  }
  if (main) {
    console.info('emissary does not act on your main branch, skipping...')
  }
  return true
}

const eventOrSkip = async (): Promise<GithubEvent | 'skip'> =>
  fs
    .readFile(`${process.env.GITHUB_EVENT_PATH}`, 'utf8')
    .then(JSON.parse)
    .then((event: GithubEvent) => (maybe_skip(event) ? 'skip' : event))

const extract = (url: string) =>
  url.indexOf('#') !== -1
    ? url.split('#')[1].substring('discussion_r'.length)
    : url

interface EmissaryMatch {
  act: 'reply' | 'resolve'
  discussion: string[]
  extra: string
}

interface EmissarySingleMatch {
  act: 'reply' | 'resolve'
  discussion: string
  extra: string
}

const matches = (ref: string): EmissaryMatch | false => {
  const lines = ref.split(/\n+/m).map((line) => line.trim())
  const potential = lines.reduce((found: number[], line, idx) => {
    if (line.match(/(reply|replies|replied|resolve|resolves|resolved).+/i))
      found.push(idx)
    return found
  }, [])
  if (potential.length === 0) return false
  for (const which of potential) {
    const sentence = lines[which]
    let words = sentence.split(/[ ]+/)
    const [act] = words.splice(0, 1)
    if (
      ['discussion', 'discussions', 'conversation', 'conversations'].includes(
        words[0]
      )
    )
      words.splice(0, 1)
    const discussion = words
      .filter((word) =>
        word.match(
          /(https\:\/\/github\.com\/.+\/.+\/pull\/discussion\_r)?([0-9]{9,})/
        )
      )
      .map(extract)
    if (discussion.length === 0) continue
    const lastDiscussion = discussion[discussion.length - 1]
    const extra = sentence
      .substring(sentence.indexOf(lastDiscussion) + lastDiscussion.length)
      .trim()

    return {
      act: ['reply', 'replies', 'replied'].includes(act) ? 'reply' : 'resolve',
      discussion,
      extra,
    }
  }
  return false
}

export {
  eventOrSkip,
  matches,
  extract,
  core,
  graphql,
  EmissaryMatch,
  EmissarySingleMatch,
  GithubAuthor,
  GithubCommit,
  GithubEvent,
  GithubRepository,
}
