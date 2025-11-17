import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { OrgUnitTreeBase } from "./OrgUnitTreeBase"
import { OrgUnitNode } from "@/app/api/data/org_unit/org_unit"
import { filterOrgUnitHierarchy } from "./OrgUnitFilter"

export function OrgUnitSelectTree({
  units,
  selectedIds,
  onToggle,
  searchQuery = "",
}: {
  units: OrgUnitNode[]
  selectedIds: number[];
  onToggle: (id: number) => void
  searchQuery?: string
}) {

  // Count how many selected nodes exist in the subtree
  function countSelectedDescendants(unit: OrgUnitNode): number {
    let count = selectedIds.includes(unit.id) ? 1 : 0;
    if (unit.children) {
      for (const child of unit.children) {
        count += countSelectedDescendants(child);
      }
    }
    return count;
  }

  const filteredOrgUnits = searchQuery.trim() ? filterOrgUnitHierarchy(units, searchQuery) : units

  return (
    <OrgUnitTreeBase
      units={filteredOrgUnits}
      searchQuery={searchQuery}
      renderPrefix={(unit) => (
        <Checkbox
          id={`unit-${unit.id}`}
          checked={selectedIds.indexOf(unit.id) > -1}
          onCheckedChange={() => onToggle(unit.id)}
          className="mr-2"
        />
      )}
      renderActions={(unit) => {
        const count = countSelectedDescendants(unit);
        return count > 0 ? (
          <Badge variant="secondary" className="ml-2 text-xs">{count} selected</Badge>
        ) : null;
      }}
    />
  )
}