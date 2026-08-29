#!/bin/sh
set -eu

mkdir -p /app/data/upload
chown -R blog:blog /app/data
exec su-exec blog:blog /app/blog
