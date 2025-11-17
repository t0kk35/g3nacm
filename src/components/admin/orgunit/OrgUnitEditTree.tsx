import { OrgUnitTreeBase } from "./OrgUnitTreeBase"
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { OrgUnitNode } from "@/app/api/data/org_unit/org_unit"
import { toast } from "sonner"
import { ApiError } from "next/dist/server/api-utils"

export function OrgUnitEditTree({
  units,
  onAddChild,
  onEdit,
  onRefresh,
  searchQuery = "",
}: {
  units: OrgUnitNode[]
  onAddChild: (unit: OrgUnitNode) => void
  onEdit: (unit: OrgUnitNode) => void
  onRefresh: () => void
  searchQuery?: string
}) {
  const [deleteTarget, setDeleteTarget] = useState<OrgUnitNode | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const response = await fetch(`/api/action/org_unit/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toast.success(`Organisational Unit ${deleteTarget.name} removed.`);
        onRefresh();
      } else {
        const err:ApiError = await response.json();
        toast.error(`Could not delete the organisational unit ${deleteTarget}. Message ${err.message}`);
      };
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Could not delete organisational unit")
    }
  }

  return (
    <>
      <OrgUnitTreeBase
        units={units}
        searchQuery={searchQuery}
        renderActions={(unit) => (
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" onClick={() => onAddChild(unit)} className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(unit)} className="h-7 w-7">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => setDeleteTarget(unit)}
              disabled={unit.children.length > 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organizational Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
              {deleteTarget && deleteTarget?.children.length > 0 && (
                <div className="mt-2 flex items-center p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  This unit has children and cannot be deleted.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteTarget ? deleteTarget?.children.length > 0 : undefined}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
