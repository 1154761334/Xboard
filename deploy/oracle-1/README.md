# Oracle-1 Xboard Deployment Notes

This directory keeps the production deployment layer separate from upstream
Xboard application code.

## Branch Model

- `master`: tracks upstream `cedar2025/Xboard` application code.
- `deploy`: current production deployment branch.
- `backup/deploy-20260703`: immutable backup of the production deployment branch before the 2026-07-03 sync.
- `deploy-next-20260703`: upstream application code plus deployment notes and candidate compose files.

## Files

- `compose.current.yaml`: snapshot of the current production compose layout.
- `compose.next.yaml`: candidate compose for testing the new upstream image and process model.
- `nginx/zagzag.global.conf`: current production reverse-proxy layout.
- `DEPLOY.current.md`: current deployment guide snapshot.

Do not commit real `.env`, database files, storage logs, private keys, node
secrets, API tokens, or subscription URLs.

## Upgrade Approach

Test `compose.next.yaml` in a separate directory and bind it to a non-production
port first. Confirm admin login, subscriptions, node API sync, websocket server
behavior, plugins, and database migrations before replacing production.

