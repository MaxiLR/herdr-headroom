import { test } from "node:test";
import assert from "node:assert/strict";
import { createHost } from "../mods/headroom/logic/host.js";

// The herdr functions createHost is given, recording programs and commands.
function api({ platform, exec, agents = [] } = {}) {
  const calls = { exec: [], run: [] };
  return {
    calls,
    api: {
      fetch: async () => ({ status: 404, ok: false }),
      exec: async (command, args) => {
        calls.exec.push([command, args]);
        if (exec) return exec(command, args);
        return { code: 0, stdout: "", stderr: "" };
      },
      appHome: () => "/home/test/.config/herdr-app",
      readTextFile: async () => null,
      writeTextFile: async () => null,
      shared: () => null,
      setShared: () => null,
      notify: () => "toast-1",
      layout: () => null,
      run: (name, args) => {
        calls.run.push([name, args]);
        return null;
      },
      openOverlay: () => "overlay-1",
      closeOverlay: () => null,
      platform: () => platform,
      agents: () => agents,
    },
  };
}

const ADDRESS = "https://auth.openai.com/codex/device";

test("openUrl opens the address with open on macOS", async () => {
  const { api: given, calls } = api({ platform: "macos" });
  const host = createHost(given);
  assert.equal(await host.openUrl(ADDRESS), true);
  assert.deepEqual(calls.exec, [["open", [ADDRESS]]]);
});

test("openUrl opens the address with xdg-open on Linux", async () => {
  const { api: given, calls } = api({ platform: "linux" });
  const host = createHost(given);
  assert.equal(await host.openUrl(ADDRESS), true);
  assert.deepEqual(calls.exec, [["xdg-open", [ADDRESS]]]);
});

test("openUrl answers false when the program cannot start", async () => {
  const { api: given } = api({
    platform: "linux",
    exec: () => {
      throw new Error("not installed");
    },
  });
  const host = createHost(given);
  assert.equal(await host.openUrl(ADDRESS), false);
});

test("resize runs layout.resize with the block and its size", () => {
  const { api: given, calls } = api({ platform: "macos" });
  const host = createHost(given);
  host.resize("headroom-block", 212);
  assert.deepEqual(calls.run, [
    ["layout.resize", { id: "headroom-block", px: 212 }],
  ]);
});

test("home is the app's folder", () => {
  const { api: given } = api({ platform: "macos" });
  assert.equal(createHost(given).home, "/home/test/.config/herdr-app");
});

test("working says whether an agent in Herdr is working", () => {
  const hostWith = (statuses) =>
    createHost(
      api({
        platform: "macos",
        agents: statuses.map((status) => ({ status })),
      }).api,
    );
  assert.equal(hostWith([]).working(), false);
  assert.equal(hostWith(["idle", "done", "blocked"]).working(), false);
  assert.equal(hostWith(["idle", "working"]).working(), true);
});
