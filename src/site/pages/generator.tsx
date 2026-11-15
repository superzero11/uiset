import { ThemeGeneratorPage } from "../generator/page"
import { usePageMeta } from "../shell/meta"

function GeneratorRoute() {
  usePageMeta({
    title: "Theme generator for UI SDK",
    description:
      "Turn one key color into a complete, contrast-checked theme for UISet and Vercel's UI SDK: light and dark tokens, status and chart colors, exported as a UISet skin, shadcn/ui variables or design tokens.",
    path: "/themes/generator",
  })
  return <ThemeGeneratorPage />
}

export default GeneratorRoute
