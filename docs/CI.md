# CI pipeline

Workflows live in `.github/workflows/`. All run on pull requests; `ci.yml` also runs on push to `main`.
Permissions default to `contents: read`; third-party actions are pinned to commit SHAs (Renovate keeps them current).

| Job | Tool | Local equivalent |
| --- | --- | --- |
| `quality` | pnpm + Turborepo (cached) | `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build` |
| `secrets` | gitleaks, full history, `.gitleaks.toml` | `gitleaks detect --config .gitleaks.toml` |
| `sast` | Semgrep p/typescript, p/nextjs, p/secrets, p/owasp-top-ten; fails on ERROR | `semgrep scan --config p/typescript --config p/nextjs --config p/secrets --config p/owasp-top-ten --severity ERROR --error .` |
| `deps` | `pnpm audit` | `pnpm audit --audit-level=high --prod` |
| `trivy` | Trivy filesystem scan, HIGH/CRITICAL, unfixed ignored | `trivy fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .` |
| CodeQL (`codeql.yml`) | javascript-typescript, `security-extended`; also weekly | GitHub-hosted only |

## Notes

- Postgres/Redis service containers are not provisioned yet; E-03 adds DB integration tests.
- The Semgrep container image is not digest-pinned yet (`TODO pin SHA` in `ci.yml`).
- `gitleaks-action` needs a `GITLEAKS_LICENSE` secret if the repo is owned by an organisation.
- Renovate (`renovate.json`): weekly, before 06:00 Monday Africa/Nairobi, non-major devDependencies grouped, automerge off.
- Make these jobs required status checks on `main` in branch protection.
