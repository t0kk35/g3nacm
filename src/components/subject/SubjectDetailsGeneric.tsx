'use server'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ComponentSectionRenderer } from "@/components/ui/custom/component-section/ComponentSectionRenderer"
import { ComponentSection } from "@/app/api/data/entity/types"
import { authorizedPostJSON } from "@/lib/org-filtering"
import { Subject } from "@/app/api/data/subject/types"
import { getTranslations } from "next-intl/server"

type Props = { subject: Subject}

export async function SubjectDetailsGeneric({ subject }: Props) {
  
  const t = await getTranslations('Subject.GenericDetails')

  const componentBody = {
    "entity_id": subject.id,
    "section_code": `subject.${subject.type}.details`,
    "schema_version": subject.schema_version,
    "initial_context": {
      "alert": { ...subject }
    }
  }
  const screenData = await authorizedPostJSON<ComponentSection>(`${process.env.DATA_URL}/api/data/entity/component_section`, JSON.stringify(componentBody))
  const kycRisk = (subject.type_specific as { kyc_risk?: string }).kyc_risk

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between items-center">
            <span className="font-mono text-sm text text-muted-foreground">{subject.type_name}</span>
            <span className="text-chart-1">{subject.name}</span>
          { (kycRisk) && (<Badge variant={kycRisk === "HIGH" ? "destructive" : "secondary"}>{kycRisk} {t('BadgeRisk')}</Badge>) }
          </div>
          <div className="flex justify-center items-center">
            <span className="font-sans text-xs text-muted-foreground">{subject.identifier}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Separator className="my-2" />
        <div className="space-y-2 text-muted-foreground text-sm text-center">
          <p>{`${subject.address.number}, ${subject.address.street}, ${subject.address.city}, ${subject.address.postal_code}, ${subject.address.country}`}</p>
          <p>{subject.mail} ({subject.phone})</p>
        </div>
        <Separator className="my-2"/>
        <ComponentSectionRenderer
          sectionConfig={screenData.section_config}
          context={screenData.context}
          errors={screenData.errors}
        />
      </CardContent>
    </Card>
  )
}

export async function SubjectDetailsGenericSkeleton() {
    return (
        <div className="flex flex-col space-y-3 rounded-lg border-2 p-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />            
            </div>
      </div>
    )
}