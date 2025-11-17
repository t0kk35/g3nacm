'use server'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { authorizedFetch } from "@/lib/org-filtering"
import { Subject, CorporateSubject, IndividualSubject } from "@/app/api/data/subject/types"
import Link from "next/link"

type Props = { subjectId: string}

export async function AlertDetailsSubject({ subjectId }: Props) {
    
    const subject = await authorizedFetch(`${process.env.DATA_URL}/api/data/subject/subject_detail/${subjectId}`)
        .then(res => res.json())
        .then(j => j as Subject)

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                        <span className="font-mono font-thin text-sm text-muted-foreground">{subject.type}</span>
                    </div>
                    <div>
                        <span>{subject.name}</span>
                        <Link href={`/subject/${subject.id}`} className="block text-sm text-primary hover:underline">
                            {subject.identifier}
                        </Link>
                    </div>
                    <Badge variant={subject.kyc_risk === "HIGH" ? "destructive" : "secondary"}>{subject.kyc_risk} Risk</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Separator className="my-2" />
                <div className="space-y-2 text-muted-foreground text-sm text-center">
                    <p>{`${subject.address.number}, ${subject.address.street}, ${subject.address.city}, ${subject.address.postal_code}, ${subject.address.country}`}</p>
                    <p>{subject.mail} ({subject.phone})</p>
                </div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <p>
                            <strong>Status:</strong> {subject.status}
                        </p>
                        <p>
                            <strong>Acquisition Date:</strong> {subject.acquisition_date}
                        </p>
                    </div>
                    <div>
                        {subject.type === "IND" && (
                        <>
                            <p>
                                <strong>Date of Birth:</strong> {(subject as IndividualSubject).type_specific.date_of_birth}
                            </p>
                            <p>
                                <strong>Nationality:</strong> {(subject as IndividualSubject).type_specific.nationality}
                            </p>
                            <p>
                                <strong>Profession:</strong> {(subject as IndividualSubject).type_specific.profession}
                            </p>
                            <p>
                                <strong>Employment:</strong> {(subject as IndividualSubject).type_specific.employment_status}
                            </p>
                        </>)}
                        {subject.type === "CRP" && (
                        <>
                            <p>
                                <strong>Incorporation Date:</strong> {(subject as CorporateSubject).type_specific.incorporation_date}
                            </p>
                            <p>
                                <strong>Registration Number:</strong>{" "} {(subject as CorporateSubject).type_specific.registration_number}
                            </p>
                            <p>
                                <strong>Segment:</strong> {(subject as CorporateSubject).type_specific.segment}
                            </p>
                            <p>
                                <strong>Tax Number:</strong> {(subject as CorporateSubject).type_specific.tax_number}
                            </p>
                        </>)}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export async function AlertDetailsSubjectSkeleton() {
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