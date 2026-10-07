"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type LoadedBoard, loadBoard } from "./fetch";

export type BoardState =
  | { status: "loading"; previous: LoadedBoard | null }
  | { status: "ready"; board: LoadedBoard }
  | { status: "error"; message: string; previous: LoadedBoard | null };

/** Fetches the README fresh from GitHub on every page load (and on demand). */
export function useBoard() {
  const [state, setState] = useState<BoardState>({ status: "loading", previous: null });
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setState((s) => ({
      status: "loading",
      previous: s.status === "ready" ? s.board : s.previous,
    }));
    try {
      const board = await loadBoard(ac.signal);
      if (!ac.signal.aborted) setState({ status: "ready", board });
    } catch (error) {
      if (ac.signal.aborted) return;
      const message =
        error instanceof TypeError
          ? "Couldn't reach GitHub. Check your internet connection."
          : error instanceof Error
            ? error.message
            : String(error);
      setState((s) => ({
        status: "error",
        message,
        previous: s.status === "loading" ? s.previous : null,
      }));
    }
  }, []);

  useEffect(() => {
    // Fetching on mount is the point: nothing is cached between page loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return () => controller.current?.abort();
  }, [refresh]);

  const board =
    state.status === "ready" ? state.board : state.previous;

  return { state, board, refresh };
}
