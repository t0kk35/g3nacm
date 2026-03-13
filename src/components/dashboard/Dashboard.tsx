'use server'

import { authorizedFetch, authorizedGetJSON } from "@/lib/org-filtering"
import { DynamicScreenConfig } from "@/app/api/data/dynamic_screen/types"
import { DynamicScreenContainer } from "../ui/custom/dynamic-screen/DynamicScreenContainer"

type Props = {
  userName: string
}

export async function Dashboard({ userName } : Props) {

  // Get the config for the dashboard
  const config = await authorizedGetJSON<DynamicScreenConfig>(`${process.env.DATA_URL}/api/data/dynamic_screen?user_name=${encodeURIComponent(userName)}&screen_name=Dashboard`);

  return(
    <DynamicScreenContainer userName={userName} dynamicScreenConfig={config} />
  )

}