// Where the accounts and their logins are kept: `<home>/headroom/vault.json`,
// `{ version: 1, accounts }`. Under the Herdr home because a mod can write
// files only there, outside `mods/` so that copying or sharing the mod never
// carries a login. The folder is 0700 and the file 0600; programs get paths
// and modes, never the file's content.

const VERSION = 1;
const REFUSED = { ok: false, kind: "vault" };
const PRIVATE = "private";
const EXPOSED = "exposed";
const UNKNOWN = "unknown";

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
  // Whether this vault has made sure the folder is 0700 and the file 0600
  // since it was created or last refused; until then no token is written.
  let confirmed = false;

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

  // What stat says of the file's mode: PRIVATE for 0600, EXPOSED for another
  // mode, UNKNOWN when it fails or cannot start, which says nothing of who
  // can read the file. An answer that is not a mode says nothing against it.
  async function privacy() {
    const args =
      host.platform === "macos" ? ["-f", "%Lp", path] : ["-c", "%a", path];
    let answer;
    try {
      answer = await host.exec("stat", args);
    } catch {
      return UNKNOWN;
    }
    if (answer?.code !== 0) return UNKNOWN;
    const mode = String(answer.stdout ?? "").trim();
    return !/^[0-7]+$/.test(mode) || mode === "600" ? PRIVATE : EXPOSED;
  }

  // Writes `text` over the snapshot; on a stale one, reads again and tries
  // once more. Herdr replaces the file atomically, so a failed write leaves
  // the previous file whole. Answers the text it replaced.
  async function write(text) {
    if (snapshot === undefined) await read();
    try {
      await host.writeText(path, text, snapshot);
    } catch {
      await read();
      await host.writeText(path, text, snapshot);
    }
    const replaced = snapshot;
    snapshot = text;
    return replaced;
  }

  // chmod 600, then what stat says; PRIVATE only when both did their part.
  async function settle() {
    const chmodded = await ran("chmod", ["600", path]);
    const state = await privacy();
    return state === PRIVATE && !chmodded ? UNKNOWN : state;
  }

  // The folder 0700 and the file, created empty when absent, 0600, before
  // any token is written. A folder that cannot be made is UNKNOWN: nothing
  // says the file is readable.
  async function confirm() {
    if (!(await ran("mkdir", ["-p", folder]))) return UNKNOWN;
    if (!(await ran("chmod", ["700", folder]))) return UNKNOWN;
    if (snapshot === null) await write("");
    return settle();
  }

  // An atomic replace can reset the mode; the 0700 folder covers that moment.
  // A stat that reported another mode keeps that answer when the next one
  // cannot run.
  async function repair() {
    const first = await privacy();
    if (first === PRIVATE) return PRIVATE;
    const state = await settle();
    return state === UNKNOWN && first === EXPOSED ? EXPOSED : state;
  }

  // Puts `before` (null: no file) back where this vault wrote `written`, then
  // chmod 600 again, which the replace resets. A file another copy wrote
  // meanwhile is theirs and stays.
  async function restore(before, written) {
    const text = before ?? "";
    try {
      await host.writeText(path, text, written);
    } catch {
      snapshot = undefined;
      return;
    }
    snapshot = text;
    await ran("chmod", ["600", path]);
  }

  return {
    async load() {
      return accountsOf(await read());
    },

    // A file stat says others can read keeps no token. When its mode cannot
    // be read the save is refused and the file holds what it held before.
    async save(accounts) {
      try {
        if (snapshot === undefined) await read();
        if (!confirmed) {
          const state = await confirm();
          if (state !== PRIVATE) {
            if (state === EXPOSED && snapshot) await write("");
            return REFUSED;
          }
        }
        confirmed = true;
        const written = JSON.stringify({ version: VERSION, accounts }, null, 2);
        const before = await write(written);
        const state = await repair();
        if (state === PRIVATE) return { ok: true };
        confirmed = false;
        if (state === EXPOSED) await write("");
        else await restore(before, written);
        return REFUSED;
      } catch {
        confirmed = false;
        return REFUSED;
      }
    },
  };
}
