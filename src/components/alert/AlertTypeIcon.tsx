import { AlertCircle, FileSearch, UserCheck, Globe } from "lucide-react"

export function getTypeIcon(type: string) {
  switch (type) {
    case "TM":
      return <AlertCircle className="h-6 w-6 text-red-500" />
    case "CDD":
      return <UserCheck className="h-6 w-6 text-blue-500" />
    case "NS":
      return <FileSearch className="h-6 w-6 text-yellow-500" />
    case "TF":
      return <Globe className="h-6 w-6 text-orange-500" />
    default:
      return null
  }
}