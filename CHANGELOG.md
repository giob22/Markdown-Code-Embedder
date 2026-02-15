# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-02-15

### Fixed
- Fixed documentation formatting in README.md.

## [0.1.0] - 2026-02-15

### Added
- Initial public release.
- **Core Embedding**: Support for embedding code via `<!-- embed:file="..." -->` comments.
- **Region Support**: Target specific code blocks using `region="..."` attribute and `#region` markers in source files.
- **Line Ranges**: Target specific lines using `line="start-end"` attribute.
- **Auto-Update**: Embeds automatically refresh/sync when the markdown document is saved.
- **Manual Command**: Added `Update Code Embeds` command (`markdown-embed.update`) to force an update.
- **Code Locking**: Ability to "lock" embeds so they don't update (`lock="true"`).
- **Syntax Highlighting**: Automatically applies markdown code fences with the correct language identifier based on file extension.
