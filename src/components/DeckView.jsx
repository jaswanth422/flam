import { useEffect, useMemo, useRef, useState } from "react";
import { summarize } from "../lib/grounding.js";
import { validateItem } from "../lib/schema.js";
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

function EditCardPanel({ item, grounding, onSave, onCancel, error }) {
  const [draft, setDraft] = useState(() => ({ ...item, choices: [...(item.choices ?? [])] }));
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    onSave(draft);
  };
  return (
    <form className="card-editor" onSubmit={submit}>
      <strong>Edit this {item.type === "mcq" ? "question" : "card"}</strong>
      {item.type === "flashcard" ? (
        <>
          <label>Front<input required value={draft.front} onChange={(event) => update("front", event.target.value)} /></label>
          <label>Answer<input required value={draft.back} onChange={(event) => update("back", event.target.value)} /></label>
          <label>Story<textarea rows="3" value={draft.story} onChange={(event) => update("story", event.target.value)} /></label>
        </>
      ) : (
        <>
          <label>Question<input required value={draft.question} onChange={(event) => update("question", event.target.value)} /></label>
          {draft.choices.map((choice, choiceIndex) => (
            <label key={choiceIndex}>
              Choice {choiceIndex + 1}
              <input
                required
                value={choice}
                onChange={(event) => {
                  const choices = [...draft.choices];
                  choices[choiceIndex] = event.target.value;
                  update("choices", choices);
                }}
              />
            </label>
          ))}
          <label>Correct choice
            <select value={draft.correctIndex} onChange={(event) => update("correctIndex", Number(event.target.value))}>
              {draft.choices.map((_, choiceIndex) => <option key={choiceIndex} value={choiceIndex}>{choiceIndex + 1}</option>)}
            </select>
          </label>
          <label>Why<textarea rows="2" value={draft.why} onChange={(event) => update("why", event.target.value)} /></label>
        </>
      )}
      <label>Topic<input value={draft.topic} onChange={(event) => update("topic", event.target.value)} /></label>
      {grounding === "source" && (
        <label>Evidence<textarea rows="2" value={draft.evidence} onChange={(event) => update("evidence", event.target.value)} /></label>
      )}
      {error && <p className="editor-error">{error}</p>}
      <div>
        <button type="submit">Save changes</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
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
  onEdit,
  onRegenerate,
  onFinish,
  grounding,
  sourceText,
  regeneratingIds = [],
}) {
  const sceneRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
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
  const trust = useMemo(() => summarize(deck.items), [deck.items]);
  const matched = trust.verified + trust.partial;

  const activeSlotIndex = visualSlots.findIndex((slot) => slot.itemId === item?.id);
  const renderedSlots = visualSlots.filter((slot, slotIndex) => {
    const offset = slotIndex - activeSlotIndex;
    return mode === "flashcards" ? Math.abs(offset) <= 3 : offset >= 0 && offset <= 3;
  });

  if (!item) return null;

  const rateAndAdvance = (itemId, rating) => {
    onRate(itemId, rating);
    if (index < items.length - 1) window.setTimeout(onNext, 120);
  };

  const removeItem = () => {
    if (confirmDeleteId !== item.id) {
      setConfirmDeleteId(item.id);
      return;
    }
    onDelete(item.id);
    setConfirmDeleteId(null);
  };

  const saveEdit = (patch) => {
    const validated = validateItem(patch, mode, { grounding, sourceText });
    if (!validated.ok) {
      setEditError(validated.reason);
      return;
    }
    onEdit(item.id, validated.item);
    setEditError("");
    setEditing(false);
  };

  return (
    <section className={`deck-view mode-${mode}`}>
      <div className="deck-heading">
        <div>
          <p className="eyebrow">{mode === "quiz" ? "QUIZ TUMBLER" : "FLASH ORBIT"}</p>
          <h1>{deck.title}</h1>
        </div>
        <div className="deck-status">
          <div className="deck-count" aria-label={`Item ${index + 1} of ${items.length}`}>
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <span>/ {String(items.length).padStart(2, "0")}</span>
          </div>
          {grounding === "source" ? (
            <div className="deck-trust">
              <span>✓ {matched} of {trust.total} verified from your notes</span>
              {trust.unverified > 0 && <span className="has-warning">⚠ {trust.unverified} {trust.unverified === 1 ? "card" : "cards"} couldn’t be verified</span>}
            </div>
          ) : (
            <div className="deck-trust is-topic">From general knowledge — not from your notes</div>
          )}
        </div>
      </div>

      <div
        ref={sceneRef}
        className="spatial-scene"
        {...controls}
      >
        <button
          type="button"
          className="scene-nav scene-prev"
          onClick={onPrev}
          disabled={index === 0}
          aria-label="Previous card"
        >‹</button>
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
                    onRate={(rating) => rateAndAdvance(slotItem.id, rating)}
                    active={active}
                    grounding={grounding}
                    isRegenerating={regeneratingIds.includes(slotItem.id)}
                  />
                ) : slotItem ? (
                  <McqCard
                    item={slotItem}
                    chosen={answers[slotItem.id]}
                    onAnswer={(choiceIndex) => onAnswer(slotItem.id, choiceIndex)}
                    active={active}
                    grounding={grounding}
                    isRegenerating={regeneratingIds.includes(slotItem.id)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="scene-nav scene-next"
          onClick={onNext}
          disabled={index === items.length - 1}
          aria-label="Next card"
        >›</button>
      </div>

      {skipped > 0 && (
        <p className="sr-only">
          {skipped} malformed {skipped === 1 ? "item was" : "items were"} preserved as
          visual voids. {skipReasons.join(" ")}
        </p>
      )}

      <div className="deck-actions">
        {editing && (
          <EditCardPanel
            key={item.id}
            item={item}
            grounding={grounding}
            onSave={saveEdit}
            onCancel={() => setEditing(false)}
            error={editError}
          />
        )}
        <div className="secondary-row">
          <div className="card-toolbar desktop-toolbar">
            <button type="button" onClick={() => setEditing((value) => !value)}>Edit</button>
            <button type="button" onClick={() => onRegenerate(item)} disabled={regeneratingIds.includes(item.id)}>
              {regeneratingIds.includes(item.id) ? "Regenerating…" : "Regenerate"}
            </button>
            <button type="button" onClick={removeItem}>
              {confirmDeleteId === item.id ? "Sure?" : "Delete"}
            </button>
          </div>
          <details className="mobile-more">
            <summary aria-label="More card actions">⋯</summary>
            <div>
              <button type="button" onClick={() => setEditing((value) => !value)}>Edit</button>
              <button type="button" onClick={() => onRegenerate(item)}>Regenerate</button>
              <button type="button" onClick={removeItem}>{confirmDeleteId === item.id ? "Sure?" : "Delete"}</button>
            </div>
          </details>
          <button
            type="button"
            className={`finish-session ${index === items.length - 1 ? "is-promoted" : ""}`}
            onClick={onFinish}
          >
            Finish <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
