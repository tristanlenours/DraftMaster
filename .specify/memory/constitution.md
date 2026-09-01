<!--
Sync Impact Report
- Version change: unratified template -> 1.0.0
- Added principles: Specification Before Implementation; Risk-Based Test-First;
  Auditable and Versioned Domain Engine; Human-Governed AI Delivery; User Quality
- Added sections: Product and Quality Constraints; Delivery Workflow and Gates
- Removed from active governance: legacy fixed scoring weights, 90-second target,
  Slack/Admin requirements, and the unsupported Untapped 1-53+ claim
- Follow-up TODOs: none
-->

# DraftMaster Constitution

## Core Principles

### I. Specification Before Implementation

Every product change MUST begin with a GitHub Issue linked to its Spec Kit artifacts. A feature
MUST complete `specify`, `clarify`, `plan`, `checklist`, `tasks`, and `analyze` before
implementation starts. Requirements MUST describe observable behavior and acceptance criteria;
technical choices belong in the plan. When artifacts disagree, work stops and the conflict is
fixed at its source before code changes continue.

### II. Risk-Based Test-First

Domain rules, scoring, bots, Homologation, trophies, pack rotation, and bug fixes MUST start with
an automated test that fails for the intended reason. Critical user journeys MUST have integration
or end-to-end scenarios defined before implementation. Visual work MUST include documented mobile
and desktop verification plus behavioral tests where practical. Coverage percentages are signals,
not targets; every critical invariant, boundary, and regression MUST be covered.

### III. Auditable and Versioned Domain Engine

Scoring and bot decisions MUST be deterministic when given the same inputs, configuration, and
random seed. Every evaluation MUST identify the engine version, data provenance, score breakdown,
and material bonus or penalty factors. Reference drafts MUST be replayable in tests. A Résultat
verrouillé is immutable and retains its original engine version; recalculation creates a separate
derived evaluation. Records from incompatible engine versions MUST NOT be mixed. Opaque external
models MUST NOT determine a homologated result.

### IV. Human-Governed AI Delivery

Functional work MUST occur on a dedicated branch and enter `main` through a pull request linked to
its Issue and specification. The agent MUST report important decisions, trade-offs, tests, and known
limitations. Required CI checks and a Standards + Spec review MUST pass. A human MUST approve the
pull request; an agent MUST NOT merge its own functional change without an explicit instruction.

### V. User Quality

Critical flows MUST work on a 360 px-wide mobile viewport and remain keyboard-operable on desktop.
Meaning MUST NOT rely on color alone, controls MUST have accessible names, and content MUST meet
the project's contrast standard. Drafting MUST remain functional without a network dependency once
its data is loaded. Each feature plan MUST define measurable accessibility, responsiveness, and
performance acceptance criteria appropriate to its risk.

## Product and Quality Constraints

- The first milestone is the Solo Draft Coach defined in `CONTEXT.md`. Multiplayer drafting,
  Swiss tournaments, Slack integration, and Admin Studio are outside this milestone.
- Coaching removes Homologation irreversibly. Analyse rétrospective is available only after the
  deck and Résultat verrouillé are complete.
- The Wall of Records uses the five-axis Score de deck only. Historical scores remain associated
  with their engine version.
- Lighthouse CI MUST run three mobile-profile measurements on representative critical routes.
  The median Performance score MUST be at least 80, with 90 as the normal target. Accessibility
  MUST be at least 95 and Best Practices at least 90. SEO is informational for this milestone.
- Performance optimization beyond the agreed budgets is optional; accessibility and functional
  correctness remain blocking.
- Secrets MUST remain outside version control. Generated data MUST retain its source, license,
  generation method, and version.

## Delivery Workflow and Gates

1. Qualify the GitHub Issue and mark it `ready-for-agent` only when its scope and acceptance
   criteria support autonomous work.
2. Create a feature branch and complete the Spec Kit quality path. Custom checklists are owned by
   the human reviewer and MUST NOT be self-approved by the implementation agent.
3. Implement in red-green-refactor slices for domain behavior and reproducible regressions.
4. Open a pull request containing linked artifacts, test evidence, visual evidence when relevant,
   and an explicit account of remaining risk.
5. Required gates MUST pass: formatting/linting, static analysis/types, unit tests, integration
   tests, affected end-to-end journeys, secret and dependency checks, Spec Kit analysis, and visual
   QA where applicable.
6. A red required gate blocks merge. Any exception requires a documented constitution amendment;
   silent waivers are forbidden.
7. After implementation, `converge` MUST compare code with the approved artifacts. Remaining work
   returns to `tasks.md` instead of being declared complete.

## Governance

This constitution supersedes conflicting repository practices and the archived legacy constitution.
Amendments require a dedicated pull request explaining the trade-off, migration impact, and semantic
version change. MAJOR versions remove or redefine a governing promise, MINOR versions add or
materially expand one, and PATCH versions clarify wording without changing obligations.

Every specification, plan, task set, review, and pull request MUST demonstrate compliance. Reviewers
MUST reject unjustified complexity, unauditable scoring, untested critical behavior, mixed engine
versions, or undocumented quality-gate exceptions. Operational guidance lives in `AGENTS.md`, domain
language in `CONTEXT.md`, and durable architectural trade-offs in `docs/adr/`.

**Version**: 1.0.0 | **Ratified**: 2026-09-01 | **Last Amended**: 2026-09-01
