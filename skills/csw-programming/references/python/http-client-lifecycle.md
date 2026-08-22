# Python HTTP client lifecycle

Use this reference when an existing Python component makes outbound HTTP requests and the
change touches timeouts, pooling, retries, streaming, cancellation, authentication, or cleanup.
It does not select a client library for the repository. Preserve the existing dependency and
lockfile unless migration is explicitly requested.

## Repository gate

Before editing, determine:

- which synchronous or asynchronous client is already installed;
- whether a shared client factory or dependency-injection seam exists;
- where base URLs, credentials, proxy policy, TLS policy, and timeouts come from;
- whether requests cross a transaction, job, web-request, or process lifetime;
- which operations are safe to retry;
- how tests currently substitute the remote service.

Do not add a second client merely because an example below uses `httpx`. Translate the
lifecycle principles to the repository's client when its API can express them.

## Decision table

| Situation | Preferred ownership |
| --- | --- |
| One short synchronous command | Context-managed client inside the command boundary |
| Long-running service | One client owned by application lifespan and closed at shutdown |
| Per-tenant transport or credentials | Bounded cache with explicit eviction and close |
| Streaming download | Response and destination file owned by one context stack |
| Test against protocol behavior | Local HTTP server with deterministic responses |
| Pure domain test | Fake adapter implementing the narrow application port |

Creating a client for every request usually forfeits connection reuse. Keeping one global client
without a shutdown owner leaks sockets and makes tests interfere. Choose a lifetime that matches
the application boundary.

## Timeout model

Separate timeout phases when the client supports them:

- connect: DNS, TCP, and TLS establishment;
- pool: waiting for an available pooled connection;
- write: sending the request body;
- read: waiting for the next response bytes;
- total or caller deadline: the user-visible operation budget.

Values are workload policy, not universal constants. Derive them from the caller's deadline,
service objective, payload size, and observed latency. A larger timeout is not a fix for a deadlock,
wrong route, or stalled dependency.

```python
from __future__ import annotations

import httpx


def build_client(*, base_url: str, timeout_seconds: float) -> httpx.Client:
    timeout = httpx.Timeout(timeout_seconds)
    return httpx.Client(base_url=base_url, timeout=timeout, follow_redirects=False)
```

This factory is intentionally small. Add proxies, limits, TLS material, or event hooks only when
the repository contract requires them. Do not copy environment variables wholesale into evidence.

## Application lifespan

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import httpx


@asynccontextmanager
async def client_lifespan(base_url: str) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(base_url=base_url, timeout=10.0) as client:
        yield client
```

The application framework should enter this context once and inject the client into adapters.
Cancellation during shutdown must still reach `aclose`. Verify the framework's lifespan semantics
instead of assuming an event hook always runs.

## Retry gate

Retry only when all of these are true:

1. the failure is classified as transient;
2. the operation is idempotent or carries a server-supported idempotency key;
3. the retry stays inside the caller's deadline;
4. attempts and backoff are bounded;
5. cancellation interrupts the wait;
6. metrics or logs expose the retry without secrets.

Do not retry authentication failures, schema errors, most client errors, or an ambiguous write
whose commit status is unknown. A transport retry and an application retry are different layers;
avoid stacking them without an explicit combined attempt budget.

```python
import random
import time


def bounded_delay(attempt: int, *, cap: float = 2.0) -> float:
    base = min(cap, 0.1 * (2 ** attempt))
    return random.uniform(0.0, base)
```

Inject the clock and randomness for deterministic tests. The example calculates a delay; it does
not authorize a retry policy by itself.

## Response classification

Keep transport failures, protocol status, and response-schema failures distinct.

```python
from dataclasses import dataclass

import httpx


@dataclass(frozen=True)
class RemoteFailure(Exception):
    kind: str
    detail: str


def fetch_record(client: httpx.Client, record_id: str) -> dict[str, object]:
    try:
        response = client.get(f"/records/{record_id}")
    except httpx.TimeoutException as exc:
        raise RemoteFailure("timeout", "remote request exceeded its budget") from exc
    except httpx.TransportError as exc:
        raise RemoteFailure("transport", "remote connection failed") from exc

    if response.status_code == 404:
        raise RemoteFailure("not-found", record_id)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise RemoteFailure("schema", "expected an object response")
    return payload
```

Do not include response bodies, authorization headers, cookies, or private URLs in exceptions by
default. Preserve a causal exception chain while keeping the public error stable.

## Streaming downloads

Bound both network and filesystem ownership.

```python
from pathlib import Path

import httpx


def download(client: httpx.Client, url: str, destination: Path, limit: int) -> None:
    written = 0
    temporary = destination.with_suffix(destination.suffix + ".part")
    try:
        with client.stream("GET", url) as response:
            response.raise_for_status()
            with temporary.open("wb") as handle:
                for chunk in response.iter_bytes():
                    written += len(chunk)
                    if written > limit:
                        raise RemoteFailure("too-large", f"response exceeds {limit} bytes")
                    handle.write(chunk)
        temporary.replace(destination)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
```

Also validate content type and file format when they are part of the contract. An HTTP 200 status
does not prove that a downloaded artifact has the expected bytes.

## Local protocol test

Use a repository-owned test server or the framework's transport fixture. Cover:

- success and typed parsing;
- connection refusal or transport failure;
- delayed response and caller cancellation;
- redirect policy;
- retryable and non-retryable status;
- malformed or oversized response;
- partial stream cleanup;
- client shutdown after success and failure.

Assert observable requests and outputs. Avoid asserting private client-library call sequences when
a local server can prove the protocol.

## Failure interpretations

| Observation | Likely next question |
| --- | --- |
| Source test passes, packaged app fails | Is the expected dependency/config in the artifact? |
| First request slow, later requests fast | Is connection/TLS setup dominating? |
| Pool timeout | Are responses closed and concurrency bounded? |
| Read timeout during streaming | Is progress occurring and is the phase budget appropriate? |
| Duplicate remote mutations | Did multiple retry layers act on a non-idempotent request? |
| Tests hang at teardown | Who owns and closes the client or local server? |

## Completion evidence

Record the selected ownership boundary, timeout source, retry classification, focused protocol
tests, original user scenario, and cleanup observation. Stop and request direction if the change
requires new credentials, global proxy or trust-store changes, a dependency migration, or access
to production-only traffic.
