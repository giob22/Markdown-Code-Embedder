<p align="center">
  <img src="media/logo.png" alt="Markdown Code Embedder Logo" width="128" />
</p>

# Markdown Code Embedder

<p align="center">
    <a href="https://marketplace.visualstudio.com/items?itemName=giob22.markdown-code-embedder">
        <img src="https://img.shields.io/visual-studio-marketplace/v/giob22.markdown-code-embedder?style=flat-square" alt="Version" />
    </a>
    <a href="https://marketplace.visualstudio.com/items?itemName=giob22.markdown-code-embedder">
        <img src="https://img.shields.io/visual-studio-marketplace/i/giob22.markdown-code-embedder?style=flat-square" alt="Installs" />
    </a>
    <a href="https://marketplace.visualstudio.com/items?itemName=giob22.markdown-code-embedder">
        <img src="https://img.shields.io/visual-studio-marketplace/r/giob22.markdown-code-embedder?style=flat-square" alt="Rating" />
    </a>
    <br />
    <a href="LICENSE">
        <img src="https://img.shields.io/github/license/giob22/Markdown-Code-Embedder?style=flat-square" alt="License" />
    </a>
    <a href="https://github.com/giob22/Markdown-Code-Embedder">
        <img src="https://img.shields.io/github/stars/giob22/Markdown-Code-Embedder?style=flat-square" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/giob22">
        <img src="https://img.shields.io/badge/Made%20in-Italy-008C45?style=flat-square&logo=flags" alt="Made in Italy" />
    </a>
</p>

<p align="center">
    <b>Stop copy-pasting code! Keep your documentation in perfect sync with your source.</b>
</p>

---

## 💡 Why Markdown Code Embedder?

Documentation gets stale fast. You change a function name in your code, but forget to update the README. Before you know it, your docs are misleading.

**Markdown Code Embedder** solves this instantly. Instead of pasting code snippets, you reference your **actual source files**.
When your code changes, your documentation updates automatically. It's like magic for your technical writing.

### Key Benefits
- 📚 **Single Source of Truth**: Your codebase _is_ your documentation.
- ⚡ **Zero Maintenance**: Never worry about outdated examples again.
- 🎯 **Precision & Control**: Embed entire files, specific regions, or exact line ranges.
- 🔒 **Lock Mode**: Need a static snapshot? Lock specific embeds to prevent updates.

---

## ✨ Features

- **Dynamic Embedding**: Reference code from any file in your workspace seamlessly.
- **Smart Region Support**: Define named regions (`#region ... #endregion`) in your source code. This is the **most robust** way to embed snippets as they survive refactoring and line shifts.
- **Line Range Support**: Quickly grab lines 10-20 for a fast example.
- **Auto-Sync**: Enable `autoUpdate` to have your docs refresh the moment you save your source file.
- **Source Links**: Automatically generates clickable links to the source file and line numbers for easy navigation.
- **Intelligent Syntax Highlighting**: Detects the source language and applies the correct markdown code fence for you.

## 🚀 Usage

### 1. Embed an Entire File
Use the `embed:file` comment to embed the full content of a file. The path can be relative to the markdown file.

![Embed File](media/embedfile.gif)

```markdown
<!-- embed:file="./src/main.ts" -->
```

### 2. Embed a Named Region (Recommended)
Regions are the most robust way to embed code. They stay correct even if you add code above or below the block.

![Embed Region](media/region.gif)

**In your source code:**
```typescript
// #region my-feature
function calculate() {
    return 42;
}
// #endregion
```

**In your markdown:**
```markdown
<!-- embed:file="./src/main.ts" region="my-feature" -->
```

### 3. Embed by Line Numbers
Useful for quick, temporary references.

![Embed Lines](media/line.gif)

```markdown
<!-- embed:file="./src/main.ts" line="5-10" -->
```

### 4. Highlight Specific Lines (NEW!)
Highlight important changes or key lines in your embedded code using the `new` attribute. You can specify single lines or ranges.

```markdown
<!-- embed:file="./src/main.ts" region="my-feature" new="2,3-5" -->
```

This will automatically append `// NEW` (or language equivalent) to the specified lines and align them vertically.

### 5. Show Line Numbers (NEW!)
Prefix each line of code with its original line number from the source file using `withLineNumbers="true"`.

```markdown
<!-- embed:file="./src/main.ts" line="10-12" withLineNumbers="true" -->
```

Output:
```typescript
10: const x = 10;
11: const y = 20;
12: console.log(x + y);
```

### 6. Lock an Embed
Prevent an embed from updating by adding `lock="true"`.

![Lock Mode](media/lock.gif)

```markdown
<!-- embed:file="./src/main.ts" lock="true" -->
```

### 6. Automatic Updates (Auto-Sync)
Enable `markdownEmbedder.autoUpdate` to have your markdown files automatically update whenever you save a referenced source file.

![Auto Update](media/Modifica_direttaModificaReadMe.gif)

### 7. Manual Updates
You can also trigger updates manually by running the command `Markdown Embedder: Update Code Embeds` or simply by editing and saving the markdown file itself.

![Manual Update](media/ModificaCodice_salvataggio_ModificaReadMe.gif)

## ⚙️ Configuration

You can customize the extension in your VS Code settings (`Ctrl+,`):

| Setting | Default | Description |
| :--- | :--- | :--- |
| `markdownEmbedder.autoUpdate` | `false` | Automatically update embeds in Markdown files when a referenced source file is saved. |

## ⌨️ Commands

- `Markdown Embedder: Update Code Embeds` (ID: `markdown-embed.update`): Manually triggers an update of all embeds in the current file.

## 📝 Supported Region Markers

The extension supports various comment styles for regions, accommodating most languages:

- `// #region name` ... `// #endregion` (JS, TS, C#, Java, etc.)
- `#region name` ... `#endregion` (Python, Shell, etc.)
- `/* #region name */` ... `/* #endregion */` (CSS, C, etc.)
- `<!-- #region name -->` ... `<!-- #endregion -->` (HTML, XML)

## 🤝 Contributing

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/giob22/Markdown-Code-Embedder).

## ❤️ Support the Efficiency
If you find **Markdown Code Embedder** useful, please consider:

- ⭐ **Starring** the repository on [GitHub](https://github.com/giob22/Markdown-Code-Embedder)
- ✍️ **Leaving a review** on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=giob22.markdown-code-embedder)
- 🐛 **Reporting issues** to help us improve!

Your feedback is what keeps this tool growing. Thank you!

## 📄 License

MIT
