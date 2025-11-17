import { Alert } from "@/app/api/data/alert/alert";
import { Separator } from "@/components/ui/separator";

type Props = { alert: Alert }

export function AlertUserDetection({ alert }: Props) {

  return (
    <div className="text-sm">
      {alert.alert_type === "TM" && (
        <>
          <h3 className="text-sm font-semibold mb-2">Detections</h3>
          <Separator className="my-2" />
          {alert.detections.map((d) =>
            <div key={d.id} className="mb-2">
              <p><strong>{d.name}</strong></p>
              <p className="text-xs text-muted-foreground">{d.info}</p>
              <p className="text-xs">
                Score: {d.score}, Time Frame: {d.time_frame}
              </p>
            </div>
          )}
        </>
      )}
      {alert.alert_type === "NS" && (
        <>
          {alert.detections.map((d) =>
            <div key={d.id} className="mb-2">
              <p><strong>Input Data:</strong> {d.input_data}</p>
              <p><strong>List Data:</strong> {d.list_data}</p>
              <p>
                Score: {d.score}, Algorithm: {d.algorithm}
              </p>
            </div>
          )}
        </>
      )}
      {alert.alert_type === "CDD" && (
        <>
          {alert.detections.map((d) => 
            <div key={d.id} className="mb-2">
              <p>
                <strong>Risk Contributor:</strong> {d.risk_contributor}
              </p>
              <p>Risk Weight: {d.risk_weight}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}