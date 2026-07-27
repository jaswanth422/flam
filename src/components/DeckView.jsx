import { useEffect, useMemo, useRef } from "react";
import { Flashcard } from "./Flashcard.jsx";
import { McqCard } from "./McqCard.jsx";

function VoidSlot({ reason }) {
  return (
    <div className="void-card" aria-hidden="true">
      <span>VOID</span>
      <i />
      <small>{reason}</small>
    </div>
  );
}

function useSpatialControls(sceneRef, mode, onNext, onPrev) {
  const drag = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;
    const move = (event) => {
      const rect = scene.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      scene.style.setProperty("--parallax-x", `${x * 6}deg`);
      scene.style.setProperty("--parallax-y", `${y * -6}deg`);
      if (drag.current) {
        drag.current.lastX = event.clientX;
        drag.current.lastY = event.clientY;
      }
    };
    const leave = () => {
      scene.style.setProperty("--parallax-x", "0deg");
      scene.style.setProperty("--parallax-y", "0deg");
    };
    scene.addEventListener("pointermove", move);
    scene.addEventListener("pointerleave", leave);
    return () => {
      scene.removeEventListener("pointermove", move);
      scene.removeEventListener("pointerleave", leave);
    };
  }, [sceneRef]);

  return {
    onPointerDown(event) {
      drag.current = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerUp(event) {
      if (!drag.current || drag.current.id !== event.pointerId) return;
      const dx = drag.current.lastX - drag.current.startX;
      const dy = drag.current.lastY - drag.current.startY;
      const delta = mode === "quiz" ? dy : dx;
      if (delta < -55) onNext();
      if (delta > 55) onPrev();
      drag.current = null;
    },
  };
}

export function DeckView({
  deck,
  mode,
  skipped,
  skipReasons = [],
  index,
  items,
  answers,
  ratings,
  onAnswer,
  onRate,
  onNext,
  onPrev,
  onDelete,
  onRegenerate,
  onFinish,
}) {
  const sceneRef = useRef(null);
  const item = items[index];
  const controls = useSpatialControls(sceneRef, mode, onNext, onPrev);

  const visualSlots = useMemo(() => {
    const isFullDeck = items.length === deck.items.length;
    if (!isFullDeck || !deck.slots) {
      return items.map((entry, position) => ({
        kind: "item",
        id: `retest-${entry.id}`,
        itemId: entry.id,
        originalIndex: position,
      }));
    }
    return deck.slots;
  }, [deck, items]);
  const isRetest = items.length < deck.items.length;

  const activeSlotIndex = visualSlots.findIndex((slot) => slot.itemId === item?.id);
  const renderedSlots = visualSlots.filter((slot, slotIndex) => {
    const offset = slotIndex - activeSlotIndex;
    return mode === "flashcards" ? Math.abs(offset) <= 3 : offset >= 0 && offset <= 3;
  });

  useEffect(() => {
    if (mode !== "quiz" || !item || answers[item.id] === undefined) return undefined;
    if (index >= items.length - 1) return undefined;
    const timer = window.setTimeout(onNext, 520);
    return () => window.clearTimeout(timer);
  }, [answers, index, item, items.length, mode, onNext]);

  if (!item) return null;

  return (
    <section className={`deck-view mode-${mode}`}>
      <div className="deck-heading">
        <div>
          <p className="eyebrow">{mode === "quiz" ? "QUIZ TUMBLER" : "FLASH ORBIT"}</p>
          <h1>{deck.title}</h1>
        </div>
        <div className="deck-count" aria-label={`Item ${index + 1} of ${items.length}`}>
          <strong>{String(index + 1).padStart(2, "0")}</strong>
          <span>/ {String(items.length).padStart(2, "0")}</span>
        </div>
      </div>

      <div
        ref={sceneRef}
        className="spatial-scene"
        {...controls}
      >
        <div className={`spatial-list ${isRetest ? "is-retest" : ""}`} role="list">
          {renderedSlots.map((slot) => {
            const slotIndex = visualSlots.indexOf(slot);
            const offset = slotIndex - activeSlotIndex;
            const slotItem = deck.items.find((candidate) => candidate.id === slot.itemId);
            const active = slot.itemId === item.id;
            const answered = slotItem && answers[slotItem.id] !== undefined;
            return (
              <div
                role="listitem"
                key={slot.id}
                className={`spatial-slot ${active ? "is-active" : ""} ${answered ? "is-answered" : ""}`}
                style={{ "--offset": offset, "--depth": Math.abs(offset) }}
                aria-hidden={!active || slot.kind === "void"}
                inert={!active ? "" : undefined}
              >
                {slot.kind === "void" ? (
                  <VoidSlot reason={slot.reason} />
                ) : slotItem && mode === "flashcards" ? (
                  <Flashcard
                    item={slotItem}
                    rating={ratings[slotItem.id]}
                    onRate={(rating) => onRate(slotItem.id, rating)}
                    active={active}
                  />
                ) : slotItem ? (
                  <McqCard
                    item={slotItem}
                    chosen={answers[slotItem.id]}
                    onAnswer={(choiceIndex) => onAnswer(slotItem.id, choiceIndex)}
                    active={active}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {skipped > 0 && (
        <p className="sr-only">
          {skipped} malformed {skipped === 1 ? "item was" : "items were"} preserved as
          visual voids. {skipReasons.join(" ")}
        </p>
      )}

      <div className="deck-actions">
        <div className="card-toolbar">
          <button type="button" onClick={() => onRegenerate(item)}>↻ Regenerate</button>
          <button type="button" onClick={() => onDelete(item.id)}>⌫ Remove</button>
        </div>
        <div className="deck-navigation">
          <button type="button" onClick={onPrev} disabled={index === 0}>← Prev</button>
          <button type="button" className="finish-button" onClick={onFinish}>
            Finish session
          </button>
          <button type="button" onClick={onNext} disabled={index === items.length - 1}>Next →</button>
        </div>
      </div>
    </section>
  );
}
