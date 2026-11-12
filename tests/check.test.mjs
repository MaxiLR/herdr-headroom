import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const mod = fileURLToPath(new URL("../mods/headroom", import.meta.url));

test("herdr-app check loads the mod with no accounts", (t) => {
  // An empty Herdr home: no shared state, so no readings.
  const home = mkdtempSync(join(tmpdir(), "headroom-check-"));
  try {
    const result = spawnSync("herdr-app", ["check", mod], {
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
});
