import { useState, useEffect, ReactNode } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OrgUnitNode } from "@/app/api/data/org_unit/org_unit"

type OrgUnitTreeBaseProps = {
  units: OrgUnitNode[]
  level?: number
  searchQuery?: string
  renderActions?: (unit: OrgUnitNode) => ReactNode
  renderPrefix?: (unit: OrgUnitNode) => ReactNode
}

export function OrgUnitTreeBase({
  units,
  level = 0,
  searchQuery = "",
  renderActions,
  renderPrefix,
}: OrgUnitTreeBaseProps) {
  return (
    <div className="space-y-1">
      {units.map((unit) => (
        <OrgUnitTreeBaseItem
          key={unit.id}
          unit={unit}
          level={level}
          searchQuery={searchQuery}
          renderActions={renderActions}
          renderPrefix={renderPrefix}
        />
      ))}
    </div>
  )
}

type OrgUnitTreeBaseItemProps = {
  unit: OrgUnitNode
  level: number
  searchQuery: string
  renderActions?: (unit: OrgUnitNode) => ReactNode
  renderPrefix?: (unit: OrgUnitNode) => ReactNode
}

function OrgUnitTreeBaseItem({
  unit,
  level,
  searchQuery,
  renderActions,
  renderPrefix,
}: OrgUnitTreeBaseItemProps) {
  const [expanded, setExpanded] = useState(searchQuery.trim() !== "" || level < 1)
  const hasChildren = unit.children && unit.children.length > 0

  useEffect(() => {
    if (searchQuery.trim() !== "") {
      setExpanded(true)
    }
  }, [searchQuery])

  const matchesSearch =
    searchQuery.trim() !== "" &&
    (unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.path.includes(searchQuery))

  return (
    <div>
      <div
        className={`
          flex items-center py-2 px-2 rounded-md
          ${level === 0 ? "bg-muted/50" : matchesSearch ? "bg-chart-1/20" : "hover:bg-muted/30"}
        `}
      >
        <div className="flex items-center flex-1 min-w-0" style={{ paddingLeft: `${level * 16}px` }}>
          {hasChildren ? (
            <Button 
              type='button'
              variant="ghost"   
              size="icon" 
              className="h-5 w-5 p-0 mr-1" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="w-6" />
          )}

          {renderPrefix?.(unit)}

          <div className="flex-1 min-w-0 ml-1">
            <div className="flex items-center">
              <span className="font-bold text-sm truncate">{unit.name}</span>
              <Badge variant="outline" className="ml-2 text-xs text-chart-1">
                {unit.code}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground truncate">Path: {unit.path}</div>
          </div>
        </div>

        {renderActions?.(unit)}
      </div>

      {expanded && hasChildren && (
        <div className="mt-1">
          <OrgUnitTreeBase
            units={unit.children}
            level={level + 1}
            searchQuery={searchQuery}
            renderActions={renderActions}
            renderPrefix={renderPrefix}
          />
        </div>
      )}
    </div>
  )
}
