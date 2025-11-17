'use client'

import type React from "react"

import { useRouter } from 'next/navigation';
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner";
import { FormError } from "@/components/ui/custom/form-error";
import { OrgUnit, OrgUnitNode } from "@/app/api/data/org_unit/org_unit"
import { OrgUnitRequest } from "@/app/api/action/org_unit/org-unit";

type OrgUnitFormProps = {
  allOrgUnits: OrgUnitNode[];
  parentUnit?: OrgUnitNode | null;
  unitToEdit?: OrgUnitNode | null;
  onClose: () => void;
  onSubmit: () => void;
}

export function OrgUnitForm({ allOrgUnits, parentUnit, unitToEdit, onClose, onSubmit }: OrgUnitFormProps) {
  const router = useRouter();
  const [code, setCode] = useState(unitToEdit?.code || "")
  const [codeError, setCodeError] = useState("")
  const [name, setName] = useState(unitToEdit?.name || "")
  const [submitting, setSubmitting] = useState(false)

  const isEditing = !!unitToEdit

  const flatOrgList = useMemo(() => {
    const result: OrgUnit[] = [];

    const recurse = (node: OrgUnitNode) => {
      const { children, ...orgUnit } = node;
      result.push(orgUnit); // Strip out children for flat OrgUnit
      for (const child of children) {
        recurse(child);
      }
    };

    for (const node of allOrgUnits) {
      recurse(node);
    }
    return result;

  }, [allOrgUnits])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const orgData:OrgUnitRequest = {
        code,
        name,
        parent_id: isEditing ? unitToEdit.parent_id : parentUnit?.id || null,
      }

      // Replace with your actual API endpoint
      const url = isEditing ? `/api/action/org_unit/${unitToEdit.id}` : '/api/action/org_unit'

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orgData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to save organisational unit")
      }

      toast.success(isEditing ? `${name} has been updated.` : `${name} has been created.`);
      // Refresh will reload the entire page.
      router.refresh();
      onSubmit()
    } catch (error) {
      console.error("Error saving org unit:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save organisational unit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const checkCodeExists = (codeToCheck: string) => {
    // Skip validation if we're editing and the code hasn't changed
    if (isEditing && codeToCheck === unitToEdit.code) {
      return false
    }

    console.log('All Org units ' + JSON.stringify(allOrgUnits));
    return flatOrgList.some(
      (unit) => unit.code.toLowerCase() === codeToCheck.toLowerCase() && (!isEditing || unit.id !== unitToEdit?.id),
    )
  }

  const validateCode = (newCode: string) => {
    setCode(newCode.toUpperCase())

    if (newCode.length < 2) {
      setCodeError("Code must be at least 2 characters");
      return;
    }

    if (newCode.length > 5) {
      setCodeError("Code must not be bigger than 5 characters");
      return;
    }

    if (checkCodeExists(newCode)) {
      setCodeError("This code is already in use");
      return;
    }

    setCodeError("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {parentUnit && (
        <div className="p-3 bg-muted rounded-md mb-4">
          <p className="text-sm font-medium">Parent Unit</p>
          <p className="text-sm">
            {parentUnit.name} ({parentUnit.code})
          </p>
          <p className="text-xs text-muted-foreground mt-1">Path: {parentUnit.path}</p>
        </div>
      )}

      {isEditing ? (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm font-medium">Code</p>
          <p className="text-sm font-mono font-bold text-chart-1">{unitToEdit.code}</p>
          <p className="text-xs text-muted-foreground mt-1">The org-unit code can not be changed</p>
        </div>
      ) : (
      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => validateCode(e.target.value)}
          placeholder="Enter unit code"
          maxLength={10}
          required
        />
        <FormError error={codeError} />
        <p className="text-xs text-muted-foreground">A short unique identifier for this unit (e.g., EUR, NA, APAC)</p>
      </div>        
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter unit name"
          required
        />
        <p className="text-xs text-muted-foreground">The full name of this organisational unit</p>
      </div>

      {isEditing && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm font-medium">Current Path</p>
          <p className="text-sm font-mono font-bold">{unitToEdit.path}</p>
          <p className="text-xs text-muted-foreground mt-1">The path is automatically maintained by the system</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !!codeError || code.length < 2 || name.length < 3}>
          {submitting && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {isEditing ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  )
}