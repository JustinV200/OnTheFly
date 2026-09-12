# Coding Rules

Mandatory for every file created or edited in this repo, frontend or backend. These rules are about *structure and legibility only* — they say nothing about what this project does. They exist so a codebase several people are editing in parallel stays navigable: small modules, an obvious home for every new file, and comments that explain intent rather than syntax.

## 1. Small, single-purpose files

- **One responsibility per file.** A file that does two unrelated things gets split, even under time pressure. A component that renders *and* fetches *and* transforms data becomes three files: the component, a data hook, a transform function.
- **A file should be readable in one screenful of scrolling.** Past roughly 200 lines, ask what's hiding in there that wants to be its own module. Length is a symptom, not the problem — but it's a reliable symptom.
- **One primary export per file**, named to match the file. Helpers private to that export stay in the file; the moment a second file needs one, it moves out into its own.
- **No god files.** No `utils`, `helpers`, `types`, `constants`, or `common` catch-all at the root of a feature. If you're about to add a fourth unrelated function to a shared file, that file has become a folder.

## 2. Modular design

- **Group by feature first, by concern second.** A feature owns its components, hooks, API calls, and types. Don't shard one feature across four top-level `components/` `hooks/` `api/` `types/` directories.
- **Code against interfaces, not implementations.** Wherever two implementations of one capability exist — or plausibly will — define the interface in its own module and keep each implementation in its own file. Nothing outside that module's folder imports a concrete implementation; only the composition point that wires it up does.
- **Keep layers explicit.** Route and endpoint handlers stay thin: parse input, call a service, shape the response. Business logic lives in service modules that know nothing about HTTP or the UI framework. External-service calls (AI, third-party APIs, email) live behind their own module rather than inline in a handler or component.
- **No hidden coupling.** A module reaches another module through its public exports only. Importing a private internal path from outside that module's folder is a bug even when it works.
- **Dependencies point one direction.** Features may depend on shared code; shared code never depends on a feature. If you need a cycle, the boundary is wrong.

## 3. Frequent use of subfolders and packages

Prefer more, smaller folders over fewer, bigger ones.

- **When a folder passes ~5–7 files, split it by concern.** Do it at the moment you notice, not later.
- **Before adding a file, decide which folder owns it** and whether that folder needs a split first. Don't default to dropping it at the nearest existing top level.
- **Single-consumer code lives with its consumer.** A component, hook, type, or helper used by exactly one feature belongs inside that feature's folder. Promote it to shared only once a *second* feature genuinely needs it — not in anticipation of one.
- **Each folder has one reason to exist**, and its name says what that is. A folder you can't name without "misc," "other," or "stuff" isn't a real boundary.
- **A new folder mirrors the existing convention** rather than inventing a parallel one. If you think the convention is wrong, change it everywhere or not at all.
- **Packages get an explicit public surface** — an index/`__init__` that re-exports what's intended for outside use. What isn't exported there is internal.

## 4. Comments — frequent, and purposeful

Comment generously here. The bar is deliberately different from a mature production codebase: assume the next reader is seeing the file for the first time, in a hurry, without the design doc open.

- **Every file doing non-trivial work opens with a 1–3 line comment** stating what it's responsible for and, where it matters, what it deliberately does *not* do.
- **Every exported function gets a short comment**: what it does, what it assumes about its inputs, and anything non-obvious about the return value.
- **Every non-obvious line or block gets a comment explaining the *why*, not the *what*.** `// loop over items` is noise. `// input is already sorted by score upstream, so the first N are the ones to flag` is useful.
- **Every point where one of several implementations is selected** gets a comment saying which is active and why (env var, fallback, ordering).
- **Every workaround, hack, or deliberate scope cut gets a comment linking to the reason** — cite the design doc section when the reason is recorded there. An undocumented shortcut will be "fixed" by someone who doesn't know it was intentional.
- **Comments describe intent and constraints, not syntax.** If a comment restates the line below it, delete one of them.
- **A stale comment is worse than no comment.** Changing the code means changing the comment in the same edit.

This is a deliberate departure from "self-documenting code needs no comments." Under time pressure, the comment is often the only handoff a teammate gets.

## 5. Formatting

- **Match the file you're in.** Existing indentation, quote style, import ordering, and naming win over personal preference, always.
- **One formatter and one linter per language, config committed, defaults preferred.** Formatting is not a thing to have opinions about; run the tool.
- **Never reformat code you didn't otherwise change.** Mixed formatting-and-logic diffs are unreviewable. Do a formatting pass as its own commit if it's needed.
- **Imports grouped and ordered consistently**: standard library, then third-party, then local — separated by blank lines, alphabetized within each group.
- **Names say what a thing is, not how it's implemented.** Full words over abbreviations; the loop index is the one exception.
- **Booleans read as assertions** (`is_`, `has_`, `should_`). Functions with side effects read as verbs.
- **Use blank lines to group related statements** inside a function. If you need more than three or four such groups, you're looking at more than one function.

## 6. General strictness

- **Type everything.** No untyped escape hatches (`any`, bare `dict`, implicit `Object`) without a comment justifying why. Types on every function signature, including the return.
- **Validate at boundaries.** Anything crossing an API, queue, file, or third-party edge is parsed into a declared schema before use. Inside those boundaries, trust the types.
- **No silent failure.** Catch specific errors, never bare `except:` or empty `catch {}`. If something is unreachable or unavailable, surface that state rather than substituting a default that looks like success.
- **Fail loudly in development, degrade visibly in production.** A fallback value that hides a broken dependency is worse than an error.
- **Config through environment variables, read once, in one module.** Thread values through as arguments; never re-read env or re-branch on it ad hoc across the codebase. No credentials in source, ever.
- **No commented-out code.** Version control remembers it. Delete it.
- **Leave `TODO` only with a name and a reason**, or don't leave it.
