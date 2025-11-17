import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertUserCard } from "@/components/alert/list/AlertUserCard"
import { AlertTable } from "@/components/alert/list/AlertUserTable"
import { Alert } from "@/app/api/data/alert/alert"
import { authorizedFetch } from "@/lib/org-filtering"

type Props = { userName: string }

export async function AlertUserList({ userName} : Props) {

  const alerts = await authorizedFetch(`${process.env.DATA_URL}/api/data/alert/list?assigned_to_user_name=${userName}`)
    .then(res => {
      if (!res) throw new Error(`Could not get alerts for user ${userName}`) 
      else return res.json()
    })
    .then(j => j as Alert[])

  return (
    <div className="container min-h-full p-4">
      <h1 className="text-2xl font-bold mb-2">Your Alerts</h1>
      <Tabs defaultValue="card">
        <TabsList className="mb-2">
          <TabsTrigger value="card">Card View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>
        <TabsContent value="card">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-auto">
            {alerts.map((alert) => (
              <div key={alert.id} className="h-full">
                <AlertUserCard alert={alert} />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="table">
          <AlertTable data={alerts} />
        </TabsContent>
      </Tabs>
    </div>
  )
}