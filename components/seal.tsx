import Image from "next/image";
import { SOCIETY } from "@/lib/site";

/** The Society seal, as it appears on the letterhead. */
export function Seal({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/images/psws-seal.jpg"
      alt={`${SOCIETY.name} seal`}
      width={size}
      height={size}
      className={`shrink-0 mix-blend-multiply ${className}`}
      priority
    />
  );
}
