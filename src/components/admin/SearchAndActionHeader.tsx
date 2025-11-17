
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Search, List, LayoutGrid, Plus } from "lucide-react";

type Props =  {
  searchPlaceholder: string;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  viewMode: "grid" | "table";
  setViewMode: (value: "grid" | "table") => void;
  newButtonLabel: string;
  newButtonHref: string;
}

export function SearchAndActionsHeader( {  
    searchPlaceholder,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    newButtonLabel,
    newButtonHref } : Props ) {

    return (
        <Card className="pt-5">
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative w-full sm:w-64 md:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <ToggleGroup
                            type="single"
                            value={viewMode}
                            onValueChange={(value: any) => value && setViewMode(value as "grid" | "table")}
                        >
                            <ToggleGroupItem value="table" aria-label="Table view">
                                <List className="h-4 w-4" />
                            </ToggleGroupItem>
                            <ToggleGroupItem value="grid" aria-label="Grid view">
                                <LayoutGrid className="h-4 w-4" />
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <Button asChild>
                            <Link href={newButtonHref}>
                                <Plus className="mr-2 h-4 w-4" />
                                {newButtonLabel}
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
  )
}