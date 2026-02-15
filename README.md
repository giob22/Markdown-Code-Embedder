# Markdown Code Embedder

Embed code snippets from external files into your Markdown documents and keep them automatically synchronized.

## Features

- **Sync with Source**: Embed code directly from your project files. No more copy-pasting outdated code!
- **Region Support**: Define named regions in your source code to embed specific logic blocks.
- **Line Ranges**: Embed specific line ranges (e.g., `10-20`).
- **Auto-Update**: Embeds updated automatically when you save the markdown file.
- **Language Detection**: Automatically adds proper syntax highlighting based on the source file extension.

## Usage

### 1. Embed an Entire File
Use the `embed:file` comment to embed the full content of a file. The path can be relative to the markdown file.

```markdown
<!-- embed:file="./src/main.ts" -->
```

### 2. Embed a Specific Region (Recommended)
Regions allow you to name blocks of code in your source files, making your embeds robust to code changes (like adding lines above the block).

**Step 1: Mark the region in your code**
```typescript
// #region my-feature
function calculate() {
    return 42;
}
// #endregion
```

**Step 2: Refer to the region in your markdown**
```markdown
<!-- embed:file="./src/main.ts" region="my-feature" -->
```

### 3. Embed by Line Numbers
You can also specify a range of lines.

```markdown
<!-- embed:file="./src/main.ts" line="5-10" -->
```

### 4. Lock an Embed
Prevent an embed from updating by adding `lock="true"`. This is useful if you want to freeze a specific version of the code snippet.

```markdown
<!-- embed:file="./src/main.ts" lock="true" -->
```

## Snippets
The extension includes snippets to make embedding easier. In any Markdown file, type:
- `embed:file` → Embed a whole file
- `embed:region` → Embed a named region
- `embed:lines` → Embed specific lines
Then press `Tab` to insert the template.

## How It Works

1. Add the embed comment to your markdown file (e.g., `<!-- embed:file="..." -->`).
2. **Save the file**.
3. The extension will fetch the content and insert a code block immediately after the comment, followed by a `<!-- embed:end -->` tag.

Example result:
```markdown
<!-- embed:file="./example.js" -->

` ` `javascript
console.log("Hello");
` ` `

<!-- embed:end -->
```

## Commands

- **Update Code Embeds**: Manually triggers an update of all embeds in the current file. (Command ID: `markdown-embed.update`)

## Supported Region Markers
The extension supports various comment styles for regions, accommodating most languages:
- `// #region name` ... `// #endregion` (JS, TS, C#, Java, etc.)
- `#region name` ... `#endregion` (Python, Shell, etc.)
- `/* #region name */` ... `/* #endregion */` (CSS, C, etc.)
- `<!-- #region name -->` ... `<!-- #endregion -->` (HTML, XML)

## Known Issues
- Nested embeds are not supported.

## License
MIT
