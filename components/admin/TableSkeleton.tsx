import { Skeleton } from "@/components/ui/Skeleton";

export function TableSkeleton({
  columns,
  rows = 8,
  withPl = true,
  withPr = true,
}: {
  columns: number;
  rows?: number;
  withPl?: boolean;
  withPr?: boolean;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri}>
          {Array.from({ length: columns }).map((__, ci) => (
            <td
              key={ci}
              className={`py-4 ${withPl && ci === 0 ? "pl-8" : ""} ${withPr && ci === columns - 1 ? "pr-8" : ""}`}
            >
              <Skeleton className={`h-4 ${ci === 0 ? "max-w-[160px]" : "max-w-[120px]"} w-full`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
