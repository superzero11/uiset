<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.5, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### ImageCropper

- `src?` (`string`): The image's URL, like an object URL for a file someone picked.
- `crop?` (`ImageCrop`): The crop, in the image's own pixels, from the top left of the image as it shows once turned and flipped, with its `rotation`, `flipX` and `flipY`. Pass it straight to `cropImage`. Pass it to control the cropper.
- `defaultCrop?` (`ImageCrop`): The crop at first, when uncontrolled.
- `onCropChange?` (`((crop: Required<ImageCrop>, details: ImageCropperCropChangeDetails) => void)`): Runs while the crop changes: on every step of a drag, a key or the wheel, and once an image loads. `details.cancel()` stops it.
- `onCropCommit?` (`((crop: Required<ImageCrop>, details: ImageCropperCropCommitDetails) => void)`): Runs once an interaction that changed the crop ends: the pointer lifts, a key is pressed, the wheel pauses. For saving.
- `mode?` (`ImageCropperMode`): `"box"` moves and resizes a selection over the whole image. `"frame"` keeps the selection still and as large as it fits, and pans and zooms the image under it, like an avatar editor.
- `aspectRatio?` (`number`): Keeps the crop's width over its height, like `1` for a square or `16 / 9`. Changing it fits the crop to the new ratio.
- `shape?` (`ImageCropperShape`): The selection's shape, as `data-shape`. A circle is still a box to the crop, so pass `shape: "circle"` to `cropImage` too.
- `minWidth?` (`number`): The narrowest the crop gets, in image pixels.
- `minHeight?` (`number`): The shortest the crop gets, in image pixels.
- `maxZoom?` (`number`): How far the crop magnifies the image, where 1 is the largest crop the image allows.
- `disabled?` (`boolean`): Stops every change: the selection can't be focused, and the buttons and zoom are disabled.
- `controller?` (`object`): Sets the crop from anywhere. Create one with `createImageCropperController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### ImageCropperHandle

- `position` (`ImageCropperHandlePosition`): The edge or corner it resizes, like `"nw"` for the top left corner.

### ImageCropperFlip

- `direction?` (`ImageCropperFlipDirection`): Which way it mirrors the image.

### State

What render functions, state-based class names and slots receive. Every part gets the cropper's state.

- `crop` (`Required<ImageCrop> | null`): The crop, or null until the image loads.
- `zoom` (`number`): How far the crop magnifies: 1 when it's as large as the image allows at its ratio.
- `loading` (`boolean`): Whether the image is still loading, so nothing can change yet.
- `error` (`boolean`): Whether the image failed to load.
- `dragging` (`boolean`): Whether a pointer is dragging the selection, a handle or the image.
- `mode` (`ImageCropperMode`): How the crop changes.
- `shape` (`ImageCropperShape`): The selection's shape.
- `disabled` (`boolean`): Whether the `disabled` option stops every change.

Handles add their own:

- `crop` (`Required<ImageCrop> | null`): The crop, or null until the image loads.
- `zoom` (`number`): How far the crop magnifies: 1 when it's as large as the image allows at its ratio.
- `loading` (`boolean`): Whether the image is still loading, so nothing can change yet.
- `error` (`boolean`): Whether the image failed to load.
- `dragging` (`boolean`): Whether a pointer is dragging the selection, a handle or the image.
- `mode` (`ImageCropperMode`): How the crop changes.
- `shape` (`ImageCropperShape`): The selection's shape.
- `disabled` (`boolean`): Whether the `disabled` option stops every change.
- `position` (`ImageCropperHandlePosition`): The edge or corner it resizes.

### Reasons

`details.reason` says why the crop changed.

- `image-load` (`Event | undefined`): An image loaded. No event when it was already in the browser's cache.
- `drag` (`PointerEvent`): A slider thumb or a resize handle was dragged, or an item was dragged to a new place in a list.
- `pinch`
- `wheel` (`WheelEvent`): The mouse wheel stepped a focused number input.
- `step-key` (`KeyboardEvent`): Arrow, Page Up, Page Down, Home or End stepped a slider or a number input.
- `zoom-key`
- `zoom-input`
- `rotate-key`
- `rotate-press`
- `flip-press`
- `aspect-ratio-change`
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createImageCropperController()` and pass it as `controller`.

Each write method takes an optional `{ reason, event }`, runs the change callback like a drag, and returns `false` when nothing changed or the change is canceled.

- `getCrop()` (`() => Required<ImageCrop> | null`): The crop, or null until the image loads.
- `setCrop(crop, options?)` (`(crop: ImageCrop, options?: ImageCropperChangeOptions | undefined) => boolean`): Sets the crop, as a user would. Returns whether it changed.
- `rotate(direction?, options?)` (`(direction?: 1 | -1 | undefined, options?: ImageCropperChangeOptions | undefined) => boolean`): Turns the image a quarter clockwise, or counterclockwise with `-1`.
- `flip(direction?, options?)` (`(direction?: ImageCropperFlipDirection | undefined, options?: ImageCropperChangeOptions | undefined) => boolean`): Mirrors the image left to right, or top to bottom with `"vertical"`.
- `getZoom()` (`() => number`): How far the crop magnifies: 1 when it's as large as the image allows at its ratio.
- `setZoom(zoom, options?)` (`(zoom: number, options?: ImageCropperChangeOptions | undefined) => boolean`): Zooms to a level, about the crop's middle, within 1 and `maxZoom`.
- `focus()` (`() => void`): Moves focus to the selection.

### Events

Callbacks get the new crop first, then the details.

| Prop           | On             | Receives                                                          |
| -------------- | -------------- | ----------------------------------------------------------------- |
| `onCropChange` | `ImageCropper` | `(crop, details)`: the new crop and the [reason](#reasons)        |
| `onCropCommit` | `ImageCropper` | `(crop, details)`: the crop once the interaction ends, its reason |

## Accessibility

No WAI-ARIA pattern covers an image cropper, so it's built from ones that do. The cropper is a group. The selection and each handle follow the [WAI-ARIA slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/), and say the crop in words, like "300 by 300 pixels, at 50, 0". The zoom is a native range input that says its level, like "125%".

The selection, handles and zoom are named in English by default. Pass `aria-label` to name them in another language.

### Keyboard

| Key                 | Does                                                     |
| ------------------- | -------------------------------------------------------- |
| Arrow keys          | Move the selection, or on a handle, move its edges       |
| Shift with an arrow | Moves ten times as far                                   |
| Plus or Minus       | Zooms in or out, about the crop's middle                 |
| R                   | Turns the image a quarter clockwise, or back with Shift  |
| Escape              | During a drag, puts the crop back where the drag started |

Each key press commits, like the end of a drag.

### Tested Behavior

Every line below is an automated test.

**Loading**

- The crop starts once the image loads, as four fifths of the largest at the ratio.

**Box**

- A drag moves the selection over the image and commits once.
- A handle resizes from its corner, within the image.
- At a ratio, a handle keeps it.
- Escape during a drag puts the selection back.

**Keyboard**

- Arrows move the selection, ten times as far with Shift.
- Arrows on a handle move its edges, and the next Tab reaches it.
- Plus and minus zoom about the middle, and R turns the image.

**Controls**

- The zoom input zooms the crop.
- Rotate turns the image a quarter clockwise, and flip mirrors it.
- A controller sets the crop, and a canceled change keeps it.
- Disabled, nothing takes focus or changes.

**Frame**

- The selection stays put and a drag pans the image under it.
- Escape during a pan puts the image back.
- The wheel zooms at the pointer and commits after a pause.

Runs in React, Vue and web components.
