import { Dynamic, type ComponentProps, type JSX } from "@solidjs/web"
import { omit } from "solid-js"
import "../../registry/uiset/ui/shell/shell.css"

function Card(props: ComponentProps<"div">) {
  return <div class={["card", props.class]} {...omit(props, "class")} />
}

function CardHeader(props: ComponentProps<"div">) {
  return <div class={["card-header", props.class]} {...omit(props, "class")} />
}

function CardTitle(props: { level?: 2 | 3 | 4; class?: string; children: JSX.Element }) {
  return (
    <Dynamic component={`h${props.level ?? 3}`} class={["card-title", props.class]}>
      {props.children}
    </Dynamic>
  )
}

function CardDescription(props: ComponentProps<"p">) {
  return <p class={["card-description", props.class]} {...omit(props, "class")} />
}

function CardContent(props: ComponentProps<"div">) {
  return <div class={["card-content", props.class]} {...omit(props, "class")} />
}

function CardFooter(props: ComponentProps<"div">) {
  return <div class={["card-footer", props.class]} {...omit(props, "class")} />
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
