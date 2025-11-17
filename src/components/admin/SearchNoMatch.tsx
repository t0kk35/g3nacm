
import { Card, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import Link from "next/link"

type Props = {
  noMatchMessage: string;
  notFoundMessage: string;
  searchQuery: string;
  newButtonLabel: string;
  newButtonHref: string;
}

export function SearchNoMatch ({ 
    noMatchMessage, 
    notFoundMessage, 
    searchQuery, 
    newButtonLabel, 
    newButtonHref } : Props) {
    
    return (
        <Card>
          <CardContent className="py-10">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                {searchQuery ? noMatchMessage : notFoundMessage}
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link href={newButtonHref}>{newButtonLabel}</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
    );    
}