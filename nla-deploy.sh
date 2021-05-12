#!/bin/bash

set -e

staging_dir=$1
env=$2
marcgrep_version=1.0.4

echo "PWD $PWD"

mkdir -p .nla-deploy
wget -O .nla-deploy/lein https://raw.github.com/technomancy/leiningen/2.8.1/bin/lein
chmod a+x .nla-deploy/lein

export PATH="./.nla-deploy:$PATH"

#lein deps
#lein ring uberwar
lein uberjar
echo "built jar"

unzip -d "${staging_dir}/ROOT" "marcgrep-src/target/marcgrep-${marcgrep_version}-standalone.jar"