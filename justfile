set shell := ["bash", "-euo", "pipefail", "-c"]

host := "127.0.0.1"
port := "5464"

default:
    @just --list

# Install npm dependencies when package-lock.json changed or node_modules is missing
deps:
    @if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then npm ci; fi

# Start the Vite live-reload server and open it in a Chromium browser
local: deps
    #!/usr/bin/env bash
    set -euo pipefail
    url="http://{{host}}:{{port}}/"
    npx vite --host {{host}} --port {{port}} --strictPort &
    server=$!
    trap 'kill $server 2>/dev/null' EXIT INT TERM
    until curl -sf -o /dev/null "$url"; do
      kill -0 $server 2>/dev/null || exit 1
      sleep 0.2
    done
    opened=0
    for app in "Helium" "Brave Browser" "Microsoft Edge" "Google Chrome"; do
      if open -Ra "$app" 2>/dev/null; then
        open -a "$app" "$url" && opened=1 && break
      fi
    done
    [ $opened -eq 1 ] || echo "No Chromium browser found; open $url manually"
    wait $server
