'use server'

import { auth } from "@/auth"
import { authorizedGetJSON } from "@/lib/org-filtering"
import { DynamicScreenConfig } from "@/app/api/data/dynamic_screen/types"
import { DynamicScreenContainer } from "@/components/ui/custom/dynamic-screen/DynamicScreenContainer"

export default async function Home() {
  const session = await auth()
  if (!session) throw new Error("No session found in main page")
  const user = session?.user
  if (!user?.name) throw new Error("No user-name found in main page")

  // Get the config for the dashboard
  const config = await authorizedGetJSON<DynamicScreenConfig>(`${process.env.DATA_URL}/api/data/dynamic_screen?user_name=${encodeURIComponent(user.name)}&screen_name=Dashboard`);

  return (
    <div className="p-4">
      <DynamicScreenContainer userName={user.name} dynamicScreenConfig={config} />
    </div>
  );
}
