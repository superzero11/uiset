import {
  ImageCropper,
  ImageCropperHandle,
  ImageCropperImage,
  ImageCropperSelection,
  ImageCropperViewport,
} from "../../src/image-cropper"

const landscape =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ec5ff"/><stop offset="1" stop-color="#fde2c4"/></linearGradient></defs><rect width="800" height="500" fill="url(#s)"/><circle cx="600" cy="140" r="60" fill="#ffd36e"/><path d="M0 380 L180 220 L320 340 L470 200 L800 400 L800 500 L0 500Z" fill="#4f6d7a"/><path d="M0 430 L260 320 L520 420 L800 360 L800 500 L0 500Z" fill="#2f4858"/></svg>`,
  )

export default function ImageCropperExample() {
  return (
    <ImageCropper aria-label="Cover photo" src={landscape} aspectRatio={3}>
      <ImageCropperViewport>
        <ImageCropperImage alt="Mountains at sunset" />
        <ImageCropperSelection />
        <ImageCropperHandle position="nw" />
        <ImageCropperHandle position="se" />
      </ImageCropperViewport>
    </ImageCropper>
  )
}
