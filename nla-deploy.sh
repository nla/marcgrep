#!/bin/bash
set -e
staging_dir=$1
env=$2
marcgrep_version=1.0.4
export PATH="./.nla-deploy:$PATH"

mkdir -p .nla-deploy
wget -O .nla-deploy/lein https://raw.github.com/technomancy/leiningen/2.8.1/bin/lein
chmod a+x .nla-deploy/lein
lein deps
lein with-profile ${env} ring uberwar
echo "built war"

unzip -d "${staging_dir}/ROOT" "target/marcgrep-${marcgrep_version}-standalone.war"
