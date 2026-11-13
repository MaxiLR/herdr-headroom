// The accounts kept in the vault: their ids, labels and order. Every
// operation answers a new list, positions 0..n-1 in order.

// One email can hold several organizations; each is its own account.
export function accountId(providerId, identity) {
  return `${providerId}:${identity.accountId}:${identity.organizationId}`;
}

// The part of the email before `@`; when another account already has that
// label, the organization, or the plan without one, is added.
export function defaultLabel(identity, labels) {
  const name = identity.email?.split("@")[0] || null;
  const detail = identity.organization ?? identity.plan ?? null;
  if (!name) return detail ?? "";
  if (!labels.includes(name) || !detail) return name;
  return `${name} · ${detail}`;
}

const ordered = (accounts) =>
  [...accounts]
    .sort((a, b) => a.position - b.position)
    .map((account, position) => ({ ...account, position }));

// An account with the same id keeps its label and position and takes the new
// login and identity; a new one goes last.
export function upsert(accounts, account) {
  const list = ordered(accounts);
  const at = list.findIndex((item) => item.id === account.id);
  if (at === -1) return ordered([...list, { ...account, position: Infinity }]);
  const { label, position } = list[at];
  list[at] = { ...account, label, position };
  return list;
}

// The label trimmed; an empty one goes back to the default.
export function rename(accounts, id, label) {
  const list = ordered(accounts);
  const trimmed = String(label ?? "").trim();
  return list.map((account) =>
    account.id !== id
      ? account
      : {
          ...account,
          label:
            trimmed ||
            defaultLabel(
              account.identity,
              list.filter((item) => item.id !== id).map((item) => item.label),
            ),
        },
  );
}

// One place up (-1) or down (+1); nothing at an edge.
export function move(accounts, id, delta) {
  const list = ordered(accounts);
  const from = list.findIndex((item) => item.id === id);
  const to = from + Math.sign(delta);
  if (from === -1 || to < 0 || to >= list.length) return list;
  [list[from], list[to]] = [list[to], list[from]];
  return list.map((account, position) => ({ ...account, position }));
}

export function remove(accounts, id) {
  return ordered(accounts.filter((account) => account.id !== id));
}
