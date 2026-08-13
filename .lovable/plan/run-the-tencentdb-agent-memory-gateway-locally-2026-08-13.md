# Run the TencentDB Agent Memory gateway locally

The `docker run -p 8420:8420 tencentcloud/tencentdb-agent-memory:latest` command fails because that image does not exist on Docker Hub. The project only ships source code; you must build the image locally.

## Why it failed

- `tencentcloud/tencentdb-agent-memory` is **not a published image**.
- The repo's Dockerfile builds a local image named `memory-core:local`.
- After building, you also need to enable CORS and provide an LLM key, or the gateway will start but the browser/app cannot talk to it.

## What to do now

Run these commands in your terminal (one block at a time):

```text
# 1. Clone the repo
git clone https://github.com/TencentCloud/TencentDB-Agent-Memory
cd TencentDB-Agent-Memory/MemoryCore

# 2. Build the local image
docker build -t memory-core:local .
```

Before starting the container, create or edit `tdai-gateway.yaml` in the same `MemoryCore` folder so CORS allows your app origin:

```yaml
server:
  host: 0.0.0.0
  port: 8420
  corsOrigins:
    - "http://localhost:8080"
    - "http://localhost:5173"
```

Then run the container with your LLM credentials:

```text
# 3. Run the gateway
docker run -p 8420:8420 \
  -e TDAI_GATEWAY_HOST=0.0.0.0 \
  -e TDAI_GATEWAY_API_KEY=your-gateway-api-key \
  -e TDAI_LLM_API_KEY=your-llm-api-key \
  -e TDAI_LLM_BASE_URL=https://api.openai.com/v1 \
  -e TDAI_LLM_MODEL=gpt-4o-mini \
  -v $(pwd)/tdai-gateway.yaml:/data/config/tdai-gateway.yaml:ro \
  memory-core:local
```

## Verify it is running

Open a browser tab to:

```text
http://localhost:8420/health
```

You should see a JSON health response. If that works, open the app at `/agent-memory`, click **Settings**, and enter:

- Base URL: `http://localhost:8420`
- API key: the same value you used for `TDAI_GATEWAY_API_KEY`
- Service id: any identifier you want, e.g. `mmora-local`

Then click **Save & test**. The badge should flip from "Gateway offline" to "Gateway online".

## Important limits

- This is local-dev only. The published HTTPS site cannot call `http://localhost:8420` because of mixed-content/CORS rules.
- The gateway needs a real LLM key (`TDAI_LLM_API_KEY`) because L1–L3 memory distillation is LLM-driven.
- If you do not set `server.corsOrigins`, the browser will block every call even though the container is running.
