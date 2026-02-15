# Demo

Here is an example of embedding code.

## Region Embed
<!-- embed:file="./demo.ts" region="hello-world" -->
```typescript
function hello(name: string) {
    console.log(`Hello, ${name}!`);
}
```
<!-- embed:end -->




## Line Embed
<!-- embed:file="./demo.ts" line="8-12" -->
```typescript

// #region second-region
const x = 10;
const y = 20;
console.log(x + y);
```
<!-- embed:end -->
## Lock Embed
<!-- embed:file="./demo.ts" lock="true" -->
```typescript
// This content is locked and will not update even if demo.ts changes!
function hello(name: string) {
    console.log(`Hello, ${name}!`);
}
```
<!-- embed:end -->



## How to use Snippets
1. Make sure you reload the window (Ctrl+R or F1 -> Reload Window) after adding the snippets.
2. Type one of the following prefixes in this file:
   - `embed:file`
   - `embed:region`
   - `embed:lines`
3. Press `Tab` or `Enter` immediately after typing the prefix.
4. Fill in the file path and other details.
