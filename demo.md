# Markdown Code Embedder Demo

This file demonstrates the capabilities of the **Markdown Code Embedder** extension.

> **Try it yourself!**
> 1. Open this file in VS Code.
> 2. Delete the code blocks between the comments (but keep the `<!-- embed:... -->` comments!).
> 3. Save the file.
> 4. Watch the code reappear automatically!

## 1. Embedding a Region
This embeds the `hello-world` region from [src/demo.ts](./src/demo.ts).
Robust to changes in the file, as long as the region name stays the same.

<!-- embed:file="./src/demo.ts" region="hello-world" -->
```typescript
function hello(name: string) {
    console.log(`Hello, ${name}!`);
}
```
<!-- embed:end -->

## 2. Embedding Line Ranges
This embeds lines 8-12 from [src/demo.ts](./src/demo.ts).
Useful for quick snippets, but might break if lines shift in the source file.

<!-- embed:file="./src/demo.ts" line="8-12" -->
```typescript

// #region second-region
const x = 10;
const y = 20;
console.log(x + y);
```
<!-- embed:end -->

## 3. Embedding a Whole File
This embeds the entire [src/demo.ts](./src/demo.ts) file.

<!-- embed:file="./src/demo.ts" -->
```typescript
function hello(name: string) {
    console.log(`Hello, ${name}!`);
}

// #region second-region
const x = 10;
const y = 20;
console.log(x + y);
// #endregion
```
<!-- embed:end -->

## 4. Locked Embed
This embeds a specific version of lines 4-6 from [src/demo.ts](./src/demo.ts) using `lock="true"`.
The content below will **not** update even if you modify the source file, effectively freezing this snippet in time.

<!-- embed:file="./src/demo.ts" line="4-6" lock="true" -->
```typescript
// This content is locked!
console.log("I will not change even if source does.");
```
<!-- embed:end -->
