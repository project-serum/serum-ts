#!/bin/bash

cd packages/associated-token
npm install && npm publish $@
cd ../borsh
npm install && npm publish $@
cd ../tokens
npm install && npm publish $@
cd ../openbook
npm install && npm publish $@
cd ../common
npm install && npm publish $@
cd ../token
npm install && npm publish $@
cd ../pool
npm install && npm publish $@
cd ../spl-token-swap
npm install && npm publish $@
cd ../swap
npm install && npm publish $@
