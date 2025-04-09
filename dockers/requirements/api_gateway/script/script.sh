#!/bin/bash

npm install
if [ ! -d "dist/" ]; then
		mkdir dist;
fi
npm build || { echo "Build failed"; exit 1; }
npm start

echo "coucou"

exec "$@"