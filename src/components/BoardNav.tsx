"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { AGE_OPTIONS, type Filters, type SortOrder, type StatusFilter } from "@/lib/filters";
import type { Board, JobFlags } from "@/lib/readme/types";

type SetFilters = (patch: Partial<Filters>) => void;

const number = new Intl.NumberFormat();

export function CategoryTabs({
  board,
  filters,
  setFilters,
  appliedByCategory,
  appliedTotal,
  canTrack,
}: {
  board: Board;
  filters: Filters;
  setFilters: SetFilters;
  appliedByCategory: Map<string, number>;
  appliedTotal: number;
  canTrack: boolean;
}) {
  const tabs = [
    { id: "all", label: "All roles", emoji: "", count: board.jobs.length, applied: appliedTotal },
    ...board.categories.map((c) => ({
      id: c.id,
      label: c.title,
      emoji: c.emoji,
      count: c.jobs.length,
      applied: appliedByCategory.get(c.id) ?? 0,
    })),
  ];

  return (
    <nav aria-label="Categories" className="-mb-px flex flex-wrap items-end gap-x-1">
      {tabs.map((tab) => {
        const active = filters.category === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => setFilters({ category: tab.id })}
            className={`group relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-2.5 pt-2 pb-2.5 text-[13.5px] whitespace-nowrap transition-colors ${
              active ? "font-semibold text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {tab.emoji && <span aria-hidden>{tab.emoji}</span>}
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-px text-[11px] font-medium tabular-nums ${
                active ? "bg-ink text-white" : "bg-line/70 text-muted group-hover:text-ink-soft"
              }`}
            >
              {number.format(tab.count)}
            </span>
            {canTrack && tab.applied > 0 && (
              <span className="text-[11px] font-medium text-done tabular-nums" title={`${tab.applied} applied`}>
                ✓{tab.applied}
              </span>
            )}
            <span
              aria-hidden
              className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full ${active ? "bg-ink" : "bg-transparent"}`}
            />
          </button>
        );
      })}

    </nav>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative w-full max-w-[340px]">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint" />
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            e.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        aria-label="Search"
        className="h-8 w-full rounded-lg border border-line bg-surface pr-14 pl-8 text-[13.5px] text-ink shadow-card outline-none placeholder:text-faint focus:border-accent focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-faint hover:bg-paper hover:text-ink"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-line bg-paper px-1.5 font-mono text-[10.5px] text-faint">
          /
        </kbd>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-8 items-center rounded-lg bg-line/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-7 rounded-md px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-all ${
            value === o.value ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="relative inline-flex h-8 items-center rounded-lg border border-line bg-surface shadow-card focus-within:border-accent">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full cursor-pointer appearance-none bg-transparent pr-7 pl-2.5 text-[12.5px] font-medium text-ink-soft outline-none"
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2 size-3.5 text-faint" />
    </label>
  );
}

function Toggle({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors ${
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-surface text-ink-soft shadow-card hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

const FLAG_TOGGLES: {
  key: "faangOnly" | "hideAdvancedDegree" | "hideNoSponsorship" | "hideCitizenship";
  flag: keyof JobFlags;
  label: string;
  title: string;
}[] = [
  { key: "faangOnly", flag: "faang", label: "🔥 FAANG+ only", title: "Only show FAANG+ companies" },
  { key: "hideAdvancedDegree", flag: "advancedDegree", label: "Hide 🎓", title: "Hide roles that require an advanced degree" },
  { key: "hideNoSponsorship", flag: "noSponsorship", label: "Hide 🛂", title: "Hide roles that don't offer sponsorship" },
  { key: "hideCitizenship", flag: "usCitizenship", label: "Hide 🇺🇸", title: "Hide roles that require U.S. citizenship" },
];

export function BoardToolbar({
  board,
  filters,
  setFilters,
  shown,
  canTrack,
}: {
  board: Board;
  filters: Filters;
  setFilters: SetFilters;
  shown: number;
  canTrack: boolean;
}) {
  const presentFlags = new Set<keyof JobFlags>();
  for (const job of board.jobs) {
    for (const key of Object.keys(job.flags) as (keyof JobFlags)[]) if (job.flags[key]) presentFlags.add(key);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <SearchBox
        value={filters.query}
        onChange={(query) => setFilters({ query })}
        placeholder="Search company, role or location"
      />
      {canTrack && (
        <Segmented<StatusFilter>
          label="Application status"
          value={filters.status}
          onChange={(status) => setFilters({ status })}
          options={[
            { value: "all", label: "All" },
            { value: "not-applied", label: "Not applied" },
            { value: "applied", label: "Applied" },
          ]}
        />
      )}
      <Select
        label="Posted"
        value={filters.maxAgeDays === null ? "" : String(filters.maxAgeDays)}
        onChange={(v) => setFilters({ maxAgeDays: v === "" ? null : Number(v) })}
      >
        {AGE_OPTIONS.map((o) => (
          <option key={o.label} value={o.value === null ? "" : String(o.value)}>
            {o.value === null ? "Posted any time" : `Posted ${o.label.toLowerCase()}`}
          </option>
        ))}
      </Select>
      <Select label="Sort" value={filters.sort} onChange={(v) => setFilters({ sort: v as SortOrder })}>
        <option value="readme">README order</option>
        <option value="newest">Newest first</option>
        <option value="company">Company A–Z</option>
      </Select>
      {FLAG_TOGGLES.filter((t) => presentFlags.has(t.flag)).map((t) => (
        <Toggle
          key={t.key}
          active={filters[t.key]}
          title={t.title}
          onClick={() => setFilters({ [t.key]: !filters[t.key] })}
        >
          {t.label}
        </Toggle>
      ))}
      <div className="ml-auto text-[12.5px] text-muted tabular-nums">
        {number.format(shown)} {shown === 1 ? "role" : "roles"}
      </div>
    </div>
  );
}

export function ViewSwitch({
  view,
  onChange,
  appliedTotal,
}: {
  view: Filters["view"];
  onChange: (view: Filters["view"]) => void;
  appliedTotal: number;
}) {
  const item = (active: boolean) =>
    `inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-all ${
      active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
    }`;
  return (
    <div role="tablist" aria-label="View" className="inline-flex h-8 items-center rounded-lg bg-line/60 p-0.5">
      <button type="button" role="tab" aria-selected={view === "board"} onClick={() => onChange("board")} className={item(view === "board")}>
        Job board
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "applications"}
        onClick={() => onChange("applications")}
        className={item(view === "applications")}
      >
        My applications
        <span
          className={`rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums ${
            view === "applications" ? "bg-done text-white" : "bg-done-soft text-done"
          }`}
        >
          {number.format(appliedTotal)}
        </span>
      </button>
    </div>
  );
}
