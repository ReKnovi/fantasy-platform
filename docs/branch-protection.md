# Branch Protection

Recommended settings for `main` once the repository is hosted on GitHub:

- Require a pull request before merging.
- Require at least one approval for production-impacting changes.
- Require status checks to pass before merging:
  - `Quality / Repository Quality Gate`
  - `CodeQL / Analyze (javascript-typescript)`
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Block force pushes.
- Block branch deletion.
- Restrict who can bypass required checks.

Keep `Deploy Firebase` manual-only until Blaze is enabled and Firebase deploy
credentials are configured in GitHub.
