import { openGallery } from "./gallery"
import { mobileTests } from "./mobile-tests"

// The mobile kit on React's gallery and kit page; the tests are shared with Solid's mobile page
// (mobile-tests.ts).

mobileTests({
  open: (page) => openGallery(page, "/gallery"),
  ink: async (page) => {
    await page.addInitScript(() => localStorage.setItem("uiset-site-skin", "ink"))
    await page.goto("/docs/kits/mobile")
  },
})
