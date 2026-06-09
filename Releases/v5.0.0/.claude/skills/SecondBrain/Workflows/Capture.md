# Capture Workflow

Drop arbitrary input into `inbox/raw/` (or `thinking/` with `--thinking`).
Pure capture — no classification, no entity ripple. Writes a minimal
frontmatter block carrying only `status:`, `source:`, `discovered:`, `tags:`
so the note enters the lifecycle in a known state; `/process` fills in
`type:` and the rest.

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
3. **Resolve target dir + status:**
   - Default: `${repoRoot}/inbox/raw/`, `status: unprocessed`
   - With `--thinking`: `${repoRoot}/thinking/`, `status: thinking`
4. **Write file** at `<target>/<slug>.md` with this minimal frontmatter
   followed by the raw input as the body (run `date +"%Y-%m-%d %I:%M %p"`
   for `discovered:`):
   ```yaml
   ---
   status: <unprocessed|thinking>
   source: <url|file:path|capture>
   discovered: <local YYYY-MM-DD HH:MM AM/PM>
   tags: [capture]
   ---

   <raw input body>
   ```
   No `type:` — `/process` classifies. No further fields.
5. **Validate the write (enforce):**
   ```
   bun .claude/skills/Qmd/Tools/LintFrontmatter.ts <target>/<slug>.md --enforce
   ```
   On non-zero exit, surface the linter output, leave the file in place for
   inspection, and halt. (Per plan: the pipeline never ships a bad-state note.)
6. **Log the event:**
   ```
   bun .claude/skills/SecondBrain/Tools/IngestLog.ts \
     --action capture \
     --source-note inbox/raw/<slug>.md
   ```
7. **Report** the file path to the user.

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

- Classification (`type:`) — `/process` does that.
- Routing to a domain (`/quick-dump` or `/save` if you want one-shot).
- Wikilink resolution.
- Voice notification (DA does that at the response layer).

Capture writes only the lifecycle-minimum frontmatter (`status:`, `source:`,
`discovered:`, `tags:`) so the note enters the pipeline in a known state.
The rest is filled in later.
