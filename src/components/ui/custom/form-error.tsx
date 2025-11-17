import { AlertTriangle } from "lucide-react"

type Props = {
    error: string
}

export function FormError({ error } : Props) {
    return (
        <div className={`
            overflow-hidden transition-all duration-500 ease-in-out
            ${error ? "opacity-100 max-h-40 translate-y-0" : "opacity-0 max-h-0 -translate-y-1"}
        `}>
            <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="flex-1">
                    { error }
                </p>
            </div>
        </div>
    )
}