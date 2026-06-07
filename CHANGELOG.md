# Changelog

All notable changes to Copilot-swarm (CSW) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - unreleased

First release. A native GitHub Copilot CLI plugin.

### Added
- Repository scaffold and packaging metadata (`package.json`, `LICENSE`, `CHANGELOG`).
- Forbidden-token scanner (`scripts/scan-forbidden.mjs`) gating tracked, packable,
  and `npm pack` tarball surfaces — the release-cleanliness oracle.

_Further milestones (plugin skeleton, swarm dispatch MCP, goal runtime, planning
and executor skills, steering, review orchestrator, supporting hooks, install UX)
are tracked in `plans/0001-csw-port.md` and appended here as they land._
