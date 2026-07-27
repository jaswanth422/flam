function groupByTopic(items, answers) {
  const groups = new Map();
  for (const item of items) {
    const topic = item.topic || "General";
    const group = groups.get(topic) ?? { topic, correct: 0, total: 0 };
    group.total += 1;
    if (answers[item.id] === item.correctIndex) group.correct += 1;
    groups.set(topic, group);
  }
  return [...groups.values()].sort((a, b) => {
    const aRate = a.total ? a.correct / a.total : 0;
    const bRate = b.total ? b.correct / b.total : 0;
    return aRate - bRate || a.topic.localeCompare(b.topic);
  });
}

export function scoreSession(deck, answers) {
  const items = deck?.items.filter((item) => item.type === "mcq") ?? [];
  const answered = items.filter((item) => answers[item.id] !== undefined);
  const correct = items.filter((item) => answers[item.id] === item.correctIndex);

  return {
    total: items.length,
    answered: answered.length,
    skipped: items.length - answered.length,
    correct: correct.length,
    wrong: items.length - correct.length,
    percent: items.length
      ? Math.round((correct.length / items.length) * 100)
      : 0,
    byTopic: groupByTopic(items, answers),
    review: items.map((item) => ({
      item,
      chosen: answers[item.id] ?? null,
      isCorrect: answers[item.id] === item.correctIndex,
    })),
  };
}
