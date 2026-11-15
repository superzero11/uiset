// The pricing template's sample plans, comparison and questions, framework-free, so the
// React template and the web page show the same ones.

type Plan = {
  id: string
  name: string
  description: string
  /** Per seat per month; null for "Contact us". */
  monthly: number | null
  yearly: number | null
  cta: string
  href: string
  features: string[]
  recommended?: boolean
}

const samplePlans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "For side projects and trying things out.",
    monthly: 0,
    yearly: 0,
    cta: "Start for free",
    href: "#sign-up",
    features: ["3 projects", "1 GB storage", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For teams shipping every week.",
    monthly: 49,
    yearly: 41,
    cta: "Start a 14-day trial",
    href: "#sign-up?plan=pro",
    features: ["Unlimited projects", "100 GB storage", "Preview deployments", "Email support"],
    recommended: true,
  },
  {
    id: "team",
    name: "Team",
    description: "For companies with roles, audits and SSO.",
    monthly: 99,
    yearly: 83,
    cta: "Start a 14-day trial",
    href: "#sign-up?plan=team",
    features: ["Everything in Pro", "Single sign-on", "Audit log", "Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For custom contracts and dedicated help.",
    monthly: null,
    yearly: null,
    cta: "Talk to sales",
    href: "#contact",
    features: ["Everything in Team", "Uptime agreement", "Dedicated engineer", "Invoicing"],
  },
]

const sampleComparison: { feature: string; values: Record<string, string | boolean> }[] = [
  { feature: "Projects", values: { free: "3", pro: "Unlimited", team: "Unlimited", enterprise: "Unlimited" } },
  { feature: "Storage", values: { free: "1 GB", pro: "100 GB", team: "1 TB", enterprise: "Custom" } },
  { feature: "Preview deployments", values: { free: false, pro: true, team: true, enterprise: true } },
  { feature: "Single sign-on", values: { free: false, pro: false, team: true, enterprise: true } },
  { feature: "Audit log", values: { free: false, pro: false, team: true, enterprise: true } },
  { feature: "Support", values: { free: "Community", pro: "Email", team: "Priority", enterprise: "Dedicated" } },
]

const sampleQuestions = [
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrades take effect right away and are prorated; downgrades apply at the next bill.",
  },
  { q: "What counts as a seat?", a: "Anyone who can sign in to your workspace. Viewers on shared links are free." },
  { q: "Do you offer discounts?", a: "Yearly billing saves about 16%. Nonprofits and schools get 50% off; write to us." },
  { q: "What happens when a trial ends?", a: "You keep everything on the Free plan until you choose a paid one." },
]

export { sampleComparison, samplePlans, sampleQuestions }
export type { Plan }
