'use server'

import { TFAlert } from "@/app/api/data/alert/alert"
import { authorizedFetch } from "@/lib/org-filtering"
import { TFAlertDetailsMainClient } from "./TFAlertDetailsMainClient"
import { TFTransaction } from "@/app/api/data/transaction/transaction"

type Props = {
  alert: TFAlert
}

export async function TFAlertDetailsMain({ alert }: Props) {

    const tfTtransaction = await authorizedFetch(`${process.env.DATA_URL}/api/data/transaction/tf_message?message_id=${alert.detections[0].message_id}`)
        .then(res => {
            if (!res.ok) throw new Error('Error Fetching the TFTransaction');
            else return res.json();
        })
        .then(res => res as TFTransaction)

    return (
        <div>
            <TFAlertDetailsMainClient alert={alert} tfTransaction={tfTtransaction} />
        </div>
    )
}
