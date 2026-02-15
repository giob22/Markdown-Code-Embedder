# Markdown Code Embedder

Embed code snippets from external files into Markdown documents and keep them in sync.

## Features

- **Embed Code**: Use `<!-- embed:file="..." line="..." -->` to include code from other files.
- **Region Support**: Use `<!-- embed:file="..." region="..." -->` to embed named regions from your code.
- **Update**: Run the "Update Code Embeds" command to refresh all snippets.
- **Auto-Formatting**: Automatically detects the language of the target file and applies the correct markdown code block syntax.

## Usage

### 1. Basic Embedding (Line Numbers)

Add a comment to your markdown file:

```markdown
<!-- embed:file="./src/app.ts" line="10-20" -->
```

### 2. Region Embedding (Recommended)

In your source code (e.g., `src/app.ts`), wrap the code you want to embed with `#region` and `#endregion`:

```typescript
// #region my-snippet
function hello() {
  console.log("Hello World");
}
// #endregion
```

Then in your markdown:

```markdown
<!-- embed:file="./src/app.ts" region="my-snippet" -->
```

### 3. Update

**Save the file**. The extension will automatically fetch the code and insert it.

*Alternatively*, you can run the command `Update Code Embeds` from the Command Palette.

The markdown file will be updated to:

```markdown
<!-- embed:file="./src/app.ts" region="my-snippet" -->
```typescript
function hello() {
  console.log("Hello World");
}
```
<!-- embed:end -->
```

## Supported Languages for Regions
Supports `#region` (C#, TS, JS), `// #region` (JS/TS family), `<!-- #region -->` (HTML/XML), and `/* #region */` (CSS/Java/C).

## Requirements

- VS Code 1.74.0 or higher.

## Extension Settings

None.

## Known Issues

- Nested embeds are not supported.
