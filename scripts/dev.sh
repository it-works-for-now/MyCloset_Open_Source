#!/usr/bin/env bash
# front · back · ai 를 백그라운드로 띄우고 Ctrl+C 로 한 번에 내린다.
# GPU 가 없다면  SKIP_AI=1 ./scripts/dev.sh  로 AI 서버를 건너뛴다.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pids=()

cleanup() { echo; echo "서버를 종료합니다."; kill "${pids[@]}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "back  :8080"; (cd "$root/back"  && ./gradlew bootRun) & pids+=($!)
echo "front :5173"; (cd "$root/front" && npm run dev)       & pids+=($!)
if [ "${SKIP_AI:-0}" != "1" ]; then
  echo "ai    :8001"; (cd "$root/ai" && .venv/bin/python -m app.main) & pids+=($!)
fi

echo
echo "브라우저에서 http://localhost:5173 을 여세요. 종료는 Ctrl+C."
wait
