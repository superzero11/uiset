# @uiset/web

UISet's skins, kits and page parts for [UI SDK](https://ui-sdk.dev)'s custom elements: for
plain HTML, Vue, Svelte, Solid, Angular, or any framework that renders HTML.

UI SDK's elements handle behavior: keyboard, focus, ARIA and an agent bridge. UISet dresses
them in five skins (base, blueprint, studio, phosphor and ink, light and dark), and adds
the larger pieces apps need as `<uiset-*>` elements: chat, rich text, data grid, charts,
board, scheduler, node canvas, IDE, terminal, mobile patterns and the Studio synth rack.

```bash
npm install @uiset/web @ui-sdk/web@0.1.0-beta.13 @ui-sdk/core@0.1.0-beta.13
```

```html
<link rel="stylesheet" href="node_modules/@uiset/web/dist/uiset.css" />
<script type="module">
  import "@ui-sdk/web/button"
  import "@ui-sdk/web/switch"
  import "@uiset/web"
</script>

<uiset-root skin="studio" theme="dark">
  <ui-button><button>Save</button></ui-button>
  <label><ui-switch><ui-switch-thumb></ui-switch-thumb></ui-switch> Email me</label>
</uiset-root>
```

With a bundler, import the stylesheet as `@uiset/web/uiset.css`. It already includes UI
SDK's `web.css`, and styles nothing outside `<uiset-root>`. Import the UI SDK elements you
use from `@ui-sdk/web/<component>`. Add `shiki` for colored code blocks in chats; without
it they're plain.

TypeScript types ship with the package: `document.querySelector("uiset-data-grid")` is a
`UISetDataGrid`. The module can be imported on a server; it defines its elements only in a
browser. Bindings from Vue and Svelte work as written, including `false` for a presence
attribute.

- [Web Components docs](https://uiset.dev/docs/web-components): every kit, attributes and events
- [All of UISet](https://uiset.dev): the React registry, the theme generator and the docs

UISet follows UI SDK's beta and pins its versions exactly; see the
[changelog](https://github.com/superzero11/uiset/blob/main/CHANGELOG.md). MIT licensed.
UISet is a community project, not affiliated with Vercel.
