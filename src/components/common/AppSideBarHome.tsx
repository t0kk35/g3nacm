'use server'

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "../ui/sidebar"
import { Home } from "lucide-react"

export async function AppSideBarHome() {
  return(
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <a href="/">
            <Home/>
            Home
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>    
  )
}