import { useEffect, useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { InputMethod, ParseResult } from "@shelfsense/shared";
import { errorMessage } from "../lib/api";
import { parseImage, parseText } from "../lib/shelf";
import { FormError } from "./Field";
import { Icon, Spinner, type IconName } from "./Icon";
import { Illustration } from "./Illustration";

const TABS: { id: InputMethod; label: string; icon: IconName }[] = [
  { id: "PASTE", label: "Paste", icon: "paste" },
  { id: "UPLOAD", label: "Upload photo", icon: "upload" },
  { id: "SCAN", label: "Scan with camera", icon: "camera" },
];

const EXAMPLE =
  "Aqua (Water), Niacinamide, Pentylene Glycol, Zinc PCA, Sodium Hyaluronate, Xanthan Gum, Phenoxyethanol, Ethylhexylglycerin";

interface ScanInputProps {
  onParsed: (result: ParseResult, method: InputMethod) => void;
}

export function ScanInput({ onParsed }: ScanInputProps) {
  const [tab, setTab] = useState<InputMethod>("PASTE");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputId = useId();

  // Show the chosen photo straight from memory (a blob: URL). Nothing is uploaded
  // until they press "Read label", and we free the URL when it's no longer shown.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const read = useMutation({
    mutationFn: async () => {
      if (tab === "PASTE") return parseText(text);
      if (!file) throw new Error("Choose a photo of the label first.");
      return parseImage(file);
    },
    onSuccess: (result) => onParsed(result, tab),
  });

  function switchTab(next: InputMethod) {
    setTab(next);
    setFile(null);
    read.reset();
  }

  const isPhotoTab = tab !== "PASTE";

  return (
    <div>
      <div role="tablist" aria-label="How do you want to add the ingredients?" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors duration-150 sm:text-sm ${
              tab === t.id ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
            }`}
          >
            <Icon name={t.icon} size={16} />
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel">
        {tab === "PASTE" && (
          <div>
            <label htmlFor="ingredient-text" className="label">
              Ingredient list
            </label>
            <textarea
              id="ingredient-text"
              className="input min-h-40 resize-y font-mono text-[13px] leading-relaxed"
              placeholder="Copy it from the brand's website or the back of the bottle…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={5000}
            />
            <button type="button" className="mt-2 text-xs text-sky hover:underline" onClick={() => setText(EXAMPLE)}>
              Use an example list
            </button>
          </div>
        )}

        {isPhotoTab && (
          <div>
            {preview ? (
              <div className="relative overflow-hidden rounded-2xl border border-periwinkle/40 bg-surface-2">
                <img src={preview} alt="Your label photo" className="max-h-72 w-full object-contain" />
                {read.isPending && (
                  <div className="absolute inset-0 grid place-items-center bg-ink/70 backdrop-blur-[2px]">
                    <p className="flex items-center gap-2 rounded-full border border-periwinkle/40 bg-surface px-4 py-2 text-sm font-medium text-periwinkle">
                      <Spinner /> Reading label…
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <label
                htmlFor={fileInputId}
                className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-periwinkle/35 bg-periwinkle/5 px-6 py-8 text-center transition-colors duration-150 hover:border-periwinkle/60 hover:bg-periwinkle/10"
              >
                <Illustration name="scan-label" className="h-24 w-auto" />
                <span className="mt-3 font-medium text-periwinkle">
                  {tab === "SCAN" ? "Tap to open your camera" : "Choose a photo of the label"}
                </span>
                <span className="mt-1 text-xs text-muted">
                  {tab === "SCAN"
                    ? "On a phone this opens the back camera. Get close and keep the text flat."
                    : "JPG or PNG, up to 4 MB. Photos are read in memory and never stored."}
                </span>
              </label>
            )}
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              // capture tells phones to open the camera straight away - no library needed
              {...(tab === "SCAN" ? { capture: "environment" as const } : {})}
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                read.reset();
              }}
            />
            {preview && !read.isPending && (
              <label htmlFor={fileInputId} className="mt-2 inline-block cursor-pointer text-xs text-sky hover:underline">
                Choose a different photo
              </label>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <FormError message={read.isError ? errorMessage(read.error) : null} />
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => read.mutate()}
          disabled={read.isPending || (tab === "PASTE" ? !text.trim() : !file)}
        >
          {read.isPending ? (
            <>
              <Spinner /> {isPhotoTab ? "Reading label…" : "Matching ingredients…"}
            </>
          ) : (
            <>
              <Icon name="scan" size={16} /> {isPhotoTab ? "Read label" : "Read ingredients"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
