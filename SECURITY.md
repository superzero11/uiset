# Security

## Supported versions

UISet is in beta, like UI SDK. Fixes go into the latest release only. Because UISet is a
shadcn registry, its code is copied into your app when you add an item: to get a fix,
add the item again (`npx shadcn@latest add superzero11/uiset/<item>`) and review the diff.

## Reporting a vulnerability

Please don't open a public issue. Report it privately through GitHub: on the
[repository's Security tab](https://github.com/superzero11/uiset/security), choose
**Report a vulnerability**. Include the affected item, a way to reproduce it and what an
attacker could do with it.

You'll get an answer within a week. Once a fix is out, the advisory is published with
credit to you, unless you'd rather not be named.

## Scope

UISet renders content apps pass to it, so these matter most:

- the rich text editor's documents and pasted HTML (sanitized by `sanitizeDoc`, and links
  checked by `safeHref`),
- Markdown in the chat kit's answers,
- links and images in any kit,
- the terminal's escape codes and links,
- anything an agent can do through UI SDK's agent bridge, including steps that should wait
  for a person's approval.

Vulnerabilities in UI SDK itself belong upstream at
[vercel-labs/ui](https://github.com/vercel-labs/ui).
