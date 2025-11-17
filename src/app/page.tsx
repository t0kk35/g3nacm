'use server'

import { auth } from "@/auth"
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AlertUserList } from "@/components/alert/list/AlertUserList"
import { Dashboard } from "@/components/dashboard/Dashboard"

export default async function Home() {
  const session = await auth()
  if (!session) throw new Error("No session found in main page")
  const user = session?.user
  if (!user?.name) throw new Error("No user-name found in main page")

  return (
    <div className="p-4">
      <h2 className="text-base mb-4">Welcome to your home page {user?.name}</h2>
      <div>
        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="alerts">Your Alerts</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="space-y-4">
            <Dashboard userName={user.name} />
          </TabsContent>
          <TabsContent value="alerts" className="space-y-4">
            <AlertUserList userName={user.name} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
