# UI/UX Pro Max — vendored skill provenance

| | |
|---|---|
| Upstream | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| Pinned commit | `28b3b8dee8c976df4fa3e94aed4e092ad43fcb03` (2026-10-26, "fix: don't read '3d'/'2fa' after a stack name as a framework version (#548)") |
| Upstream version | 2.15.0 (`skill.json` at that commit) |
| License | MIT, Copyright (c) 2024 Next Level Builder. Full text in `LICENSE` (copied unchanged from the upstream root). |
| Installed | 2026-10-29, Phase 2, as a version-controlled **project-level** Claude Code skill |

## What was copied

From upstream `.claude/skills/ui-ux-pro-max/` (byte-identical to upstream `src/ui-ux-pro-max/` at the pinned commit):

- `SKILL.md` (patched, see below)
- `data/` (CSV and JSON design knowledge base), `references/`
- `scripts/core.py`, `design_system.py`, `reasoning_contract.py`, `search.py`, `validate_data.py`

Not copied: upstream `scripts/tests/` and fixtures, the sibling skills (banner-design, brand, design, design-system, slides, ui-styling), the npm CLI, gallery, templates, and CI files.

## Review notes

- Python 3 standard library only; no third-party packages; no network access, no `subprocess`, no `eval`/`exec`.
- Reads only its own `data/`. Writes files only with `--persist` (into a `design-system/` folder); the DreamCart note in `SKILL.md` forbids that for this repository.
- No setup script was executed. The upstream installer (`npx ui-ux-pro-max-cli init`) downloads from GitHub and was deliberately not used.

## Local patches (DreamCart)

1. Script path: 11 occurrences of `"${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py"` replaced with the project-relative `.claude/skills/ui-ux-pro-max/scripts/search.py`, and the sentence introducing it adjusted. `CLAUDE_PLUGIN_ROOT` is only set for plugin installs, so the original path does not resolve for a project-level skill.
2. A "DreamCart project note" after the title: the skill is advisory; DreamCart's approved direction (`docs/PRD.md` section 3, `docs/UX_SPEC.md`, ADRs) overrides its recommendations; no `--persist` into the repository; no fabricated marketplace signals.

## Verification (2026-10-29, Claude Code 2.1.312, cloud container)

- A fresh headless session started in the repository root listed the skill (`ui-ux-pro-max`, description "UI/UX design intelligence for web, mobile, and desktop.").
- A fresh session invoked the skill and ran `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "keyboard focus modal" --domain ux -n 1` successfully.
- Skills are loaded when a session starts, so a session that was already running before installation does not see it.

## Usage

From the repository root:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux -n 3
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system -p "DreamCart"
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack nextjs
```

## Updating

1. Clone upstream at the new commit and review the diff of `SKILL.md`, `scripts/`, and `references/` (look for network, subprocess, or file-write changes).
2. Copy the same file set, reapply the two patches, keep `LICENSE`.
3. Repeat both verification steps in a fresh session, then update this file.
