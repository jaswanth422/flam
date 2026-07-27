export const initialState = {
  deck: null,
  phase: "idle",
  mode: "flashcards",
  grounding: "topic",
  cardIndex: 0,
  answers: {},
  ratings: {},
  wrongIds: [],
  activeIds: null,
  skipped: 0,
  skipReasons: [],
  error: null,
  attempt: 0,
};

export const actions = {
  setMode: (mode) => ({ type: "SET_MODE", payload: { mode } }),
  generateStart: (mode, grounding, repair = false) => ({
    type: "GENERATE_START",
    payload: { mode, grounding },
    repair,
  }),
  generateSuccess: (deck, skipped = 0, skipReasons = []) => ({
    type: "GENERATE_SUCCESS",
    payload: { deck, skipped, skipReasons },
  }),
  generateFailure: (error) => ({ type: "GENERATE_FAILURE", payload: { error } }),
  nextCard: () => ({ type: "NEXT_CARD" }),
  prevCard: () => ({ type: "PREV_CARD" }),
  answer: (itemId, choiceIndex) => ({
    type: "ANSWER",
    payload: { itemId, choiceIndex },
  }),
  rateCard: (itemId, rating) => ({
    type: "RATE_CARD",
    payload: { itemId, rating },
  }),
  finishSession: () => ({ type: "FINISH_SESSION" }),
  retestWrong: () => ({ type: "RETEST_WRONG" }),
  retakeAll: () => ({ type: "RETAKE_ALL" }),
  reset: () => ({ type: "RESET" }),
  editItem: (itemId, patch) => ({ type: "EDIT_ITEM", payload: { itemId, patch } }),
  deleteItem: (itemId) => ({ type: "DELETE_ITEM", payload: { itemId } }),
  dismissError: () => ({ type: "DISMISS_ERROR" }),
};

function visibleItems(state) {
  if (!state.deck) return [];
  if (state.activeIds === null) return state.deck.items;
  const ids = new Set(state.activeIds);
  return state.deck.items.filter((item) => ids.has(item.id));
}

function clampedIndex(index, length) {
  return Math.max(0, Math.min(index, Math.max(0, length - 1)));
}

export function deckReducer(state, action) {
  switch (action.type) {
    case "SET_MODE":
      if (
        state.phase !== "idle" ||
        !["flashcards", "quiz"].includes(action.payload.mode)
      ) {
        return state;
      }
      return { ...state, mode: action.payload.mode };
    case "GENERATE_START":
      return {
        ...state,
        deck: null,
        phase: "loading",
        mode: ["flashcards", "quiz"].includes(action.payload.mode)
          ? action.payload.mode
          : state.mode,
        grounding: ["source", "topic"].includes(action.payload.grounding)
          ? action.payload.grounding
          : state.grounding,
        error: null,
        skipped: 0,
        skipReasons: [],
        attempt: action.repair ? state.attempt + 1 : 0,
      };
    case "GENERATE_SUCCESS":
      return {
        ...state,
        deck: action.payload.deck,
        skipped: action.payload.skipped,
        skipReasons: action.payload.skipReasons ?? [],
        phase: "studying",
        cardIndex: 0,
        answers: {},
        ratings: {},
        wrongIds: [],
        activeIds: null,
        error: null,
      };
    case "GENERATE_FAILURE":
      return { ...state, phase: "idle", error: action.payload.error };
    case "NEXT_CARD": {
      const count = visibleItems(state).length;
      return { ...state, cardIndex: clampedIndex(state.cardIndex + 1, count) };
    }
    case "PREV_CARD": {
      const count = visibleItems(state).length;
      return { ...state, cardIndex: clampedIndex(state.cardIndex - 1, count) };
    }
    case "ANSWER":
      if (
        state.mode !== "quiz" ||
        Object.hasOwn(state.answers, action.payload.itemId)
      ) {
        return state;
      }
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.itemId]: action.payload.choiceIndex,
        },
      };
    case "RATE_CARD":
      if (
        state.mode !== "flashcards" ||
        !["known", "unknown"].includes(action.payload.rating)
      ) {
        return state;
      }
      return {
        ...state,
        ratings: {
          ...state.ratings,
          [action.payload.itemId]: action.payload.rating,
        },
      };
    case "FINISH_SESSION": {
      const items = visibleItems(state);
      const wrongIds =
        state.mode === "quiz"
          ? items
              .filter((item) => state.answers[item.id] !== item.correctIndex)
              .map((item) => item.id)
          : items
              .filter((item) => state.ratings[item.id] !== "known")
              .map((item) => item.id);
      return { ...state, wrongIds, phase: "results" };
    }
    case "RETEST_WRONG":
      if (state.wrongIds.length === 0) return state;
      return {
        ...state,
        activeIds: [...state.wrongIds],
        cardIndex: 0,
        answers: Object.fromEntries(
          Object.entries(state.answers).filter(([id]) => !state.wrongIds.includes(id)),
        ),
        ratings: Object.fromEntries(
          Object.entries(state.ratings).filter(([id]) => !state.wrongIds.includes(id)),
        ),
        phase: "studying",
      };
    case "RETAKE_ALL":
      if (!state.deck) return state;
      return {
        ...state,
        activeIds: null,
        cardIndex: 0,
        answers: {},
        ratings: {},
        wrongIds: [],
        phase: "studying",
      };
    case "RESET":
      return initialState;
    case "EDIT_ITEM":
      if (!state.deck) return state;
      return {
        ...state,
        deck: {
          ...state.deck,
          items: state.deck.items.map((item) =>
            item.id === action.payload.itemId
              ? { ...item, ...action.payload.patch, id: item.id }
              : item,
          ),
        },
      };
    case "DELETE_ITEM": {
      if (!state.deck) return state;
      const id = action.payload.itemId;
      const items = state.deck.items.filter((item) => item.id !== id);
      const slots = state.deck.slots?.filter((slot) => slot.itemId !== id);
      const { [id]: ignoredAnswer, ...answers } = state.answers;
      const { [id]: ignoredRating, ...ratings } = state.ratings;
      const wrongIds = state.wrongIds.filter((wrongId) => wrongId !== id);
      const activeIds = state.activeIds?.filter((activeId) => activeId !== id) ?? null;
      const visibleCount =
        activeIds === null ? items.length : items.filter((item) => activeIds.includes(item.id)).length;
      return {
        ...state,
        deck: { ...state.deck, items, slots },
        answers,
        ratings,
        wrongIds,
        activeIds,
        cardIndex: clampedIndex(state.cardIndex, visibleCount),
      };
    }
    case "DISMISS_ERROR":
      return { ...state, error: null };
    default:
      throw new Error(`Unknown deck action: ${action.type}`);
  }
}
