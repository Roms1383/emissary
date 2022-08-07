# emissary

A simple Github Action to comment on pull request discussions from commits messages

## infos

### example of a Github Action in JS

e.g. <https://github.com/TinkurLab/commit-issue-commenter-action>

### example for the tests in JS

e.g. <https://github.com/octokit/graphql.js#writing-tests>

### tools of the trade

octokit REST and GraphQL (see below)

## concept

mark pull request reviews conversations as done with github action:

so every time a push is made, retrieve all the commits associated with it
then parse for a conventionally named part of the message
e.g.

```txt
:green_heart: fix CI

add missing setup for job X

resolve thread ID
```

> would add a comment to the conversation (thread) like e.g. `done in SHA` AND resolve it
> useful for chore tasks that doesn't require extra attention from the maintainer

or even

```txt
:wrench: add build command

add build command with args to just

notify thread ID
```

> would add a comment to the conversation (thread) like e.g. `done in SHA` but NOT resolve it
> useful for important changes that, even addressed, need extra attention and resolution from the maintainer itself

## TODO list

push webhook: for parsing metadata
ref (branch or tag)
commits (id, message, author)
repository

[pull request review thread](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#pull_request_review_thread)

[pull request review comment](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#pull_request_review_comment) api

- list review comments on a pull request (`pull_request_review_id`, `html_url` for the id of the discussion associated with the `diff_hunk`)
- create a reply for a review comment (:warning: provide id of top-level review comment)

[pull requests reviews](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#pull_request_review) api

- list reviews for a pull request (state e.g. CHANGES_REQUESTED|APPROVED)

graph ql api [for discussions](https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions)

especially [Queries](https://docs.github.com/en/graphql/reference/queries) and [Objects](https://docs.github.com/en/graphql/reference/objects)

- addDiscussionComment
- markDiscussionCommentAsAnswer
- PullRequestReviewThread [v4] (isResolved, isOutdated, pullRequest)
Discussion (number, locked)

### webhooks

event
The review action you want to perform. The review actions include: APPROVE, REQUEST_CHANGES, or COMMENT. By leaving this blank, you set the review action state to PENDING, which means you will need to submit the pull request review when you are ready.

Can be one of: APPROVE, REQUEST_CHANGES, COMMENT

### samples

e.g. from frb: <https://github.com/fzyzcjy/flutter_rust_bridge/pull/605#discussion_r935453437>

### work in progress

- beware that commit SHA is from forked repository but review threads must be retrieved from main repository.
- beware that octokit request 'GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls' works in private repo **when run from Github Action**
but won't simply work when queried from outside (e.g. from integration tests). that's why it might be required to setup a fake repo for tests.
