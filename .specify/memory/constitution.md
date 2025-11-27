<!--
Sync Impact Report

Version change: 2.1.0 -> 2.2.0

Modified principles:
- Code Quality & Maintainability (unchanged)
- User Experience Consistency (unchanged)  
- Performance & Scalability (unchanged)
- Observability, Versioning & Simplicity (unchanged)
- Development Environment & Platform Requirements (expanded with standardized scripts requirement)

Added sections:
- Standardized Development Scripts & Workflow

Removed sections:
- None

Templates requiring updates:
- .specify/templates/plan-template.md ✅ updated (added standardized scripts gate)
- .specify/templates/spec-template.md ✅ updated (added script validation requirements)
- .specify/templates/tasks-template.md ✅ updated (added constitution compliance section with scripts)
- docs/scripts.md ✅ created (comprehensive script documentation)

Follow-up TODOs:
- ✅ Update templates to reference standardized scripts in validation steps
- Ensure all future development tasks use the standardized script commands
- Update CI/CD when implemented to use root-level scripts
-->

# Streamforge Constitution

## Core Principles

### Code Quality & Maintainability
Code and architecture MUST be easy to read, reason about, and modify. Concretely:
- Prefer small, single-responsibility modules and functions.
- Public interfaces MUST be documented and stable; internal APIs should be clearly labeled as internal.
- All code MUST pass linting and static analysis configured in the project; critical issues MUST be fixed before merge.
Rationale: High maintainability reduces onboarding cost and prevents technical debt accumulation.

<!-- Test-First & Continuous Testing principle was intentionally removed per ratification.
	For rapid prototyping, tests may be deferred; teams MUST record a testing backlog,
	identify risks, and include a remediation plan for when the project moves to
	stabilization. This preserves traceability without mandating tests during initial
	prototyping. -->

### User Experience Consistency
User-facing behavior and UI/UX MUST be consistent across features. Concretely:
- Design/interaction patterns MUST follow documented style guidelines or a reference quickstart (components, wording, error handling).
- Accessibility basics (keyboard navigation, semantic markup, contrast) MUST be considered for public UI changes.
- UX changes that affect user journeys MUST include acceptance criteria and usability test notes in the spec.
Rationale: Consistent UX reduces user confusion and support overhead.

### Performance & Scalability
Performance goals MUST be explicit and testable. Concretely:
- Features MUST state expected performance targets (latency, throughput, memory) in the plan/spec.
- Performance-critical paths MUST include benchmarks or load tests; regressions are gated in CI for designated performance tests.
- Changes that increase resource usage (CPU, memory, bandwidth) MUST include mitigation or capacity plans.
Rationale: Prevents regressions at scale and keeps user experience acceptable as load grows.

### Observability, Versioning & Simplicity
Systems MUST be observable and versioned predictably. Concretely:
- Production services MUST emit structured logs and metrics and include health checks and useful error messages.
- Release artifacts MUST follow semantic versioning for public APIs; breakages MUST be communicated and handled with migration guidance.
- Prefer simplicity: avoid premature optimization and heavy abstractions unless justified and reviewed.
Rationale: Observability speeds incident response; semantic versioning reduces integration risk.

### Development Environment & Platform Requirements
The development environment and tooling MUST be consistent and platform-appropriate. Concretely:
- All development is performed on Windows systems; all commands and scripts MUST be PowerShell-compatible.
- For JavaScript and TypeScript projects, Bun MUST be used as the package manager and runtime (e.g., `bun install`, `bun dev`, `bun build`).
- Documentation and setup instructions MUST include Windows-specific paths and PowerShell syntax.
- CI/CD pipelines and local development scripts MUST work with PowerShell; avoid Unix-specific commands unless wrapped in platform detection.
Rationale: Ensures consistent development experience across the team and leverages Bun's performance benefits for faster iteration cycles.

### Standardized Development Scripts & Workflow
All development operations MUST use the project's standardized root-level scripts to ensure consistency and eliminate directory navigation complexity. Concretely:
- Development tasks MUST use root-level scripts: `bun run dev`, `bun run build`, `bun run test`, `bun run lint`.
- Advanced workflows MUST use PowerShell functions from `scripts.ps1`: `Start-FullStack`, `Build-Backend`, `Show-Status`.
- New developer onboarding MUST use `setup.ps1` for automated environment preparation.
- All validation and quality gates MUST be executable from project root without directory changes.
- Future tooling and CI/CD MUST integrate with and extend the standardized script interface.
Rationale: Eliminates cognitive overhead of directory navigation, provides consistent interface for all operations, and ensures reproducible development environment across team members.

## Constraints & Non-Functional Requirements
The project enforces the following non-functional constraints unless an exception is approved by maintainers:
- Security: Secrets MUST not be checked into source. Credentials MUST be stored in approved secret stores.
- Performance: Performance goals declared per feature. Default expectations: p95 latency targets documented in plan/spec where applicable.
- Stack: No mandatory vendor lock-in; prefer widely adopted tooling; specific stacks MUST be declared in feature plans.

## Development Workflow & Quality Gates
All work flows through pull requests with these quality gates:
- PRs MUST include a descriptive summary, linked spec/plan, and changelog when applicable.
- CI checks MUST pass: linters, unit tests, integration tests, and any declared performance or security checks.
- All quality gates MUST be executable via standardized scripts from project root (e.g., `bun run lint`, `bun run test`, `bun run type-check`).
- Reviews: At least two reviewers required for production-impacting changes; one reviewer MAY be a maintainer for small fixes.
- Releases: Follow semantic versioning; breaking changes MUST include migration notes and a migration plan.

## Governance
The constitution is the guiding document for development practices. Amendments and governance rules:
- Amendments: Changes to this constitution are made via a documented PR. The PR MUST include: the proposed text, rationale, and a migration or compliance plan for affected artifacts.
- Approval: Amendments require at least two approvers from the maintainers group and passing CI. For major governance changes, a public announcement (changelog/meeting note) is required.
- Versioning policy: We use semantic versioning for the constitution itself — MAJOR for incompatible governance changes, MINOR for adding or expanding principles, PATCH for clarifications and non-semantic edits. The current amendment increments the constitution to 2.2.0.
- Compliance reviews: Periodic reviews (at least annually) SHOULD be scheduled to ensure the constitution remains fit for purpose.

**Version**: 2.2.0 | **Ratified**: 2025-11-11 | **Last Amended**: 2025-11-12

