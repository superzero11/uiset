<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.13, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Avatar

- `onLoadingStatusChange?` (`((status: AvatarLoadingStatus, details: ChangeDetails<AvatarLoadingStatusChangeReason>) => void)`): Runs when the image's loading status changes: `"loading"` when it gets a source, `"loaded"`, `"error"`, and `"idle"` when it leaves the page. `details.reason` says why, and `details.event` is the image's `load` or `error` event, or undefined when the status was known at once, like for a cached image.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### AvatarImage

The image. Renders a real `img`, so the browser can fetch it before hydration, and accepts its attributes, such as `srcSet`, `crossOrigin` and `referrerPolicy`.

### AvatarFallback

- `delay?` (`number`): How long to wait, in milliseconds, before showing the fallback, so a fast image appears without the fallback flashing first. Without one, the fallback shows at once, server markup included.

### State

What render functions, state-based class names and slots receive. Every part gets the same state.

- `loadingStatus` (`AvatarLoadingStatus`): Where the image is: `"idle"`, `"loading"`, `"loaded"` or `"error"`.

### Reasons

`details.reason` says why the status changed.

- `image-load` (`Event | undefined`): An image loaded. No event when it was already in the browser's cache.
- `image-error` (`Event | undefined`): An image failed to load, or has no source. No event when that was known at once.
- `src-change` (`none`): An image got a new source, or left the page, so its status starts over.

### Events

Callbacks get the new status first, then the details.

| Prop                    | On       | Receives                                                                            |
| ----------------------- | -------- | ----------------------------------------------------------------------------------- |
| `onLoadingStatusChange` | `Avatar` | `(status, details)`: the image's status, the [reason](#reasons) and `details.event` |

## Accessibility

Give the image meaningful `alt` text. Include the person's name in the fallback too, using visually hidden text if you only want to show initials.

When a visible name beside the avatar already identifies the person, use an empty `alt` and hide decorative fallback content from screen readers.

- An image that loads replaces the fallback.
- An image that fails keeps the fallback.
- An avatar without an image shows its fallback.
- A fallback with a delay waits before showing.
- The image's loading status is reported.
- Removing the image brings the fallback back.
- A new source shows its image once it loads.
- The image is fetched with its own referrer policy.
- A cached image doesn't flash the fallback when the avatar mounts again.
- A new source keeps showing the previous image until it loads.
- The image is fetched once, even when it can't be cached.

Runs in React, Vue and web components.
