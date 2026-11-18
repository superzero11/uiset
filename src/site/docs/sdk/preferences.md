<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

### Preferences

- `nonce?` (`string`): The nonce your Content Security Policy gives inline scripts. Example: [Server Rendering](#server-rendering).
- `preferences` (`readonly PreferenceLike[]`): The preferences to show, from `createPreference` or `createColorScheme`. Example: [Usage](#usage).

### usePreference

`usePreference(preference)` returns the preference's current state and updates the component when it changes. For a preference created with `createPreference`, the state is `{ value }`. For a color scheme, it also includes `system` and `resolved`.
