'use client'

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "../skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "./markdown"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Upload, Download, Eye, FileText, ImageIcon, File, Paperclip } from "lucide-react"
import { cn } from "@/lib/utils"
import { EntityAttachment } from "@/app/api/data/attachment/types"
import { PerformWorkflowAction } from "@/app/api/action/workflow/workflow"
import { APIError } from "@/lib/api-error-handling"

interface EntityAttachmentsProps {
  entityId: string
  entityCode: string
  orgUnitCode:string
  className?: string
}

export function EntityAttachments({
  entityId,
  entityCode,
  orgUnitCode,
  className,
}: EntityAttachmentsProps) {
  const [attachments, setAttachments] = useState<EntityAttachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewFile, setPreviewFile] = useState<EntityAttachment | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [uploadDescription, setUploadDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load the attachments. We do this in the client because we need to refresh when a new attachemnt is loaded, and we don't want to refresh the entire page
    async function load() {
      setIsLoading(true);
      setAttachments(await loadAttachments())
      setIsLoading(false);
    }
    load();
  }, [])

  const loadAttachments = async() => {
      const res = await fetch(`/api/data/attachment/list?entity_code=${encodeURIComponent(entityCode)}&entity_id=${encodeURIComponent(entityId)}`);
      if (!res.ok) throw Error('Could not fetch attachments');
      const attachments = await res.json() as EntityAttachment[];
      const activeAttachments = attachments
        .filter((att) => att.is_active)
        .sort((a, b) => new Date(b.upload_date_time).getTime() - new Date(a.upload_date_time).getTime())
      return activeAttachments
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (mimeType === "application/pdf") return <FileText className="h-4 w-4" />
    if (mimeType.startsWith("text/")) return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const canPreview = (mimeType: string) => {
    return (
      mimeType.startsWith("image/") ||
      mimeType === "application/pdf" ||
      mimeType.startsWith("text/") ||
      mimeType === "text/markdown"
    )
  }

  const isMarkdownFile = (attachment: EntityAttachment) => {
    return attachment.mime_type === "text/markdown" || 
           attachment.original_filename.toLowerCase().endsWith('.md') ||
           attachment.original_filename.toLowerCase().endsWith('.markdown')
  }

  const onUpload = async (file: File, description: string) => {
    // Send as FormData
    const formData = new FormData();
    const action: PerformWorkflowAction = {
      entityCode: entityCode,
      entityId: entityId,
      entityData: {},
      orgUnitCode: orgUnitCode,
      actionCode: 'eur.aml.rule.alert.attach_file',
      data: {
        'file.1.description': description,
        'file.1.org_unit': orgUnitCode,
      },
      files: {
        'file.1': file
      }
    }
    formData.append('actions', JSON.stringify([action]))
    formData.append('file.1', file)
    const requestBody = formData

    const res = await fetch(`/api/action/workflow`, {
        method: "POST",
        body: requestBody,
      });
    
    if (!res.ok) {
      throw new Error(`Could not perform workflow action ${ (await res.json() as APIError).message}`)
    }
  }

  const onRefresh = () => {
    async function refresh() {
      setAttachments(await loadAttachments())
    }
    refresh();
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setSelectedFile(files[0])
      setShowUploadDialog(true)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      setShowUploadDialog(true)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      await onUpload(selectedFile, uploadDescription)
      setShowUploadDialog(false)
      setSelectedFile(null)
      setUploadDescription("")
      onRefresh()
      toast.success(`File uploaded successfully ${selectedFile.name} has been attached.`)
    } catch (error) {
      toast.error("Upload failed. There was an error uploading the file.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (attachment: EntityAttachment) => {
    try {
      const response = await fetch(`/api/data/attachment/detail?attachment_id=${encodeURIComponent(attachment.id)}&download=true`)
      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = attachment.original_filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast.error("Download failed. There was an error downloading the file.")
    }
  }

  const handlePreview = async (attachment: EntityAttachment) => {
    setPreviewFile(attachment)
    setPreviewContent(null)
    setShowPreviewDialog(true)

    if (isMarkdownFile(attachment)) {
      setIsLoadingPreview(true)
      try {
        const response = await fetch(`/api/data/attachment/detail?attachment_id=${encodeURIComponent(attachment.id)}`)
        if (response.ok) {
          const content = await response.text()
          setPreviewContent(content)
        }
      } catch (error) {
        console.error('Failed to fetch markdown content:', error)
      } finally {
        setIsLoadingPreview(false)
      }
    }
  }

  const renderPreview = (attachment: EntityAttachment) => {
    const previewUrl = `/api/data/attachment/detail?attachment_id=${encodeURIComponent(attachment.id)}`

    if (attachment.mime_type.startsWith("image/")) {
      return (
        <img
          src={previewUrl || "/placeholder.svg"}
          alt={attachment.original_filename}
          className="max-w-full max-h-96 object-contain"
        />
      )
    }

    if (attachment.mime_type === "application/pdf") {
      return <iframe src={previewUrl} className="w-full h-96" title={attachment.original_filename} />
    }

    if (isMarkdownFile(attachment)) {
      if (isLoadingPreview) {
        return (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground animate-pulse">Loading markdown preview...</div>
          </div>
        )
      }
      
      if (previewContent) {
        console.log('file content ' + previewContent )
        return (
          <div className="w-full max-h-96 overflow-auto p-4 prose prose-sm dark:prose-invert max-w-none">
            <Markdown content={previewContent} />
          </div>
        )
      }

      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <p>Failed to load markdown content</p>
        </div>
      )
    }

    if (attachment.mime_type.startsWith("text/")) {
      return (
        <div className="w-full h-96 overflow-auto">
          <iframe src={previewUrl} className="w-full h-full border-0" title={attachment.original_filename} />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p>Preview not available for this file type</p>
      </div>
    )
  }

  return (
    <>
      { isLoading ? (
        <EntityAttachmentSkeleton />
      ) : (
        <>
          <Card className={cn("w-full", className)}>
            <CardContent className="p-2">
              {/* Collapsed State */}
              {!isExpanded && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)} className="p-1 h-auto">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Attachments ({attachments.length})</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8">
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
              )}

              {/* Expanded State */}
              {isExpanded && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)} className="p-1 h-auto">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Attachments ({attachments.length})</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                      isDragOver
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50",
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop files here, or{" "}
                      <button onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline">
                        browse
                      </button>
                    </p>
                  </div>

                  {/* File List */}
                  { attachments.length > 0 && (
                    <div  className={cn("space-y-2", attachments.length > 5 && "max-h-80 overflow-y-auto pr-2")}>
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getFileIcon(attachment.mime_type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{attachment.original_filename}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatFileSize(attachment.file_size)}</span>
                                <span>•</span>
                                <span>{attachment.uploaded_by_user_name}</span>
                                <span>•</span>
                                <span>{new Date(attachment.upload_date_time).toLocaleDateString()}</span>
                              </div>
                              {attachment.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">{attachment.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {canPreview(attachment.mime_type) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(attachment)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(attachment)}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {attachments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No files attached yet</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hidden File Input */}
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

          {/* Upload Dialog */}
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload File</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedFile && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {getFileIcon(selectedFile.type)}
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add a description for this file..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Preview Dialog */}
          <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="truncate">{previewFile?.original_filename}</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto">{previewFile && renderPreview(previewFile)}</div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  )
}

export function EntityAttachmentSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" /> {/* Chevron Button */}
            <Skeleton className="h-4 w-4 rounded" />     {/* Paperclip Icon */}
            <Skeleton className="h-4 w-32" />           {/* "Attachments (…)" */}
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />  {/* Upload button */}
        </div>
      </CardContent>
    </Card>
  )
}