'use server'

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from "../ui/sidebar";
import { AppSideBarHome } from "./AppSideBarHome";
import { AppSideBarTheme } from "./AppSideBarTheme";
import { AppSideBarAdmin } from "./AppSideBarAdmin";
import { AppSideBarUser } from "./AppSideBarUser";
import { PermissionGuard } from "../ui/custom/permission-guard-server";

type Props = {
  userName: string | undefined | null;
}

const admin_permissions = ['admin.role', 'admin.org_unit', 'admin.user', 'admin.team']

export async function AppSidebar({ userName } : Props) {

  return (
    <>
      { userName && (
        <Sidebar collapsible="icon">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>g3nACM</SidebarGroupLabel>
              <SidebarGroupContent>
                <AppSideBarHome />
              </SidebarGroupContent>
            </SidebarGroup>
            <PermissionGuard permissions={admin_permissions} requireAll={false} userName={userName}>
              <AppSideBarAdmin />          
            </PermissionGuard>
            <SidebarGroup>
              <SidebarGroupLabel>Apearance</SidebarGroupLabel>
                <SidebarGroupContent>
                  <AppSideBarTheme />
                </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupContent>
                <AppSideBarUser userName={userName} />
              </SidebarGroupContent>
            </SidebarGroup>        
          </SidebarContent>
        </Sidebar>
      )}
    </>
  )
}