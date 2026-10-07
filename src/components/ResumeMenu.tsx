"use client";

import { Check, CornerDownLeft, FileText } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface ResumeMenuRequest {
  anchor: HTMLElement;
  title: string;
  description?: string;
  current: string;
  labels: string[];
  confirmLabel?: string;
  onSelect: (label: string) => void;
}

const ResumeMenuContext = createContext<((request: ResumeMenuRequest) => void) | null>(null);

export function useResumeMenu() {
  const open = useContext(ResumeMenuContext);
  if (!open) throw new Error("useResumeMenu must be used inside <ResumeMenuProvider>");
  return open;
}

const MENU_WIDTH = 288;
const GAP = 6;

export function ResumeMenuProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<{ id: number; request: ResumeMenuRequest } | null>(null);
  const nextId = useRef(0);
  const lastClosed = useRef<{ anchor: HTMLElement; at: number } | null>(null);

  const open = useCallback((request: ResumeMenuRequest) => {
    // A click on the anchor of a menu that was just closed by that same press toggles it shut.
    const closed = lastClosed.current;
    if (closed && closed.anchor === request.anchor && performance.now() - closed.at < 400) return;
    nextId.current += 1;
    setActive({ id: nextId.current, request });
  }, []);

  const close = useCallback(
    (restoreFocus: boolean) => {
      if (!active) return;
      lastClosed.current = { anchor: active.request.anchor, at: performance.now() };
      if (restoreFocus) active.request.anchor.focus({ preventScroll: true });
      setActive(null);
    },
    [active],
  );

  return (
    <ResumeMenuContext.Provider value={open}>
      {children}
      {active && <ResumeMenu key={active.id} request={active.request} onClose={close} />}
    </ResumeMenuContext.Provider>
  );
}

function ResumeMenu({
  request,
  onClose,
}: {
  request: ResumeMenuRequest;
  onClose: (restoreFocus: boolean) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const rect = request.anchor.getBoundingClientRect();
      const height = panel.current?.offsetHeight ?? 280;
      const left = Math.min(
        Math.max(8, rect.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - 8,
      );
      const below = rect.bottom + GAP;
      const top =
        below + height > window.innerHeight - 8 && rect.top - GAP - height > 8
          ? rect.top - GAP - height
          : below;
      setPosition({ top, left });
    };
    place();
  }, [request.anchor]);

  useEffect(() => {
    const target = panel.current?.querySelector<HTMLElement>("[data-current='true']");
    (target ?? input.current)?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (panel.current?.contains(e.target as Node)) return;
      onClose(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose(true);
      }
    };
    const onScroll = (e: Event) => {
      if (panel.current?.contains(e.target as Node)) return;
      onClose(false);
    };
    const onResize = () => onClose(false);
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [onClose, request.anchor]);

  const choose = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    request.onSelect(trimmed);
    onClose(true);
  };

  const draftTrimmed = draft.trim();
  const draftExists = request.labels.some((l) => l.toLowerCase() === draftTrimmed.toLowerCase());

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label={request.title}
      className="fixed z-50 animate-pop-in rounded-xl border border-line bg-surface p-1.5 shadow-pop"
      style={{
        width: MENU_WIDTH,
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
      }}
    >
      <div className="px-2.5 pt-1.5 pb-2">
        <div className="text-[13px] font-semibold text-ink">{request.title}</div>
        {request.description && (
          <div className="mt-0.5 text-xs leading-4 text-muted">{request.description}</div>
        )}
      </div>

      {request.labels.length > 0 && (
        <ul className="max-h-56 overflow-y-auto" role="listbox" aria-label="Resume versions">
          {request.labels.map((label) => {
            const selected = label === request.current;
            return (
              <li key={label}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-current={selected}
                  onClick={() => choose(label)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-paper focus-visible:bg-paper focus-visible:outline-none ${
                    selected ? "font-medium text-ink" : "text-ink-soft"
                  }`}
                >
                  <FileText aria-hidden className="size-3.5 shrink-0 text-faint" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {selected && <Check aria-hidden className="size-3.5 text-accent" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className={`${request.labels.length > 0 ? "mt-1.5 border-t border-line pt-2" : ""} px-1 pb-1`}
        onSubmit={(e) => {
          e.preventDefault();
          choose(draft);
        }}
      >
        <label className="sr-only" htmlFor="resume-label-input">
          New resume label
        </label>
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-paper/60 pr-1 focus-within:border-accent focus-within:bg-surface">
          <input
            ref={input}
            id="resume-label-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={request.labels.length ? "New label…" : "e.g. SWE v3, ML-focused"}
            autoComplete="off"
            maxLength={80}
            className="h-8 min-w-0 flex-1 bg-transparent px-2.5 text-[13px] text-ink outline-none placeholder:text-faint focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={!draftTrimmed}
            className="inline-flex h-6 items-center gap-1 rounded-md bg-ink px-2 text-[11.5px] font-medium text-white transition-opacity disabled:opacity-25"
          >
            {draftExists ? "Use" : (request.confirmLabel ?? "Add")}
            <CornerDownLeft aria-hidden className="size-3" />
          </button>
        </div>
      </form>
    </div>
  );
}
