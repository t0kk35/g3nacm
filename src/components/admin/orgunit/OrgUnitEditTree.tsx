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
import { useTranslations } from "next-intl"

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

  const t = useTranslations('Admin.OrgUnit.EditTree');
  const tc = useTranslations('Common');

  const [deleteTarget, setDeleteTarget] = useState<OrgUnitNode | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const response = await fetch(`/api/action/org_unit/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        toast.success(t('deleteSuccessToast', {deleteTarget: deleteTarget.name}));
        onRefresh();
      } else {
        const err:ApiError = await response.json();
        toast.error(t('deleteFailWMessageToast', { deleteTarget: deleteTarget.name, message: err.message}));
      };
      setDeleteTarget(null);
    } catch (err) {
      toast.error(t('deleteFailToast'))
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
            <AlertDialogTitle>{t('diaglogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('diaglogAreYouSure')} <strong>{deleteTarget?.name}</strong>{t('notBeUndone')}
              {deleteTarget && deleteTarget?.children.length > 0 && (
                <div className="mt-2 flex items-center p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t('hasChildren')}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteTarget ? deleteTarget?.children.length > 0 : undefined}
            >
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}