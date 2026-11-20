import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const mod = fileURLToPath(new URL("../mods/headroom", import.meta.url));
const hostProbe = fileURLToPath(
  new URL("./fixtures/herdr-host.js", import.meta.url),
);

// Loads the mod in `folder` once with `herdr-app check` in an empty Herdr
// home (no shared state, so no readings) and asserts the load passed.
function assertChecks(t, folder) {
  const home = mkdtempSync(join(tmpdir(), "headroom-check-"));
  try {
    const result = spawnSync("herdr-app", ["check", folder], {
      encoding: "utf8",
      env: { ...process.env, HERDR_APP_HOME: home },
    });
    if (result.error?.code === "ENOENT") {
      t.skip("herdr-app is not on PATH");
      return;
    }
    assert.equal(
      result.status,
      0,
      `herdr-app check failed:\n${result.stdout}${result.stderr}`,
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

test("herdr-app check loads the mod with no accounts", (t) => {
  assertChecks(t, mod);
});

// Without the platform the vault asks macOS's stat in Linux's words, is told
// no, and refuses every login. Herdr loads only modules inside the mod's own
// folder, so the probe replaces main.js in a copy of the mod.
test("the host knows its platform while Herdr has no window open", (t) => {
  const folder = mkdtempSync(join(tmpdir(), "headroom-host-"));
  try {
    cpSync(mod, folder, { recursive: true });
    cpSync(hostProbe, join(folder, "main.js"));
    assertChecks(t, folder);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
