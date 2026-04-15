# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.7] - 2026-04-15

### Added
- **Remote URL Embeds**: The `file` attribute now accepts any `http://` or `https://` URL. The extension fetches the content at embed-update time, follows up to 5 redirects, and enforces a 10-second timeout. Region and line-range attributes work identically on remote content. Useful for embedding from GitHub raw links, gists, or any public source.
- **Copy Embed Tag command** (`markdown-embed.insertEmbedTag`): Right-click anywhere in a non-Markdown source file to copy a ready-to-paste embed tag to the clipboard. The command auto-detects context: if the cursor is inside a `#region` block the tag uses `region="name"`; if lines are selected the tag uses `line="start-end"`; otherwise it embeds the whole file. The file path is computed relative to the workspace root.
- **Update All Embeds in Workspace command** (`markdown-embed.updateWorkspace`): Scans every `*.md` file in the workspace (excluding `node_modules`), applies all pending embed updates, and saves each modified file. Reports the total number of embeds refreshed.
- **Stale Detection**: After a Markdown document is opened or saved, the extension asynchronously compares each embed's current content against what the source file would produce. Embeds whose content is out-of-date gain a `⚠ Stale` CodeLens button above the tag — clicking it updates that single embed immediately. Locked embeds are never marked stale.
- **`indent` attribute**: Adds a fixed number of spaces to the start of every output line (source link, code fence, and content). Accepts an integer: `indent="4"`. Designed for embedding inside Markdown lists or admonitions where the whole block must be indented to render correctly.
- **`strip-comments` attribute** (default: enabled): Region marker lines (`#region` / `#endregion` and all comment-style variants) are now hidden from embedded output by default — they are documentation noise, not content. To include them, set `strip-comments="false"` explicitly. For full-file and line-range embeds, any region markers that fall within the selected range are also stripped unless disabled.

### Fixed
- **Code-fence tag isolation**: Embed tags written inside fenced code blocks (` ``` ` or `~~~`) in a Markdown document — such as documentation examples in `README.md` — were previously matched by the raw-text regex and triggered diagnostics errors, CodeLens buttons, and embed processing. All providers (`diagnostics`, `embedder`, `codelens`) now compute fenced-code-block ranges before scanning and skip any match whose position falls inside a fence.
- **`strip-comments="false"` for region embeds not working**: `extractRegion` always sliced content strictly *between* the bounding markers, so there was no content for the filter to restore. Fixed by passing an `includeMarkers` flag directly into `extractRegion`: when `strip-comments="false"` the slice now extends to include the `#region` and `#endregion` lines.

### Changed
- **README badges**: Replaced retired `shields.io/visual-studio-marketplace` badge endpoints (version, installs, rating) with equivalent `vsmarketplacebadges.dev` URLs.
- **Hover provider**: Now resolves and previews content from remote URLs in the same popup used for local files. On fetch error the hover shows the HTTP status or timeout message instead of silently failing.
- **`resolveFilePath` / diagnostics**: URL-valued `file` attributes bypass local filesystem resolution and all local-file diagnostics checks entirely — no spurious "file not found" errors for remote embeds.

## [0.1.6] - 2026-04-15

### Added
- **Lua support**: Region markers using `--` comments are now recognized (`-- #region name` / `-- #endregion`). Lua files (`.lua`) also get correct syntax highlighting in embedded code blocks.

## [0.1.5] - 2026-04-15

### Added
- **Diagnostics**: Inline error highlighting (red squiggles) when a referenced file is not found, a named region is missing, or a line range is invalid or out of bounds.
- **CodeLens**: Inline action buttons appear above every embed tag — `↻ Update` to refresh a single embed, `→ file#region` to jump directly to the source, and `🔒 Lock` / `🔓 Unlock` to toggle update protection without editing the tag manually.
- **Hover Preview**: Hover over any embed comment to instantly preview the embedded code in a popup — no need to open the source file.
- **Autocomplete**: IntelliSense for `file="..."` (file path completions relative to the markdown file) and `region="..."` (auto-lists all `#region` names defined in the referenced file).

### Changed
- Marketplace categories updated to `Programming Languages` and `Notebooks` for better discoverability.
- Added keywords: `include`, `inject`, `sync`, `literate`, `code docs`, `code snippets`, `live docs`.

## [0.1.4] - 2026-02-17
### Added
- **Line Highlighting**: Highlight specific lines in embedded code using `new="5-6,11"` attribute.
- **Line Numbers**: Display original source line numbers with `withLineNumbers="true"`.
- **Vertical Alignment**: Highlight comments (`// NEW`) are automatically aligned vertically for better readability.
- **Comment Suffix Support**: Correctly handles comments in languages like HTML (`<!-- -->`) and CSS (`/* */`).
- **Improved Error Handling**: Displays error messages directly in the markdown file when file resolution fails.
- **Smart Indentation Stripping**: Automatically removes common indentation from embedded code chunks.
- **Go to Definition**: `Ctrl+Click` on the file path in the embed comment opens the source file.

### Removed
- Diagnostics feature (removed upon request to simplify extension).

## [0.1.3] - 2026-02-16

### Improved
- **Documentation**: Enhanced `README.md` with:
    - Feature demonstration GIFs.
    - Marketing-focused introduction and "Why Markdown Code Embedder?" section.
    - Marketplace and GitHub badges (Version, Installs, Rating, License, Stars, Made in Italy).
    - Updated repository links to the new `Markdown-Code-Embedder` repo.

### Fixed
- Fixed broken repository URLs in `package.json` and `README.md`.
- General bug fixes and stability improvements.

## [0.1.2] - 2026-02-16

### Improved
- **Documentation**: Completely overhauled `README.md` with better feature descriptions and usage examples.
- **Demo**: Enhanced `demo.md` with an interactive walkthrough structure.
- **Metadata**: Added relevant keywords to `package.json` for better discoverability.

## [0.1.1] - 2026-02-15

### Fixed
- Fixed documentation formatting in README.md.

## [0.1.0] - 2026-02-15

### Added
- Initial public release.
- **Core Embedding**: Support for embedding code via embed comment tags in markdown files.
- **Region Support**: Target specific code blocks using `region="..."` attribute and `#region` markers in source files.
- **Line Ranges**: Target specific lines using `line="start-end"` attribute.
- **Auto-Update**: Embeds automatically refresh/sync when the markdown document is saved.
- **Manual Command**: Added `Update Code Embeds` command (`markdown-embed.update`) to force an update.
- **Code Locking**: Ability to "lock" embeds so they don't update (`lock="true"`).
- **Syntax Highlighting**: Automatically applies markdown code fences with the correct language identifier based on file extension.
