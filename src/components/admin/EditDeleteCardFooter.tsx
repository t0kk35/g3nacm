import Link from "next/link"
import { CardFooter } from "../ui/card"
import { Button } from "../ui/button"
import { Edit, Trash2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type Props = {
    editHref: string;
    onDelete: () => void;
    deleteDisabled: boolean;
    deleteDisabledMessage: string;         
}

export function EditDeleteCardFooter({ editHref, onDelete, deleteDisabled, deleteDisabledMessage }: Props) {
    return (
        <CardFooter className="flex justify-between p-4 pt-0 pb-0">
            <Button variant="outline" size="sm" asChild>
                <Link href={editHref}>
                    <Edit className="mr-2 h-3 w-3" />
                        Edit
                </Link>
            </Button>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>
                            <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleteDisabled}>
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                            </Button>                            
                        </span>
                    </TooltipTrigger>
                    { deleteDisabled && (
                        <TooltipContent>
                            <p>{deleteDisabledMessage}</p>
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
        </CardFooter>
    )
}