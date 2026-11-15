// UISet's mark: a "U" drawn as one rounded stroke, holding a square. The U is the structure
// (UI SDK's behavior), the square the component it holds; together they read "Ui". It takes
// the text color, and the square the key color.

function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={["logo-mark", className].filter(Boolean).join(" ")} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M6.5 4.5v12.25a9.5 9.5 0 0 0 19 0V4.5" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <rect x="12" y="9" width="8" height="8" rx="1.75" fill="var(--logo-accent, currentColor)" />
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
