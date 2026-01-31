import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from "../ui/sidebar";
import { ChevronRight, Bot } from "lucide-react";
import { PermissionGuard } from "../ui/custom/permission-guard-server";
import Link from "next/link"

type Props = {
  userName: string | undefined | null;
}

export function AppSideBarAI({ userName } : Props) {
  
  return(
    <SidebarGroup>
      <SidebarGroupLabel>AI</SidebarGroupLabel>
      <SidebarMenu>
        <Collapsible asChild className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip='AI Configuration Menu'>
                <Bot />
                <span>AI</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <PermissionGuard permissions={["admin.agent.config"]} userName={userName}>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/admin/agent/config">
                        <span>Agents</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </PermissionGuard>
                <PermissionGuard permissions={["admin.agent.model.config"]} userName={userName}>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/admin/agent/model_config">
                        <span>Agent Models</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </PermissionGuard>
                <PermissionGuard permissions={["user.agent.preference"]} userName={userName}>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/admin/agent/user_preference">
                        <span>Agent User Preferences</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </PermissionGuard>    
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  )

}