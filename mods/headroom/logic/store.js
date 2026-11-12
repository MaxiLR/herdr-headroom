export function createStore(host, options) {
  const none = async () => ({ ok: false, kind: "unexpected" });
  return {
    start: none,
    accounts: () => [],
    connect: none,
    tick: none,
    refresh: none,
  };
}
export function sharedStore(host) {
  return createStore(host);
}
