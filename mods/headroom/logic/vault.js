// Where the accounts and their logins are kept: `<home>/headroom/vault.json`,
// `{ version: 1, accounts }`. Under the Herdr home because a mod can write
// files only there, outside `mods/` so that copying or sharing the mod never
// carries a login. The folder is 0700 and the file 0600; programs get paths
// and modes, never the file's content.

const VERSION = 1;
const REFUSED = { ok: false, kind: "vault" };

function accountsOf(text) {
  if (text == null) return [];
  try {
    const vault = JSON.parse(text);
    if (vault?.version !== VERSION || !Array.isArray(vault.accounts)) return [];
    return vault.accounts.filter(
      (account) =>
        typeof account?.id === "string" &&
        typeof account.provider === "string" &&
        account.identity != null &&
        typeof account.identity === "object",
    );
  } catch {
    return [];
  }
}

export function createVault(host) {
  const folder = `${host.home}/headroom`;
  const path = `${folder}/vault.json`;
  // The file's text as last read or written: null when it is absent,
  // undefined before it was first read.
  let snapshot;

  async function read() {
    snapshot = await host.readText(path);
    return snapshot;
  }

  // Whether the program ran and succeeded; its answer otherwise is never
  // looked at, so nothing it says reaches an error.
  async function ran(command, args) {
    try {
      return (await host.exec(command, args))?.code === 0;
    } catch {
      return false;
    }
  }

  // Whether the file is 0600. A stat that fails, or answers another mode,
  // says it is not; an answer that is not a mode says nothing against it.
  async function isPrivate() {
    const args =
      host.platform === "macos" ? ["-f", "%Lp", path] : ["-c", "%a", path];
    let answer;
    try {
      answer = await host.exec("stat", args);
    } catch {
      return false;
    }
    if (answer?.code !== 0) return false;
    const mode = String(answer.stdout ?? "").trim();
    return !/^[0-7]+$/.test(mode) || mode === "600";
  }

  // Writes `text` over the snapshot; on a stale one, reads again and tries
  // once more. Herdr replaces the file atomically, so a failed write leaves
  // the previous file whole.
  async function write(text) {
    if (snapshot === undefined) await read();
    try {
      await host.writeText(path, text, snapshot);
    } catch {
      await read();
      await host.writeText(path, text, snapshot);
    }
    snapshot = text;
  }

  // The folder 0700 and an empty file 0600, before any token is written.
  async function create() {
    if (!(await ran("mkdir", ["-p", folder]))) return false;
    if (!(await ran("chmod", ["700", folder]))) return false;
    await write("");
    return (await ran("chmod", ["600", path])) && (await isPrivate());
  }

  // An atomic replace can reset the mode; the 0700 folder covers that moment.
  async function repair() {
    if (await isPrivate()) return true;
    return (await ran("chmod", ["600", path])) && (await isPrivate());
  }

  return {
    async load() {
      return accountsOf(await read());
    },

    async save(accounts) {
      try {
        if (snapshot === undefined) await read();
        if (snapshot === null && !(await create())) {
          // Whatever the file holds, it keeps no token.
          if (snapshot) await write("");
          return REFUSED;
        }
        await write(JSON.stringify({ version: VERSION, accounts }, null, 2));
        if (await repair()) return { ok: true };
        await write("");
        return REFUSED;
      } catch {
        return REFUSED;
      }
    },
  };
}
