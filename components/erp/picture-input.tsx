"use client";

import { useRef, useState } from "react";
import styles from "./erp.module.css";

/**
 * A photo or a screenshot from the phone. It is made small on the phone
 * before it is sent, so it goes quickly on a slow connection and the office
 * keeps only what it needs.
 */
export function PictureInput({
  name,
  label,
  hint,
  add,
  onPicked,
  note,
}: {
  name: string;
  label: string;
  hint: string;
  add: string;
  /** the picture as it will be sent (already made small), or null when it is removed */
  onPicked?: (file: File | null) => void;
  /** shown under the picture: what was read from it, for instance */
  note?: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clear = () => {
    if (input.current) input.current.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onPicked?.(null);
  };

  return (
    <div className={styles.field}>
      <span className={styles.label}>
        {label}
        <span className={styles.hint}>{hint}</span>
      </span>
      {preview && (
        <span className={styles.picPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a picture on this phone, not yet sent */}
          <img src={preview} alt="The picture you chose" />
          <button type="button" className={styles.textBtn} onClick={clear}>
            Remove
          </button>
        </span>
      )}
      <label className={styles.picPick} aria-busy={busy}>
        <input
          ref={input}
          name={name}
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            setProblem(null);
            if (!file) return clear();
            if (!file.type.startsWith("image/")) {
              setProblem("Choose a photo or a screenshot.");
              return clear();
            }
            setBusy(true);
            const small = await shrink(file).catch(() => file);
            if (input.current && small !== file) {
              const box = new DataTransfer();
              box.items.add(small);
              input.current.files = box.files;
            }
            if (preview) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(small));
            setBusy(false);
            onPicked?.(small);
          }}
        />
        <span>{busy ? "Getting it ready…" : preview ? "Choose another" : add}</span>
      </label>
      {problem && <span className={styles.err}>{problem}</span>}
      {note}
    </div>
  );
}

/** At most 1600 pixels on the long side, as a JPEG: a screenshot stays readable, a photo stays clear. */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 600_000 && /^image\/(jpeg|png)$/.test(file.type)) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.82));
  return blob ? new File([blob], "picture.jpg", { type: "image/jpeg" }) : file;
}
