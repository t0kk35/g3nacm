'use server'

import { authorizedFetch } from "@/lib/org-filtering"
import { Suspense } from "react"
import { Skeleton } from "../ui/skeleton"
import { DynamicScreenConfig } from "@/app/api/data/dynamic_screen/types"
import { DynamicScreenContainer } from "../ui/custom/dynamic-screen/DynamicScreenContainer"

type Props = {
  userName: string
}

export async function Dashboard({ userName } : Props) {

  // Get the config for the dashboard
  const res = await authorizedFetch(`${process.env.DATA_URL}/api/data/dynamic_screen?user_name=${encodeURIComponent(userName)}&screen_name=Dashboard`);
  if (!res.ok) { throw new Error('Could not get dashboard config')};
  const config:DynamicScreenConfig = await res.json();

  return(
    <DynamicScreenContainer dynamicScreenConfig={config} />
  )

}