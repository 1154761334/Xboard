# Task 1 Report: SubFetcher plugin backend

## Status

Completed within the Task 1 backend scope and committed on the `deploy` branch.

## Commit

`bb487109eecb0ba8fa190bbc3adb182491c4f943` (`feat: add secure subscription fetcher plugin backend`)

## Changed files

- `plugins/SubFetcher/config.json`
- `plugins/SubFetcher/Plugin.php`
- `plugins/SubFetcher/routes/api.php`
- `plugins/SubFetcher/Controllers/SubFetcherController.php`

## Implementation summary

- Declares the `sub_fetcher` feature plugin at version `1.0.0`, requiring Xboard `>=1.0.0`, with exactly `clash`, `v2ray`, `singbox`, and `surge` clients.
- Registers the authenticated, rate-limited `POST /api/v1/plugin/sub-fetcher/config` route.
- Rejects any request fields other than `client` and validates `client` against a strict allowlist, returning Laravel validation responses (`422`) for unsupported clients.
- Creates a synthetic, user-bound request with a fixed client-specific User-Agent and calls `ClientController::subscribe()` in-process.
- Returns the generated response body with a fixed attachment filename, `Cache-Control: no-store`, safe content type, and only the allowed subscription headers.
- Returns a generic `500` response for unexpected generation failures and does not log sensitive subscription data.

## Tests and verification

### RED (before implementation)

Command:

```sh
node --test tests/contract/sub-fetcher-contract.test.mjs
```

Result: exit `1`; all five subtests failed. The first three failures were expected `ENOENT` errors because the required plugin files did not exist. The remaining two failures were for frontend/compose artifacts outside Task 1 scope.

### GREEN check (after implementation)

Command:

```sh
node --test tests/contract/sub-fetcher-contract.test.mjs
```

Result: exit `1`; backend subtests 1-3 passed and subtests 4-5 remained failing:

```text
# pass 3
# fail 2
```

The remaining failures require the Task 2 frontend launcher file (`plugins/SubFetcher/resources/assets/sub-fetcher.js`) and compose/custom HTML integration. Task 1 explicitly prohibits creating those files or changing compose/custom HTML.

### PHP syntax lint

Commands attempted:

```sh
php -l plugins/SubFetcher/Plugin.php
php -l plugins/SubFetcher/routes/api.php
php -l plugins/SubFetcher/Controllers/SubFetcherController.php
```

Result: PHP is not installed in this checkout (`zsh: command not found: php`), so syntax linting could not run.

### Diff validation

Command:

```sh
git diff --cached --check
```

Result: exit `0`; no whitespace errors before commit.

## Concerns

- The supplied contract test covers Task 2 frontend and compose requirements in addition to Task 1. Its overall command therefore remains non-zero despite all backend assertions passing.
- This repository is a deployment-only branch. Compatibility was checked against the upstream Xboard `master` source fetched from `origin`, but runtime integration could not be exercised locally because the Xboard image and PHP executable are absent.

---

# Review Fix Report

## Status

Review findings fixed and committed on the `deploy` branch.

## Commit

`538b79578cca39b8810bc8ab89141d17467b2a8d` (`fix: harden sub-fetcher request handling`)

## Changed files

- `plugins/SubFetcher/Controllers/SubFetcherController.php`
- `tests/contract/sub-fetcher-contract.test.mjs`

## Fixes

- Preserves `App\Services\Plugin\InterceptResponseException` responses by returning the controlled response before the generic `Throwable` handler.
- Requires a JSON request body, rejects query and form input, and validates `Validator::make($request->json()->all(), ...)` rather than Laravel's merged request inputs.
- Keeps `subscription-userinfo` and `profile-update-interval` whenever their value is present, including `0`.
- Extends the backend contract checks for all three findings.

## Tests and verification

### Focused backend contract

Command:

```sh
node --test --test-name-pattern='plugin|controller' tests/contract/sub-fetcher-contract.test.mjs
```

Output: exit `0`; `pass 4`, `fail 0`.

### Full contract

Command:

```sh
node --test tests/contract/sub-fetcher-contract.test.mjs
```

Output: exit `1`; `pass 4`, `fail 2`. The failures are unchanged Task 2 checks: the absent `plugins/SubFetcher/resources/assets/sub-fetcher.js` launcher and missing compose integration.

### PHP lint

Command:

```sh
php -l plugins/SubFetcher/Controllers/SubFetcherController.php
```

Output: exit `127`; `php` is not installed. The configured Xboard Docker image is also not present locally (`docker image inspect ghcr.io/cedar2025/xboard:latest`: exit `1`), so container lint could not run without downloading the runtime.

### Diff check

Command:

```sh
git diff --check
git diff --cached --check
```

Output: both exit `0`; no whitespace errors.

## Concerns

- Full contract remains non-zero solely for the two out-of-scope Task 2 artifacts.
- PHP runtime lint and in-framework integration tests remain unavailable locally because neither PHP nor the Xboard image is installed.

---

# P1 Follow-up: Intercepted Response Download Handling

## Status

Completed. Intercepted subscription responses now flow through the same controlled download response builder as ordinary subscription responses.

## Changed files

- `plugins/SubFetcher/Controllers/SubFetcherController.php`
- `tests/contract/sub-fetcher-contract.test.mjs`

## Tests and verification

### RED

```sh
node --test --test-name-pattern='plugin|controller' tests/contract/sub-fetcher-contract.test.mjs
```

Result: exit `1`; `pass 3`, `fail 1`. The controller did not call `downloadResponse($exception->getResponse(), self::CLIENTS[$client])` for `InterceptResponseException`.

### GREEN

```sh
node --test --test-name-pattern='plugin|controller' tests/contract/sub-fetcher-contract.test.mjs
```

Result: exit `0`; `pass 4`, `fail 0`.

## Concerns

- No PHP runtime lint was run for this one-line follow-up because the local checkout still has no PHP executable, as recorded above.
