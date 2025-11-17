"use client"

import { useState } from "react"
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, Search } from "lucide-react"
import { OrgUnitForm } from "./OrgUnitForm"
import { OrgUnitEditTree } from "./OrgUnitEditTree";
import { OrgUnitNode } from "@/app/api/data/org_unit/org_unit"
import { filterOrgUnitHierarchy } from "./OrgUnitFilter";

type Props = {
    orgUnits: OrgUnitNode[];
}

export function OrgUnitManagerClient({ orgUnits }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<OrgUnitNode | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleRefresh = () => {
    router.refresh();
  }

  const handleAddNew = (parentUnit?: OrgUnitNode) => {
    setSelectedUnit(parentUnit || null)
    setIsEditing(false)
    setShowForm(true)
  }

  const handleEdit = (unit: OrgUnitNode) => {
    setSelectedUnit(unit)
    setIsEditing(true)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedUnit(null)
  }

  const handleFormSubmit = () => {
    handleFormClose()
    handleRefresh()
  }

  const filteredOrgUnits = searchQuery.trim() ? filterOrgUnitHierarchy(orgUnits, searchQuery) : orgUnits

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-full sm:w-64 md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizational units..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => handleAddNew()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Root Unit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organisational Structure</CardTitle>
            <CardDescription>View and manage your organisational hierarchy</CardDescription>
          </CardHeader>
          <CardContent>
            {orgUnits.length === 0 ? (
              <div className="text-center py-8 border rounded-md">
                <p className="text-muted-foreground mb-4">No organisational units found</p>
                <Button onClick={() => handleAddNew()}>Create your first unit</Button>
              </div>
            ) : filteredOrgUnits.length === 0 ? (
              <div className="text-center py-8 border rounded-md">
                <p className="text-muted-foreground mb-4">No units match your search</p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="border rounded-md p-4 max-h-[600px] overflow-auto">
                <OrgUnitEditTree 
                  units={filteredOrgUnits}
                  onAddChild={handleAddNew}
                  onEdit={handleEdit}
                  onRefresh={handleRefresh}
                  searchQuery={searchQuery}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? "Edit Organisational Unit" : "Add Organisational Unit"}</CardTitle>
              <CardDescription>
                {isEditing
                  ? "Update the details of this organisational unit"
                  : selectedUnit
                    ? `Add a new unit under ${selectedUnit.name}`
                    : "Add a new root organisational unit"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrgUnitForm
                allOrgUnits={orgUnits}
                parentUnit={!isEditing ? selectedUnit : undefined}
                unitToEdit={isEditing ? selectedUnit : undefined}
                onClose={handleFormClose}
                onSubmit={handleFormSubmit}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}