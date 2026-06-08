# Capture Workflow

Drop arbitrary input into `inbox/raw/` (or `thinking/` with `--thinking`).
Pure capture — no classification, no frontmatter, no entity ripple.

## Input shapes

| Shape | Detection | Pre-processing |
|---|---|---|
| URL | Starts with `http://` or `https://` | `defuddle <url>` → clean markdown |
| File path | `--file <path>` flag, or arg is an existing readable file | Read file contents verbatim |
| Freeform text | Anything else | Use as-is |

## Steps

1. **Detect input shape** as above.
2. **Generate slug:**
   - Title source: first H1 in content → first 60 chars of content → `untitled`.
   - Slug = `<YYYY-MM-DD>-<lowercase-kebab-of-title>`.
   - If a file with the same slug exists, append `-<n>` until unique.
3. **Resolve target dir:**
   - Default: `${repoRoot}/inbox/raw/`
   - With `--thinking`: `${repoRoot}/thinking/`
4. **Write file** at `<target>/<slug>.md`. Content is the raw input (no frontmatter).
5. **Log the event:**
   ```
   bun .claude/skills/SecondBrain/Tools/IngestLog.ts \
     --action capture \
     --source-note inbox/raw/<slug>.md
   ```
6. **Report** the file path to the user.

## Optional structuring — 10-category observation taxonomy

Capture is pure by default. When the input is messy or the user wants
downstream processing to be easier, structure observations with `[category]`
prefixes. **Don't force categories** — if the input is a single thought or a
clean URL, plain text is fine.

Merged taxonomy (SecondBrain BrainDump categories + 10 typed observation
categories from the migrated capture workflow):

| Category | Meaning |
|---|---|
| `[fact]` | Objective, verifiable information |
| `[idea]` | Subjective concepts, hypotheses |
| `[decision]` | Commitments, choices made |
| `[technique]` | Methods, processes, tactics |
| `[requirement]` | Constraints, dependencies |
| `[question]` | Open inquiries to investigate |
| `[insight]` | Realizations, pattern recognition |
| `[problem]` | Issues, pain points |
| `[solution]` | Fixes, workarounds |
| `[action]` | Task items |
| `[observation]` | Neutral noticing — pre-classification |
| `[todo]` | Action item with `#todo` tag |
| `[note]` | Generic note, no other category fits |
| `[bookmark]` | Save-for-later link or reference |
| `[quote]` | Verbatim quoted text |
| `[risk]` | Threat or downside to flag |
| `[learning]` | Lesson extracted from experience |
| `[gripe]` | Frustration / pain point worth keeping |

Other category names are accepted verbatim — the taxonomy is open. For
*atomic* extraction (one file per `[category]` block) use `/brain-dump`; this
workflow preserves the original input as a single file.

## Destination — inbox vs. thinking/

Default destination is `inbox/raw/`. The `--thinking` flag routes to
`thinking/` instead — use it when the input is a reasoning scratchpad rather
than something to process and distribute.

Heuristics (infer when not specified):

| Input feel | Destination |
|---|---|
| URL, file, bookmark, quote, freeform note | `inbox/raw/` (default) |
| Reasoning walk, "let me think through X", working out a decision | `thinking/` |
| User explicitly asks for thinking/ | `thinking/` |

When inferring, surface the choice to the user before writing — *"Capturing
this to `thinking/`, sound right?"* — so the routing is auditable.

## Edge cases

- **URL with auth wall / paywall** → `defuddle` may return empty. Fall through to writing the URL itself as the body; tag `tags: [needs-retrieval]` later in `/process`.
- **Binary file given via --file** → reject with a message. Capture is markdown-only.
- **Empty input** → reject; nothing to capture.

## Not this workflow's job

- Frontmatter generation (`/process` does that).
- Classification / routing (`/quick-dump` or `/save` if you want one-shot).
- Wikilink resolution.
- Voice notification (DA does that at the response layer).
