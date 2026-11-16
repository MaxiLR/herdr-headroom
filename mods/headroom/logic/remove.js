// The remove dialog's logic: the account it asks about and its two answers.
// Kept apart from `ui/remove.js` so the answers run without Herdr. The
// dialog's state is `view.ui.remove`, plain data: `removing` once Remove was
// pressed, `closed` once the dialog is asked to close.

function stateOf(view) {
  return (view.ui.remove ??= {});
}

/** The reading of the account `view.props.remove` names, or null. */
export function removedOf(view) {
  const id = view.props.remove;
  return view.readings.find((reading) => reading.id === id) ?? null;
}

// What the dialog says of an account that has no email.
const UNNAMED = { claude: "A Claude account", codex: "A Codex account" };

/**
 * The line under the question, telling apart accounts with one label: the
 * email of the account `reading` is (from `view.store.accounts()`), or which
 * provider's account it is.
 */
export function removedWho(view, reading) {
  const account = view.store
    .accounts()
    .find((entry) => entry.id === reading.id);
  return account?.email || UNNAMED[reading.provider];
}

/** Closes the dialog, once. */
export function closeRemove(view) {
  const state = stateOf(view);
  if (state.closed || !view.props.overlay) return;
  state.closed = true;
  view.host.closeOverlay(view.props.overlay);
}

/**
 * Remove, or Enter: deletes the account the title names, then closes once the
 * store has answered. A second press while it runs, or after, does nothing;
 * an account no longer connected is not removed, and the dialog closes.
 */
export async function confirmRemove(view) {
  const state = stateOf(view);
  if (state.removing || state.closed) return;
  const reading = removedOf(view);
  if (reading === null) {
    closeRemove(view);
    return;
  }
  state.removing = true;
  try {
    await view.store.remove(reading.id);
  } finally {
    closeRemove(view);
  }
}

/** Cancel, or Esc: the dialog closes and the account stays. */
export function cancelRemove(view) {
  if (stateOf(view).removing) return;
  closeRemove(view);
}
