// Where the accounts and their logins are kept. For now in memory only: no
// login reaches a file.

export function createVault(host) {
  let kept = [];
  return {
    async load() {
      return kept.map((account) => ({ ...account }));
    },
    async save(accounts) {
      kept = accounts.map((account) => ({ ...account }));
      return { ok: true };
    },
  };
}
