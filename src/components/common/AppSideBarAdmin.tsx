import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from "../ui/sidebar";
import { ChevronRight, UserRoundCog } from "lucide-react";

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
                    <a href="/admin/orgunit">
                      <span>Organisational Units</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>                
                <SidebarMenuSubItem></SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <a href="/admin/user">
                      <span>Users</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>                
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <a href="/admin/role">
                      <span>Roles</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <a href="/admin/team">
                      <span>Teams</span>
                    </a>
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