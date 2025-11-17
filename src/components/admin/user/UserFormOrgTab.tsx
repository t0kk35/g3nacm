'use client'

import { useState } from "react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { OrgUnitSelectTree } from "../orgunit/OrgUnitSelectTree"
import { OrgUnitNode } from "@/app/api/data/org_unit/org_unit"

type Props = {
    orgs: OrgUnitNode[];
    selectedIds: number[];
    toggleOrg: (id: number) => void
}

export function UserFormOrgTab({ orgs, selectedIds, toggleOrg}: Props ) {

    const [orgSearch, setOrgSearch] = useState("");

    // Count selected orgs
    const selectedOrgCount = selectedIds.filter(id => id !== null && id !== undefined).length

    return (
		<>
			<CardHeader className="pb-3">
				<div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
					<div>
						<CardTitle>Org Unit</CardTitle>
						<CardDescription className="flex items-center gap-2">
							Select Organsisational Units for this user
                            {selectedOrgCount > 0 && (
								<Badge variant="secondary" className="ml-2">
									{selectedOrgCount} selected
								</Badge>
							)}
						</CardDescription>
					</div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
					    <div className="relative w-full sm:w-64">
						    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search Organisational Units..."
								className="pl-8"
								value={orgSearch}
								onChange={(e) => setOrgSearch(e.target.value)}
							/>
						</div>
					</div>      
                </div>          
            </CardHeader>
            <CardContent>
                <OrgUnitSelectTree
                    units={orgs}
                    selectedIds={selectedIds}
                    onToggle={toggleOrg}
                    searchQuery={orgSearch}
                />
            </CardContent>
        </>
    )
}