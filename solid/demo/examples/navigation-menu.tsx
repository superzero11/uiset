import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "../../src/navigation-menu"

export default function NavigationMenuExample() {
  return (
    <NavigationMenu aria-label="Docs">
      <NavigationMenuList>
        <NavigationMenuItem value="guides">
          <NavigationMenuTrigger>Guides</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#install">Install</NavigationMenuLink>
            <NavigationMenuLink href="#theming">Theming</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="reference">
          <NavigationMenuTrigger>Reference</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#components">Components</NavigationMenuLink>
            <NavigationMenuLink href="#tokens">Tokens</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
      <NavigationMenuViewport />
    </NavigationMenu>
  )
}
