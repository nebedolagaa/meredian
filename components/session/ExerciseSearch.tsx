"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchExercises, createCustomExercise } from "@/app/actions/exercises";
import type { Exercise } from "@/lib/types/database";

export function ExerciseSearch({
  onSelect,
}: {
  onSelect: (exercise: Exercise) => void;
}) {
  const t = useTranslations("exerciseSearch");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open) return;
    debounceRef.current = setTimeout(async () => {
      const data = await searchExercises(query);
      setResults(data);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  function pick(ex: Exercise) {
    onSelect(ex);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  async function addCustom() {
    if (!query.trim()) return;
    setCreating(true);
    const result = await createCustomExercise(query);
    setCreating(false);
    if (result.exercise) pick(result.exercise);
  }

  const exactMatch = results.some(
    (r) => r.name.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bone-dim" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t("placeholder")}
          className="pl-9"
        />
      </div>

      {open && (query.length > 0 || results.length > 0) && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-panel-border bg-graphite">
          {results.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(ex)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-bone hover:bg-carbon"
            >
              <span>{ex.name}</span>
              {ex.muscle_group && (
                <span className="text-xs text-bone-dim">{ex.muscle_group}</span>
              )}
            </button>
          ))}

          {query.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={addCustom}
              disabled={creating}
              className="flex w-full items-center gap-2 border-t border-panel-border px-3 py-2.5 text-left text-sm text-steel hover:bg-carbon"
            >
              <Plus className="h-4 w-4" />
              {creating ? t("adding") : t("addCustom", { query: query.trim() })}
            </button>
          )}

          {results.length === 0 && !query.trim() && (
            <p className="px-3 py-2.5 text-xs text-bone-dim">
              {t("typeToSearch")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
