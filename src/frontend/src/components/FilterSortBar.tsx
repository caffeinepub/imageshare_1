import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Image as BackendImage } from "../backend";

const PRESET_CATEGORIES = [
  "Nature",
  "Anime",
  "Architecture",
  "Travel",
  "Food",
  "Abstract",
  "Animals",
  "Technology",
  "People",
  "Street",
  "Sports",
  "Fashion",
];

type SortOption = "newest" | "most-liked" | "most-downloaded";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  "most-liked": "Most Liked",
  "most-downloaded": "Most Downloaded",
};

export function FilterSortBar({
  images,
  onFiltered,
}: {
  images: BackendImage[];
  onFiltered: (filtered: BackendImage[]) => void;
}) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [activeCategory, setActiveCategory] = useState<string>("");

  const applyFilter = useCallback(
    (imgs: BackendImage[], s: SortOption, cat: string) => {
      let result = [...imgs];
      if (cat) {
        result = result.filter((img) =>
          img.tags.some((t) => t.toLowerCase() === cat.toLowerCase()),
        );
      }
      if (s === "most-liked") {
        result.sort((a, b) => Number(b.likes - a.likes));
      } else if (s === "most-downloaded") {
        result.sort((a, b) => Number(b.downloads - a.downloads));
      }
      // "newest" keeps backend order (already newest first)
      onFiltered(result);
    },
    [onFiltered],
  );

  useEffect(() => {
    applyFilter(images, sort, activeCategory);
  }, [images, sort, activeCategory, applyFilter]);

  const toggleCategory = (cat: string) => {
    const next = activeCategory === cat ? "" : cat;
    setActiveCategory(next);
    applyFilter(images, sort, next);
  };

  const changeSort = (s: SortOption) => {
    setSort(s);
    applyFilter(images, s, activeCategory);
  };

  return (
    <div
      data-ocid="filter.panel"
      className="flex flex-col gap-3 mb-6 p-4 bg-card/50 rounded-xl border border-border/30"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-body">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filter & Sort</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              data-ocid="filter.select"
              variant="outline"
              size="sm"
              className="border-border/50 font-body text-sm h-8"
            >
              {SORT_LABELS[sort]}
              <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border/50">
            {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => changeSort(s)}
                className={`font-body text-sm cursor-pointer ${
                  sort === s ? "text-primary" : ""
                }`}
              >
                {SORT_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESET_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              type="button"
              key={cat}
              data-ocid="filter.tab"
              onClick={() => toggleCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-body font-medium transition-all border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border/40 hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          );
        })}
        {activeCategory && (
          <Badge
            variant="secondary"
            className="text-xs cursor-pointer font-body"
            onClick={() => {
              setActiveCategory("");
              applyFilter(images, sort, "");
            }}
          >
            Clear filter ×
          </Badge>
        )}
      </div>
    </div>
  );
}
