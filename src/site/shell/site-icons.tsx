import type { ReactNode } from "react"

// The site frame's icons: 1.5px strokes on a 20px grid, in the text color.

function Stroke({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="site-icon"
    >
      {children}
    </svg>
  )
}

const LibraryIcon = () => (
  <Stroke>
    <rect x="3" y="3" width="5.5" height="5.5" rx="1.25" />
    <rect x="11.5" y="3" width="5.5" height="5.5" rx="1.25" />
    <rect x="3" y="11.5" width="5.5" height="5.5" rx="1.25" />
    <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.25" />
  </Stroke>
)

const BookIcon = () => (
  <Stroke>
    <path d="M10 5.5C8.5 4.3 6.4 3.75 3.5 3.75v11.5c2.9 0 5 .55 6.5 1.75 1.5-1.2 3.6-1.75 6.5-1.75V3.75c-2.9 0-5 .55-6.5 1.75Z" />
    <path d="M10 5.5V17" />
  </Stroke>
)

const AgentIcon = () => (
  <Stroke>
    <rect x="3.5" y="6" width="13" height="10" rx="3" />
    <path d="M10 3.25V6M7.5 10.25v1M12.5 10.25v1" />
  </Stroke>
)

const SkinIcon = () => (
  <Stroke>
    <path d="M10 3a7 7 0 1 0 0 14c1 0 1.5-.6 1.5-1.4 0-1.2-1-1.6-1-2.6 0-.8.6-1.5 1.6-1.5H14a3 3 0 0 0 3-3C17 5.5 14 3 10 3Z" />
    <circle cx="6.5" cy="9" r=".75" fill="currentColor" stroke="none" />
    <circle cx="9" cy="6.25" r=".75" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="6.75" r=".75" fill="currentColor" stroke="none" />
  </Stroke>
)

const SearchIcon = () => (
  <Stroke>
    <circle cx="8.75" cy="8.75" r="5.25" />
    <path d="m12.75 12.75 3.75 3.75" />
  </Stroke>
)

const ChevronIcon = ({ size = 14 }: { size?: number }) => (
  <Stroke size={size}>
    <path d="m6.5 8 3.5 3.5L13.5 8" />
  </Stroke>
)

const CopyIcon = () => (
  <Stroke size={14}>
    <rect x="6.5" y="6.5" width="10" height="10" rx="2" />
    <path d="M13.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5" />
  </Stroke>
)

const ArrowIcon = () => (
  <Stroke size={14}>
    <path d="M4.5 10h11M11 5.5l4.5 4.5-4.5 4.5" />
  </Stroke>
)

type SiteTheme = "system" | "light" | "dark"

const ThemeIcon = ({ theme }: { theme: SiteTheme }) => (
  <Stroke size={15}>
    {theme === "system" && <path d="M3.25 4.5h13.5v9H3.25zM7.5 16.5h5M10 13.5v3" />}
    {theme === "light" && <path d="M10 6.75a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5ZM10 2.5v1.5M10 16v1.5M2.5 10H4M16 10h1.5M4.7 4.7l1.06 1.06M14.24 14.24l1.06 1.06M4.7 15.3l1.06-1.06M14.24 5.76l1.06-1.06" />}
    {theme === "dark" && <path d="M15.75 12.25A6.25 6.25 0 0 1 7.75 4.25a6.25 6.25 0 1 0 8 8Z" />}
  </Stroke>
)

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false" className="site-icon">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false" className="site-icon">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  )
}

export { AgentIcon, ArrowIcon, BookIcon, ChevronIcon, CopyIcon, GithubIcon, LibraryIcon, SearchIcon, SkinIcon, ThemeIcon, XIcon }
export type { SiteTheme }
