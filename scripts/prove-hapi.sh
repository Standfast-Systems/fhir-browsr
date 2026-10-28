#!/usr/bin/env bash
# Proof of done: boot HAPI with each generated application.yaml and check the server against the
# manifest it came from.
#
#   HAPI_WAR=/path/to/ROOT.war scripts/prove-hapi.sh onc-g10 cms-0057-f
#
# HAPI_WAR is a HAPI FHIR JPA Server Starter WAR (mvn package in hapi-fhir-jpaserver-starter).
# JAVA defaults to `java` on PATH. Each run gets a fresh H2 database in a temp folder.

set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAVA="${JAVA:-java}"
: "${HAPI_WAR:?set HAPI_WAR to a HAPI JPA Server Starter WAR}"
[ $# -gt 0 ] || set -- onc-g10 cms-0057-f

stop() {
  # Git Bash: signals don't reach native Windows processes, so use taskkill on the Windows PID.
  if [ -r "/proc/$1/winpid" ]; then taskkill //F //T //PID "$(cat "/proc/$1/winpid")" >/dev/null 2>&1; fi
  kill "$1" 2>/dev/null
  wait "$1" 2>/dev/null
}

port=8090
status=0
for name in "$@"; do
  cfg="$ROOT/proof/$name/application.yaml"
  [ -f "$cfg" ] || { echo "[$name] no $cfg"; status=1; continue; }
  # Git Bash on Windows: Java needs C:/... paths, not /c/...
  command -v cygpath >/dev/null 2>&1 && cfg="$(cygpath -m "$cfg")"
  work="$(mktemp -d)"
  log="$work/hapi.log"
  echo "[$name] booting HAPI on :$port (log $log)"
  started=$(date +%s)
  # Start java directly (not in a subshell) so $! is the server itself and can be stopped.
  pushd "$work" >/dev/null
  "$JAVA" -Xmx4g -jar "$HAPI_WAR" --server.port=$port \
    "--spring.config.additional-location=file:$cfg" >"$log" 2>&1 &
  pid=$!
  popd >/dev/null
  until grep -qE "Started Application|APPLICATION FAILED TO START|Application run failed|OutOfMemoryError" "$log" 2>/dev/null \
    || ! kill -0 $pid 2>/dev/null; do sleep 3; done
  if grep -q "Started Application" "$log"; then
    echo "[$name] started in $(( $(date +%s) - started )) s; $(grep -c 'Installing package' "$log") package installs; $(grep -c 'Skipping installation of resource' "$log") resources skipped"
    node "$ROOT/scripts/verify-hapi.ts" --base "http://localhost:$port/fhir" --manifest "$ROOT/proof/$name/initializr.json" || status=1
  else
    echo "[$name] FAILED to start:"
    grep -E "Caused by|APPLICATION FAILED|OutOfMemoryError" "$log" | tail -5
    status=1
  fi
  stop $pid
  port=$((port + 1))
done
exit $status
