import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-gray-700/30 via-gray-600/50 to-gray-700/30 bg-[length:200%_100%]",
        "animate-[shimmer_2s_ease-in-out_infinite]",
        className
      )}
      style={{ aspectRatio: 'inherit', minHeight: 'inherit' }}
      {...props}
    />
  )
}

export { Skeleton }