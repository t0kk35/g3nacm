import Link from "next/link"
import { TableCell } from "../ui/table"
import { Button } from "../ui/button"
import { Edit, Trash2 } from "lucide-react"

type Props = {
    editHref: string;
    onDelete: () => void            
}

export function EditDeleteTableCell({ editHref, onDelete}: Props) {
    return (
        <TableCell>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                    <Link href={editHref}>
                        <Edit className="mr-1 h-3 w-3" />
                            Edit
                    </Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={onDelete}>
                    <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                </Button>
            </div>
        </TableCell>        
    )
}