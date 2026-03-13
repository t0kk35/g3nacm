'use server'

import { auth } from "@/auth"
import { Dashboard } from "@/components/dashboard/Dashboard"

export default async function Home() {
  const session = await auth()
  if (!session) throw new Error("No session found in main page")
  const user = session?.user
  if (!user?.name) throw new Error("No user-name found in main page")

  return (
    <div className="p-4">
      <Dashboard userName={user.name} />
    </div>
  );
}
