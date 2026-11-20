// The host built from the `herdr` module's own functions: what a copy of the
// mod runs on inside Herdr.
import {
  agents,
  appHome,
  closeOverlay,
  exec,
  layout,
  notify,
  openOverlay,
  readTextFile,
  run,
  setShared,
  shared,
  writeTextFile,
} from "herdr";
import { createHost } from "./host.js";

export function herdrHost() {
  return createHost({
    fetch: (url, options) => fetch(url, options),
    exec,
    appHome,
    readTextFile,
    writeTextFile,
    shared,
    setShared,
    notify,
    layout,
    run,
    openOverlay,
    closeOverlay,
    // The runtime's own name for the system ("macos", "linux", "windows"),
    // known before any window opens; `window()` is null until then.
    platform: () => process.platform,
    agents,
  });
}
