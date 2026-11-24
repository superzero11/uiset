import { fileURLToPath } from "node:url"
import solid from "@solidjs/vite-plugin"
import { configDefaults, defineConfig, mergeConfig } from "vitest/config"
import viteConfig from "./vite.config.ts"

const shared = { environment: "jsdom" as const, setupFiles: ["./tests/unit/setup.ts"], css: false }
// Solid's tests (tests/unit/solid-*) compile with Solid's plugin, its server tests (*.ssr.test)
// for the server, in Node; everything else with React's.
const solidTests = "tests/unit/solid-*.test.{ts,tsx}"
const solidServerTests = "tests/unit/solid-*.ssr.test.{ts,tsx}"
const alias = { "@": fileURLToPath(new URL(".", import.meta.url)) }

export default defineConfig({
  test: {
    projects: [
      mergeConfig(
        viteConfig,
        defineConfig({
          test: { ...shared, name: "unit", include: ["tests/unit/**/*.test.{ts,tsx}"], exclude: [...configDefaults.exclude, solidTests] },
        }),
      ),
      defineConfig({
        plugins: [solid()],
        resolve: { alias },
        test: { ...shared, name: "solid", include: [solidTests], exclude: [...configDefaults.exclude, solidServerTests], setupFiles: [...shared.setupFiles, "./tests/unit/solid-setup.ts"] },
      }),
      defineConfig({
        plugins: [solid({ ssr: true })],
        resolve: { alias },
        test: { name: "solid-ssr", environment: "node", include: [solidServerTests], css: false },
      }),
    ],
  },
})
