# emissary

Allows your contributors to resolve requested changes from a pull request review directly in their commit message.

## usage

1. [setup this Github Action in your workflow](#setup).
1. comment your commits like so, e.g.:

    ```git
    chore: improve documentation

    add example to the latest awesome feature.
    resolve discussion DISCUSSION_NUMBER
    ```

    > :warning: `resolve` will reply to the conversation AND resolve it

    or

    ```git
    feat: add new CLI argument

    add an additional argument for the new feature.
    reply discussion DISCUSSION_NUMBER
    ```

    > :warning: `reply` will only reply to the conversation

    :arrow_right: the `DISCUSSION_NUMBER` can be found under **Copy Link** on the comment requesting changes:

    ![copy discussion number screenshot](images/copy-discussion-number.png)

    it should looks like, e.g. `https://github.com/Roms1383/emissary/pull/1#discussion_r937716034` where `937716034` is the discussion number.

2. on the Github Action successful completion you should now see in your PR:

    ![screenshot comment](./images/outcome.png)

This Github Action supports a couple of different spelling, that you can check [in the unit-tests](tests/utils.test.js).

## setup

You want this action to run on pull requests, so something like:

```yaml
name: CI
on: push

jobs:
  # other jobs ...
  action:
    name: Reply to PR review from Commit
    runs-on: ubuntu-latest
    # needs: unit-tests <-- usually you want some previous jobs to succeed first (e.g. linter, unit-tests, etc)

    steps:
      - name: checkout repository
        uses: actions/checkout@v3
      - name: setup NodeJS
        uses: actions/setup-node@v2
      - name: install dependencies
        run: npm ci

      - uses: Roms1383/emissary@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # required to act in Github on your behalf
```

## why ?

Github already supports adding `fix #ISSUE_NUMBER` in a commit message to automatically close the related issue, but as far as I know there's currently no means to do so for a pull request review conversation.

This Github Action basically spare your contributors from having to go back to the PR, manually commenting / resolving the conversation.

Also to simplify your reviews as a maintainer, a contributor might want to dutifully report in which commit (s)he carried out which one of the requested changes, which is exactly what this Github Action does.

![typical changes request screenshot](images/request-changes.png)
![automated comment screenshot](images/comment.png)