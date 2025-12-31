'use client'

import { Button } from "../ui/button"
import { Save } from "lucide-react"

type SaveSubmitFormButtonProps = {
  saving: boolean
  isEditing: boolean
  editText: string
  newText: string
}

/**
 * A Helper component to keep the saving button consistent
 */
export function SaveSubmitFormButton({ saving, isEditing, editText, newText }: SaveSubmitFormButtonProps) {
  return(
    <Button type="submit" disabled={saving} className="ml-auto">
      {saving && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      <Save className="mr-2 h-4 w-4" />
      {isEditing ? editText : newText}
    </Button>
  )
}