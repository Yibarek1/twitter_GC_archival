/* keepalive.js — heartbeat for the double-click launcher.
 *
 * The launcher starts the local server with `--open`; that server shuts itself
 * down when the heartbeat goes quiet, so closing the browser also closes the
 * stray command window. This is a no-op over file:// (nothing to talk to) and
 * harmless against a manually-started server (which ignores the heartbeat). */
(function () {
  if (location.protocol !== "http:" && location.protocol !== "https:") return;
  function ping() { try { fetch("/api/ping", { cache: "no-store" }).catch(function () {}); } catch (e) {} }
  ping();
  setInterval(ping, 2000);
}());
