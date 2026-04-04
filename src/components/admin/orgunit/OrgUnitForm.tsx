'use client'

import type React from "react"

import { useRouter } from 'next/navigation';
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner";
import { OrgUnit, OrgUnitNode } from "@/app/api/data/org_unit/org_unit"
import { useValidationForm, FormFieldInput } from "@/components/ui/custom/form-field"
import { OrgUnitRequest } from "@/app/api/action/org_unit/org-unit";
import { useTranslations } from "next-intl";

type OrgUnitFormProps = {
  allOrgUnits: OrgUnitNode[];
  parentUnit?: OrgUnitNode | null;
  unitToEdit?: OrgUnitNode | null;
  onClose: () => void;
  onSubmit: () => void;
}

export function OrgUnitForm({ allOrgUnits, parentUnit, unitToEdit, onClose, onSubmit }: OrgUnitFormProps) {
  
  const t = useTranslations('Admin.OrgUnit.Form');
  const tc = useTranslations('Common');
  
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false)

  const isEditing = !!unitToEdit

  const form = useValidationForm(
    {
      code: unitToEdit?.code || "",
      name: unitToEdit?.name || ""
    },
    {
      code: (v) => {
        if (v.length < 2) return t('atLeast2CharsError');
        if (v.length > 5) return t('noMorethan5CharsError');
        if (checkCodeExists(v)) return t('alreadyInUseError');
        return undefined
      }
    }
  )

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

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      const orgData:OrgUnitRequest = {
        code: form.values.code,
        name: form.values.name,
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

      toast.success(isEditing ? t('toastUpdated', { name: form.values.name }) : t('toastCreated', { name: form.values.name }));
      // Refresh will reload the entire page.
      router.refresh();
      onSubmit()
    } catch (error) {
      console.error("Error saving org unit:", error)
      toast.error(error instanceof Error ? error.message : t('toastFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const checkCodeExists = (codeToCheck: string) => {
    // Skip validation if we're editing and the code hasn't changed
    if (isEditing && codeToCheck === unitToEdit.code) {
      return false
    }

    return flatOrgList.some(
      (unit) => unit.code.toLowerCase() === codeToCheck.toLowerCase() && (!isEditing || unit.id !== unitToEdit?.id),
    )
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {parentUnit && (
        <div className="p-3 bg-muted rounded-md mb-4">
          <p className="text-sm font-medium">{t('parentUnit')}</p>
          <p className="text-sm">
            {parentUnit.name} ({parentUnit.code})
          </p>
          <p className="text-xs text-muted-foreground mt-1">{t('path')} {parentUnit.path}</p>
        </div>
      )}

      {isEditing ? (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm font-medium">{t('codeFieldLabel')}</p>
          <p className="text-sm font-mono font-bold text-chart-1">{unitToEdit.code}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('codeCanNotChange')}</p>
        </div>
      ) : (
        <FormFieldInput
          id="code"
          label={t('codeFieldLabel')}
          value={form.values.code}
          onChange={(v) => form.setField("code", v)}
          error={form.errors.code}
          placeholder={t('codeFieldPlaceholder')}
          disabled={isEditing}
          required
          description={t('codeFieldDescription')}
        />    
      )}
      <FormFieldInput
        id="name"
        label={t('nameFieldLabel')}
        value={form.values.name}
        onChange={(v) => form.setField("name", v)}
        error={form.errors.name}
        placeholder={t('nameFieldPlaceholder')}
        required
        description={t('nameFieldDescription')}
      />

      {isEditing && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm font-medium">{t('currentPath')}</p>
          <p className="text-sm font-mono font-bold">{unitToEdit.path}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('pathIsSystem')}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {tc('cancel')}
        </Button>
        <Button type="submit" disabled={submitting || !!form.errors.code || form.values.code.length < 2 || form.values.name.length < 3}>
          {submitting && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {isEditing ? tc('update') : tc('create')}
        </Button>
      </div>
    </form>
  )
}