import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { errorFor, ErrorKind } from "../lib/errors.js";
import { parseDeck } from "../lib/validate.js";
import { actions, deckReducer, initialState } from "../state/deckReducer.js";

const REQUEST_TIMEOUT_MS = 20_000;
const LONG_DOCUMENT_TIMEOUT_MS = 40_000;
const LONG_DOCUMENT_THRESHOLD = 8_000;

export function timeoutForText(text) {
  return text.length > LONG_DOCUMENT_THRESHOLD
    ? LONG_DOCUMENT_TIMEOUT_MS
    : REQUEST_TIMEOUT_MS;
}

function abortableDelay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export function useDeck() {
  const [state, dispatch] = useReducer(deckReducer, initialState);
  const reqId = useRef(0);
  const abortRef = useRef(null);
  const cardRequestsRef = useRef(new Map());
  const lastRequestRef = useRef(null);
  const [regeneratingIds, setRegeneratingIds] = useState([]);

  const abortCardRequests = useCallback(() => {
    for (const request of cardRequestsRef.current.values()) {
      request.controller.abort();
    }
    cardRequestsRef.current.clear();
    setRegeneratingIds([]);
  }, []);

  const generate = useCallback(
    async (text, count = 8, mode = "flashcards") => {
      const cleanText = typeof text === "string" ? text.trim() : "";
      if (!cleanText) return;
      const grounding = cleanText.length >= 400 ? "source" : "topic";

      lastRequestRef.current = { text: cleanText, count, mode, grounding };
      const id = ++reqId.current;
      abortRef.current?.abort();
      abortCardRequests();

      const controller = new AbortController();
      abortRef.current = controller;
      let timedOut = false;
      const timeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutForText(cleanText));

      dispatch(actions.generateStart(mode, grounding));

      try {
        let repair = null;
        let repaired = false;
        let rateLimitRetried = false;

        while (true) {
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleanText, count, mode, grounding, repair }),
            signal: controller.signal,
          });
          if (id !== reqId.current) return;

          if (response.status === 429) {
            if (rateLimitRetried) {
              dispatch(actions.generateFailure(errorFor(ErrorKind.RATE_LIMIT)));
              return;
            }
            rateLimitRetried = true;
            const seconds = Number.parseFloat(response.headers.get("Retry-After") ?? "1");
            const waitMs = Math.min(Number.isFinite(seconds) ? seconds * 1000 : 1000, 5000);
            await abortableDelay(waitMs, controller.signal);
            if (id !== reqId.current) return;
            continue;
          }

          if (!response.ok) {
            dispatch(actions.generateFailure(errorFor(ErrorKind.SERVER)));
            return;
          }

          const data = await response.json();
          if (id !== reqId.current) return;

          if (data.finishReason === "length") {
            dispatch(actions.generateFailure(errorFor(ErrorKind.TRUNCATED)));
            return;
          }

          const result = parseDeck(data.content, {
            mode,
            grounding,
            sourceText: cleanText,
          });
          if (
            !result.ok &&
            result.error.kind === ErrorKind.UNPARSEABLE &&
            !repaired
          ) {
            repaired = true;
            dispatch(actions.generateStart(mode, grounding, true));
            repair = {
              error: result.error.message,
              previousOutput: data.content,
            };
            continue;
          }

          if (!result.ok) {
            dispatch(actions.generateFailure(result.error));
            return;
          }

          dispatch(
            actions.generateSuccess(
              result.deck,
              result.skipped,
              result.skipReasons,
            ),
          );
          return;
        }
      } catch (error) {
        if (id !== reqId.current) return;
        if (error?.name === "AbortError") {
          if (timedOut) {
            dispatch(actions.generateFailure(errorFor(ErrorKind.TIMEOUT)));
          }
          return;
        }
        dispatch(actions.generateFailure(errorFor(ErrorKind.NETWORK)));
      } finally {
        window.clearTimeout(timeout);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [abortCardRequests],
  );

  const retry = useCallback(() => {
    if (lastRequestRef.current) {
      return generate(
        lastRequestRef.current.text,
        lastRequestRef.current.count,
        lastRequestRef.current.mode,
      );
    }
  }, [generate]);

  const cancel = useCallback(() => {
    reqId.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    abortCardRequests();
    dispatch(actions.reset());
  }, [abortCardRequests]);

  const regenerateItem = useCallback(async (item, sourceText) => {
    if (!item || !sourceText) return;
    const deckRequestId = reqId.current;
    const previous = cardRequestsRef.current.get(item.id);
    previous?.controller.abort();

    const controller = new AbortController();
    const id = (previous?.id ?? 0) + 1;
    cardRequestsRef.current.set(item.id, { id, controller });
    setRegeneratingIds((current) => [...new Set([...current, item.id])]);

    const isCurrent = () => {
      const entry = cardRequestsRef.current.get(item.id);
      return (
        entry?.id === id &&
        entry.controller === controller &&
        reqId.current === deckRequestId
      );
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          count: 1,
          mode: item.type === "mcq" ? "quiz" : "flashcards",
          grounding: sourceText.trim().length >= 400 ? "source" : "topic",
        }),
        signal: controller.signal,
      });
      if (!isCurrent() || !response.ok) return;
      const data = await response.json();
      if (!isCurrent()) return;
      const parsed = parseDeck(
        data.content,
        {
          mode: item.type === "mcq" ? "quiz" : "flashcards",
          grounding: sourceText.trim().length >= 400 ? "source" : "topic",
          sourceText,
        },
      );
      const replacement = parsed.ok
        ? parsed.deck.items.find((candidate) => candidate.type === item.type)
        : null;
      if (replacement && isCurrent()) {
        const { id: ignored, ...patch } = replacement;
        dispatch(actions.editItem(item.id, patch));
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Single-card regeneration failed", error);
      }
    } finally {
      if (cardRequestsRef.current.get(item.id)?.id === id) {
        cardRequestsRef.current.delete(item.id);
        setRegeneratingIds((current) =>
          current.filter((itemId) => itemId !== item.id),
        );
      }
    }
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortCardRequests();
    },
    [abortCardRequests],
  );

  return {
    state,
    generate,
    retry,
    cancel,
    regenerateItem,
    regeneratingIds,
    dispatch,
  };
}
