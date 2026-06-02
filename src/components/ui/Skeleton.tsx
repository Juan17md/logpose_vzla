import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export default function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn("shimmer-bg rounded-xl", className)}
            {...props}
        />
    );
}
