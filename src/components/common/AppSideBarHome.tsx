'use server'

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "../ui/sidebar"
import { Home } from "lucide-react"
import Link from "next/link"

export async function AppSideBarHome() {
  return(
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link href="/">
            <Home/>
            Home
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}