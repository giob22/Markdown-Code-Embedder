# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
