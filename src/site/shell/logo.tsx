// UISet's mark: a white circle on a black tile. In dark mode a faint edge keeps the tile
// apart from the page (shell.css).

function LogoMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg className={["logo-mark", className].filter(Boolean).join(" ")} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect className="logo-tile" x="0.5" y="0.5" width="31" height="31" rx="8" fill="#0a0a0a" />
      <circle cx="16" cy="16" r="8.5" fill="#fff" />
    </svg>
  )
}

function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo-word" translate="no">
        UISet
      </span>
    </span>
  )
}

export { Logo, LogoMark }
