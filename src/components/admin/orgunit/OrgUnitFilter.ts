import { OrgUnitNode } from "@/app/api/data/org_unit/org_unit"

// This function filters the org unit tree based on a search query
// It returns a new tree with only the matching nodes and their ancestors
export function filterOrgUnitHierarchy(units: OrgUnitNode[], query: string): OrgUnitNode[] {

if (!query.trim()) {
    return units
  }

  const searchLower = query.toLowerCase()

  // Helper function to check if a node matches the search query
  const nodeMatches = (node: OrgUnitNode): boolean => {
    return (
      node.name.toLowerCase().includes(searchLower) ||
      node.code.toLowerCase().includes(searchLower) ||
      node.path.includes(query)
    )
  }

  // Helper function to check if a node or any of its descendants match
  const nodeOrDescendantsMatch = (node: OrgUnitNode): boolean => {
    if (nodeMatches(node)) {
      return true
    }

    if (node.children.length > 0) {
      return node.children.some(nodeOrDescendantsMatch)
    }

    return false
  }

  // Filter the tree, keeping matching nodes and their ancestors
  const filterTree = (nodes: OrgUnitNode[]): OrgUnitNode[] => {
    return nodes.filter(nodeOrDescendantsMatch).map((node) => {
      // Create a new node with filtered children
      return {
        ...node,
        children: filterTree(node.children),
      }
    })
  }

  return filterTree(units)
}