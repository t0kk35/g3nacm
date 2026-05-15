'use server'

import { authorizedPost } from "@/lib/org-filtering"

export default async function Test() { 

/*  const job = await authorizedPost(
    `${process.env.DATA_URL}/api/action/job/submit`,
    JSON.stringify({ "jobType": "hello-world", "payload": { "name": "Alice" }, "priority": 1 })
  ) */

  const job = await authorizedPost(
    `${process.env.DATA_URL}/api/action/job/submit`,
    JSON.stringify({
      "jobType": "rfi.process-inbound-mail",
      "payload": { "channel_code": "mail-in", "workflow_action_code": "system.rfi.outbound.process_reply" }
    })
  )

  const res = await job.json()

  return (
    <div>
      <h3>Test For Jobs</h3>
      <p>Job : {JSON.stringify(res)})</p>
    </div>
  )
}