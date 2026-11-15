import type { ComponentProps, ReactNode } from "react"
import "./shell/shell.css"

function cx(...names: (string | undefined)[]) {
  return names.filter(Boolean).join(" ")
}

function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("card", className)} {...props} />
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("card-header", className)} {...props} />
}

function CardTitle({
  level = 3,
  className,
  children,
}: {
  level?: 2 | 3 | 4
  className?: string
  children: ReactNode
}) {
  const Heading = `h${level}` as "h2" | "h3" | "h4"
  return <Heading className={cx("card-title", className)}>{children}</Heading>
}

function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cx("card-description", className)} {...props} />
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("card-content", className)} {...props} />
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("card-footer", className)} {...props} />
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
