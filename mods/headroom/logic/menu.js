// The account menu's items, in order, and the question asked before an
// account is removed.

/**
 * The menu of account `id` among `readings` (in the person's order): each
 * item `{ key, label, enabled }`. The first account cannot move up, the last
 * cannot move down.
 */
export function menuItems(readings, id) {
  const index = readings.findIndex((reading) => reading.id === id);
  return [
    { key: "rename", label: "Rename", enabled: true },
    { key: "up", label: "Move up", enabled: index > 0 },
    {
      key: "down",
      label: "Move down",
      enabled: index >= 0 && index < readings.length - 1,
    },
    { key: "signin", label: "Sign in again", enabled: true },
    { key: "remove", label: "Remove", enabled: true },
  ];
}

/** What the confirm dialog asks before the account `label` is removed. */
export function removeQuestion(label) {
  return {
    title: `Remove ${label}?`,
    detail: "Its stored login is deleted from this computer.",
  };
}
