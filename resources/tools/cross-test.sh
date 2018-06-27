#!/usr/bin/env bash
#
# Run tests for all relevant versions of io.js/node.js
#
# nvm
#   https://github.com/creationix/nvm
#
# $ git clone https://github.com/creationix/nvm.git ~/.nvm && cd ~/.nvm && git checkout `git describe --abbrev=0 --tags`
# $ echo "source ~/.nvm/nvm.sh" >> ~/.bashrc
#
# $ nvm install 6
# $ nvm install 8
# $ nvm install 10
#

source ~/.nvm/nvm.sh

VERSIONS="6 8 10"

for v in $VERSIONS; do
    echo "#### run test with node version $v ####"
    nvm use "$v"
    if [ $? -eq 0 ]; then
        node_modules/.bin/_mocha ./test
    else
        echo "Can't switch to node version $v"
    fi
    echo "#### done test with node version $v ####"
done

exit 0