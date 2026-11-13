// The one surface the mod asks of Herdr and the machine, built from the
// `herdr` module's functions so that everything else can be tested with a
// fake of it.

// `api`: `{ fetch, exec, appHome, readTextFile, writeTextFile, shared,
// setShared, notify, layout, run, openOverlay, closeOverlay, platform }`.
export function createHost(api) {
  const platform = api.platform();
  return {
    now: () => Date.now(),
    random: (n) => crypto.getRandomValues(new Uint8Array(n)),
    fetch: (url, options) => api.fetch(url, options),
    platform,
    home: api.appHome(),
    exec: (command, args) => api.exec(command, args),
    readText: (path) => api.readTextFile(path),
    writeText: (path, text, expected) =>
      api.writeTextFile(path, text, expected),
    shared: (key) => api.shared(key),
    setShared: (key, value) => api.setShared(key, value),
    notify: ({ title, body, level }) => api.notify({ title, body, level }),
    layout: () => api.layout(),
    resize: (id, px) => api.run("layout.resize", { id, px }),
    openOverlay: (spec) => api.openOverlay(spec),
    closeOverlay: (id) => api.closeOverlay(id),
    async openUrl(url) {
      try {
        await api.exec(platform === "macos" ? "open" : "xdg-open", [url]);
        return true;
      } catch {
        return false;
      }
    },
  };
}
