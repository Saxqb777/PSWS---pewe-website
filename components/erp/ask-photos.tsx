import type { AskPhoto } from "@/lib/erp/files";
import { showDate } from "@/lib/erp/labels";
import p from "./portal.module.css";

/**
 * The photos on an ask, oldest first: what was needed, then what the money
 * did. Each opens full size. Shown to whoever may see the ask.
 */
export function AskPhotos({
  photos,
  removeFor,
}: {
  photos: AskPhoto[];
  /** a form action to take one photo off, for those who may */
  removeFor?: (photo: AskPhoto) => ((data: FormData) => Promise<void>) | null;
}) {
  if (!photos.length) return null;
  return (
    <ul className={p.photos}>
      {photos.map((ph) => {
        const remove = removeFor?.(ph) ?? null;
        return (
          <li key={ph.id}>
            <a href={`/erp/file/${ph.id}`} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- a private photo, served behind the sign-in */}
              <img src={`/erp/file/${ph.id}`} alt={ph.caption ?? "A photo on this ask"} loading="lazy" />
            </a>
            <span className={p.photoCap}>
              {ph.caption && <b>{ph.caption}</b>}
              <span>
                {showDate(ph.uploaded_on)}
                {ph.by_name ? ` · ${ph.by_name}` : ""}
              </span>
            </span>
            {remove && (
              <form action={remove}>
                <button type="submit" className={p.photoRemove}>
                  Take off
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
