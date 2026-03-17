# mTarsier — Claude Code Instructions

See [AGENTS.md](./AGENTS.md) for full project guide, architecture, conventions, and key file paths.

## Quick Rules

- Do not use `unwrap()` in Rust — use `?` or `map_err`
- Do not hardcode hex colors — use Tailwind CSS variable tokens
- Do not add a new Tauri command without registering it in both `commands/mod.rs` and `lib.rs`
- Keep React components under 150 lines
- `src-tauri/binaries/` is gitignored — never commit compiled binaries
- Branch names must follow `<type>/<description>` — see AGENTS.md for the full prefix list (`feature/`, `fix/`, `perf/`, `refactor/`, `chore/`, `docs/`, `test/`, `release/`)
