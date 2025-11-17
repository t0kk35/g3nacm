'use client'

import { toast } from "sonner"
import { useRef } from "react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Check, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkflowActionForm } from "./workflow-action-form/workflow-action-form"
import { WorkflowAction, WorkflowConfig } from "@/app/api/data/workflow/types"
import { PerformWorkflowAction } from "@/app/api/action/workflow/workflow"


type Props = {
    orgUnitCode: string;
    entityCode: string;
    entityId: string;
    entityIdentifier: string;
    entityData:any;
    stateCode: string;
}

export function WorkflowSelector({ orgUnitCode, entityCode, entityId, entityIdentifier, entityData, stateCode } : Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false)
  const [actions, setActions] = useState<WorkflowAction[]>([])
  const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  // Set data on load
  useEffect(() => {
    const getActions = async () => {
      try {
        setLoading(true)
        const data = await fetchWorkflowActions(orgUnitCode, entityCode, stateCode)
        setActions(data)
        setError(null)
      } catch (err) {
        setError("Failed to load workflow actions")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    getActions()
  }, [])

  // Scroll logic, we would like the workflow button to be in scope.
  useEffect(() => {
    if (selectedAction && buttonContainerRef.current) {
      // Small delay to ensure the DOM has updated with the form fields
      setTimeout(() => {
        buttonContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    }
  }, [selectedAction])  

  // Function to fetch the actions that are available from the current state.
  async function fetchWorkflowActions(orgUnitCode: string, entityCode: string, state: string): Promise<WorkflowAction[]> {
    const workflow = await fetch(`/api/data/workflow?org_unit_code=${orgUnitCode}&entity_code=${entityCode}`)
      .then(res => { 
          if (!res.ok) throw new Error("Failed to fetch workflow actions") 
          else return res.json()
          })
      .then(j => j as WorkflowConfig)
    
    const actions = workflow.actions.filter((a) => a.from_state_code === state)
    return actions
  }

  // When an action is selected do....
  const handleSelect = (action: WorkflowAction) => {
    setSelectedAction(action)
    setOpen(false)
    // Reset form data and errors when selecting a new action
    setFormData({})
    setFormErrors({})
  }

  const handleFormChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field when it's changed
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    if (!selectedAction) return true
    if (selectedAction.form_fields.length === 0) return true

    const newErrors: Record<string, string> = {}
    let isValid = true

    // Basic validation for required fields
    selectedAction.form_fields?.forEach((field) => {
      if (field.required && (!formData[field.code] || formData[field.code] === "")) {
        newErrors[field.code] = `${field.label} is required`
        isValid = false
      }
    })

    setFormErrors(newErrors)
    return isValid
  }

  // Perform the workflow action
  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      if (!selectedAction) throw new Error("Failed to exectute action. No action selected");

      // Create the initial data for the worlfow context. Creates an object named data
      // with the keys of the field names. (Important for the workflow mapping)
      const data:Record<string, any> = {}
      const files:Record<string, File> = {}
      
      selectedAction.form_fields.forEach((field) => {
        const value = formData[field.code]
        if (value instanceof File) {
          files[field.name] = value
        } else {
          data[field.name] = value
        }
      })

      // Create a workflow action object, this contains all the data the action needs.
      const action: PerformWorkflowAction = {
        entityCode: entityCode,
        entityId: entityId,
        entityData: entityData,
        orgUnitCode: orgUnitCode,
        actionCode: selectedAction.code,
        data: data,
        ...(Object.keys(files).length > 0 && { files })
      }

      // Determine if we need to send FormData (has files) or JSON
      const hasFiles = Object.keys(files).length > 0
      let requestBody: string | FormData
      let headers: Record<string, string> = {}

      if (hasFiles) {
        // Send as FormData
        const formData = new FormData()
        formData.append('actions', JSON.stringify([action]))
        
        // Add files to FormData using field names as keys
        Object.entries(files).forEach(([fieldName, file]) => {
          formData.append(fieldName, file)
        })
        
        requestBody = formData
        // Don't set Content-Type header - browser will set it with boundary
      } else {
        // Send as JSON (backward compatibility)
        headers["Content-Type"] = "application/json"
        requestBody = JSON.stringify([action])
      }

      // Call the workflow end-point to execute the workflow
      const response = await fetch(`/api/workflow/perform_action`, {
        method: "POST",
        headers: headers,
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error("Failed to execute workflow action")
      }
      // Handle successful submission
      toast.info(`${new Date().toLocaleString()} Performed action ${selectedAction.name} on ${entityIdentifier}`);
      setFormData({})
      // Check if we need to redirect
      if (selectedAction.redirect_url) {
        router.push(selectedAction.redirect_url)
      } else {
        const new_actions = await fetchWorkflowActions(orgUnitCode, entityCode, selectedAction.to_state_code);
        setActions(new_actions);  
        setSelectedAction(null)
      }
    } catch (err) {
      console.error(err)
      alert("Failed to execute workflow action. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full border border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle>Workflow Actions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading actions...</span>
          </div>
        ) : error ? (
          <div className="py-2 text-sm text-destructive">{error}</div>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between bg-background"
              >
                {selectedAction ? selectedAction.name : "Select an action..."}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search actions..." />
                <CommandList>
                  <CommandEmpty>No actions found.</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-auto">
                    {actions.map((action) => (
                      <CommandItem
                        key={action.code}
                        value={action.name}
                        onSelect={() => handleSelect(action)}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <span>{action.name}</span>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                        {selectedAction?.code === action.code && <Check className="h-4 w-4 text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {selectedAction && selectedAction.form_fields.length !== 0 && (
          <div className="mt-4 border rounded-md p-4 bg-background">
            <WorkflowActionForm
              fields={selectedAction.form_fields || []}
              formData={formData}
              formErrors={formErrors}
              onChange={handleFormChange}
            />
          </div>
        )}

        {selectedAction && (
          <div className="mt-4" ref={buttonContainerRef}>
            { /* 
              Note on the diabled options. 
              Had to add this. If a SelectBox folds open over a standard disabled button, the select box becomes transparent 
            */}
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-100 disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                (selectedAction?.form_fields.length !== 0 &&
                  // Disable if there are form errors
                  (Object.keys(formErrors).length > 0 ||
                    // Or if required fields are empty (not yet validated)
                    selectedAction.form_fields?.some(
                      (field) => field.required && (!formData[field.code] || formData[field.code] === ""),
                    )))
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Execute Action"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}