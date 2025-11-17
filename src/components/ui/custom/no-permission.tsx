'use server'

import { Shield, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  title?: string
  message?: string
}

export async function NoPermission({
  title = "Access Denied",
  message = "You don't have permission to access this page. Please contact your administrator if you believe this is an error.",
}: Props) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="relative mb-6">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center">
              <Lock className="w-3 h-3 text-destructive-foreground" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{message}</p>

        </CardContent>
      </Card>
    </div>
  )
}
