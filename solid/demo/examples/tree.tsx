import {
  Tree,
  TreeGroup,
  TreeItem,
  TreeItemIndicator,
  TreeItemLabel,
} from "../../src/tree"

export default function TreeExample() {
  return (
    <Tree aria-label="Project files" defaultExpanded={["src"]}>
      <TreeItem value="src">
        <TreeItemLabel>
          <TreeItemIndicator />
          src
        </TreeItemLabel>
        <TreeGroup>
          <TreeItem value="src/app.tsx">
            <TreeItemLabel>app.tsx</TreeItemLabel>
          </TreeItem>
          <TreeItem value="src/main.tsx">
            <TreeItemLabel>main.tsx</TreeItemLabel>
          </TreeItem>
        </TreeGroup>
      </TreeItem>
      <TreeItem value="package.json">
        <TreeItemLabel>package.json</TreeItemLabel>
      </TreeItem>
    </Tree>
  )
}
