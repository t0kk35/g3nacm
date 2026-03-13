import { AlertCircle, FileSearch, UserCheck, Globe } from "lucide-react"

export function getTypeIcon(entity_code: string) {
  switch (entity_code) {
    case "aml.rule.alert":
      return <AlertCircle className="h-6 w-6 text-red-500" />
    case "CDD":
      return <UserCheck className="h-6 w-6 text-blue-500" />
    case "wlm.ns.alert":
      return <FileSearch className="h-6 w-6 text-yellow-500" />
    case "wlm.tf.alert":
      return <Globe className="h-6 w-6 text-orange-500" />
    default:
      return null
  }
}