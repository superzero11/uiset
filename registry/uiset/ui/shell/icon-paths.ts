// UISet's icons as SVG path data on a 24×24 grid, stroked: framework-free, so the React
// Icon and the web elements draw the same shapes.
const iconPaths = {
  // Text editing (the rich text editor's toolbar).
  bold: "M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z",
  italic: "M10 5h8M6 19h8M14 5l-4 14",
  underline: "M7 5v6a5 5 0 0 0 10 0V5M5 20h14",
  strike: "M5 12h14M16 7a4 4 0 0 0-3.5-2h-1A3.5 3.5 0 0 0 8 8.5c0 1.4.8 2.4 2.5 3M8 17a4 4 0 0 0 3.5 2h1a3.5 3.5 0 0 0 3.5-3.5c0-.6-.1-1.1-.4-1.5",
  "code-inline": "M9 8l-4 4 4 4M15 8l4 4-4 4",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  "list-bullet": "M9 6h11M9 12h11M9 18h11M4.5 6v.01M4.5 12v.01M4.5 18v.01",
  "list-ordered": "M10 6h10M10 12h10M10 18h10M4 4.5l1.5-.5v4.5M4 15a1.3 1.3 0 0 1 2.4.6c0 .8-2.4 1.7-2.4 2.9h2.6",
  "list-check": "M11 6h9M11 12h9M11 18h9M3.5 6l1.5 1.5L8 4.5M3.5 12l1.5 1.5 3-3M3.5 18l1.5 1.5 3-3",
  quote: "M6 7h4v4c0 3-1.3 5-4 6M14 7h4v4c0 3-1.3 5-4 6",
  undo: "M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  redo: "M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5v.01",
  "code-block": "M4 5h16v14H4zM9.5 10l-2 2 2 2M14.5 10l2 2-2 2",
  rule: "M4 12h16M8 8h8M8 16h8",
  menu: "M4 7h16M4 12h16M4 17h16",
  sidebar: "M4 5h16v14H4zM9 5v14",
  chevron: "M9 6l6 6-6 6",
  search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4",
  close: "M6 6l12 12M18 6L6 18",
  copy: "M8 8h11v11H8zM5 16V5h11",
  check: "M5 12.5l4.5 4.5L19 7.5",
  info: "M12 11v6M12 7.5v.01M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z",
  success: "M8 12.5l2.5 2.5L16 9.5M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z",
  warning:
    "M12 9v4M12 16.5v.01M10.3 4.2L2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z",
  danger: "M15 9l-6 6M9 9l6 6M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z",
  up: "M7 14l5-5 5 5",
  down: "M7 10l5 5 5-5",
  inbox: "M4 13l2.5-7h11l2.5 7v6H4zM4 13h5l1 2h4l1-2h5",
  more: "M4.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M10.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M16.8 12a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0",
  columns: "M4 5h16v14H4zM10 5v14M15 5v14",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  upload: "M12 15V4M7 9l5-5 5 5M5 20h14",
  retry: "M20 12a8 8 0 1 1-8-8c2.2 0 4.3.9 5.9 2.4L20 8.5M20 4v4.5h-4.5",
  filter: "M4 6h16M7 12h10M10 18h4",
  home: "M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M21 20c0-2.6-1.6-4.8-4-5.6",
  orders: "M6 4h12l1 16H5zM9 8a3 3 0 0 0 6 0",
  reports: "M5 20V10M12 20V4M19 20v-7",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2 1.2l-.3 2h-4l-.3-2a7 7 0 0 1-2-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7a7 7 0 0 1 2-1.2l.3-2h4l.3 2a7 7 0 0 1 2 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 3z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  star: "M12 4l2.5 5.2 5.5.8-4 3.9.9 5.6L12 16.8 7.1 19.5l.9-5.6-4-3.9 5.5-.8z",
  archive: "M4 5h16v4H4zM6 9v10h12V9M10 13h4",
  trash: "M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  fit: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  folder: "M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z",
  file: "M6 3.5h8l4 4v13H6zM14 3.5v4h4",
  branch: "M6 4v16M18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 8c0 5-6 5-12 8",
  grip: "M9 6.5v.01M15 6.5v.01M9 12v.01M15 12v.01M9 17.5v.01M15 17.5v.01",
  edit: "M5 19h4L19 9l-4-4L5 15zM14 6l4 4",
  send: "M4 12l16-8-6 16-2-7z",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  shield: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z",
  lock: "M7.5 11V8a4.5 4.5 0 0 1 9 0v3M5.5 11h13v9.5h-13z",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
}

type IconName = keyof typeof iconPaths

/** An icon as an SVG element, for code without React. */
function iconElement(name: IconName, className?: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("focusable", "false")
  svg.setAttribute("class", ["uiset-icon", className].filter(Boolean).join(" "))
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
  path.setAttribute("d", iconPaths[name])
  svg.append(path)
  return svg
}

export { iconElement, iconPaths }
export type { IconName }
