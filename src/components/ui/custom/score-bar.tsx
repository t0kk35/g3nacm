import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

type Props = {
    score: number;
}

export function ScoreBar( { score }: Props) {
    const [progressScore, setProgressScore] = useState(0);
    
    useEffect(() => {
        const timeout = setTimeout(() => setProgressScore(score), 100);
        return () => clearTimeout(timeout);
    }, [score]);

    return (
        <div className="flex flex-row items-center gap-1 w-full max-w-sm ">
            <Progress
                value={progressScore}
                className="h-2 [&>*]:transition-all [&>*]:duration-1000 [&>*]:bg-chart-1"
            />
            <div className="text-xs text-muted-foreground text-right">
                {progressScore}%
            </div>
        </div>
    )
}
