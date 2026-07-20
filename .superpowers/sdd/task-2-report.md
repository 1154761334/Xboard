# Task 2 Report: Secure Download Frontend and Persistent Asset Mount

## Status

Completed. The secure download launcher is served as a versioned plugin asset, injects one `安全下载` action beside existing subscription controls (with a token-gated fallback), and calls only the authenticated plugin endpoint. It does not accept or read a subscription URL.

## Commit

`5bf88f6ee2f2f2d213bc52906c920ddcab87c10b` (`feat: add secure sub-fetcher launcher`)

## Changed Files

- `plugins/SubFetcher/resources/assets/sub-fetcher.js`
- `plugins/SubFetcher/custom_html.txt`
- `compose.yaml`

## Tests and Verification

- Red: `node --test tests/contract/sub-fetcher-contract.test.mjs` failed before implementation because the launcher asset and Compose mount were absent (2 failures).
- Green: `node --test tests/contract/sub-fetcher-contract.test.mjs` passed after implementation (6/6 tests).
- `node --check plugins/SubFetcher/resources/assets/sub-fetcher.js` passed.
- `docker compose config --quiet` passed.
- `git diff --check` passed before commit.

## Concerns

- Production deployment was not performed, per task scope.
- Live browser verification on an authenticated Xboard subscription page remains for the deployment/real-verification task; contract, syntax, and Compose validation are complete.

## Review Remediation

### Status

Completed. In-memory configuration and in-flight requests are now invalidated when the current access token changes, including logout and account switches. Stale responses cannot repopulate or remove entries for a newer session. Configuration content remains memory-only.

`复制配置` now falls back to `document.execCommand('copy')` when the Clipboard API is unavailable, insecure, or rejects its write request.

### Commit

`ed34c475285b23a8ef6c6782ac34fd2c78931cb9` (`fix: scope sub-fetcher cache to access token`)

### Changed Files

- `plugins/SubFetcher/resources/assets/sub-fetcher.js`
- `tests/contract/sub-fetcher-contract.test.mjs`

### Tests and Verification

- `node --test tests/contract/sub-fetcher-contract.test.mjs` passed (6/6).
- `node --check plugins/SubFetcher/resources/assets/sub-fetcher.js` passed.
- `docker compose config --quiet` passed.
- `git diff --check` passed.

### Concerns

- Production deployment and authenticated browser verification remain outside this review-fix scope.
