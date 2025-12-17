import { CardHeader, CardContent } from "../../card"
import { Button } from "../../button"
import { AlertTriangle, RefreshCw } from "lucide-react"

type DynamicScreenErrorProps = {
    title: string;
    error: string;
    onClick: () => Promise<void>
}

export function DynamicScreenError({title, error, onClick}: DynamicScreenErrorProps) {
    return (
      <>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-destructive">{title} - Error</h3>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={onClick} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
              Retry
          </Button>
        </CardContent>
      </>
    )
}