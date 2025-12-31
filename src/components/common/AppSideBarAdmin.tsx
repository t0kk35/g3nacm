import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from "../ui/sidebar";
import { ChevronRight, UserRoundCog } from "lucide-react";
import Link from "next/link"

export function AppSideBarAdmin() {
  return(
    <SidebarGroup>
      <SidebarGroupLabel>Admin</SidebarGroupLabel>
      <SidebarMenu>
        <Collapsible asChild className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip='Administration Menu'>
                <UserRoundCog />
                <span>Admin</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/admin/orgunit">
                      <span>Organisational Units</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>                
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/admin/user">
                      <span>Users</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>                
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/admin/role">
                      <span>Roles</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/admin/team">
                      <span>Teams</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/admin/rule">
                      <span>Team Assigment Rules</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>                                                 
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  )
}