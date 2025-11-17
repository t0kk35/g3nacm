import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { hasPermissions, hasAnyPermission } from "@/lib/permissions/core"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.name) {
      return NextResponse.json(
        { error: "Unauthorized", hasPermission: false },
        { status: 401 }
      )
    }

    const { permissions, requireAll = true } = await request.json()

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Invalid permissions format", hasPermission: false },
        { status: 400 }
      )
    }

    const hasRequiredPermissions = requireAll 
      ? await hasPermissions(session.user.name, permissions)
      : await hasAnyPermission(session.user.name, permissions)

    return NextResponse.json({ hasPermission: hasRequiredPermissions })
  } catch (error) {
    console.error('Permission check API error:', error)
    return NextResponse.json(
      { error: "Internal server error", hasPermission: false },
      { status: 500 }
    )
  }
}