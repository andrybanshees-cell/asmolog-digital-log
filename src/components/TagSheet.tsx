import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inputCls } from "./Shell";

export function TagSheet({
  open,
  onOpenChange,
  title,
  hint,
  values,
  presets,
  readOnly,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  hint: string;
  values: string[];
  presets: string[];
  readOnly?: boolean;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = (v: string) => {
    const t = v.trim();
    if (!t || values.includes(t)) return;
    onChange([...values, t]);
    setDraft("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold tracking-tight">{title}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>

        {!readOnly && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add(draft);
            }}
            className="flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add custom value"
              className={inputCls}
            />
            <button
              type="submit"
              className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
              aria-label="Add"
            >
              <Plus className="size-5" />
            </button>
          </form>
        )}

        {presets.length > 0 && !readOnly && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Presets
            </p>
            <div className="flex flex-wrap gap-2">
              {presets
                .filter((p) => !values.includes(p))
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => add(p)}
                    className="h-11 rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted-foreground"
                  >
                    + {p}
                  </button>
                ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Added ({values.length})
          </p>
          {values.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing added yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {values.map((v) => (
                <span
                  key={v}
                  className="flex h-11 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-semibold"
                >
                  {v}
                  {!readOnly && (
                    <button
                      onClick={() => onChange(values.filter((x) => x !== v))}
                      aria-label={`Remove ${v}`}
                    >
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
