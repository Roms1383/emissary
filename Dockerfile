FROM node:16

LABEL "com.github.actions.name"="Comment on Pull Request Review from Commit"
LABEL "com.github.actions.description"="Comment on pull request review from commit messages"
LABEL "com.github.actions.icon"="mic"
LABEL "com.github.actions.color"="yellow"

LABEL "repository"="http://github.com/Roms1383/emissary"
LABEL "maintainer"="Romain Kelifa"

ADD entrypoint.sh /action/entrypoint.sh
ADD package.json /action/package.json
ADD index.js /action/index.js
ADD utils.js /action/utils.js

RUN chmod +x /action/entrypoint.sh

ENTRYPOINT ["/action/entrypoint.sh"]
