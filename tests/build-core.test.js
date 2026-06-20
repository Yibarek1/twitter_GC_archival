/*
 * Unit tests for the pure archive-assembly core (scripts/build-core.js).
 *
 * These exercise the most complex, most breakable logic in the project —
 * dedupe, chronological sort, merge-accumulation, headers-only roster folding,
 * media resolution, 1:1-DM exclusion, ignoredUsers, and title derivation —
 * WITHOUT any filesystem I/O, so they never touch the real personal_data/.
 *
 * Run: npm run test:unit   (node --test)
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { assembleConversations, isGroupId, kindOf } = require("../scripts/build-core.js");

// ---- helpers to build tiny synthetic export payloads ----------------------
const iso = (s) => new Date(s).toISOString();
function msg(id, senderId, createdAt, text, extra) {
  return { messageCreate: Object.assign({ id, senderId, createdAt: iso(createdAt), text }, extra || {}) };
}
function nameEvent(createdAt, initiatingUserId, name) {
  return { conversationNameUpdate: { createdAt: iso(createdAt), initiatingUserId, name } };
}
function joinEvent(createdAt, initiatingUserId, userIds) {
  return { participantsJoin: { createdAt: iso(createdAt), initiatingUserId, userIds } };
}
function conv(conversationId, messages) {
  return { dmConversation: { conversationId, messages } };
}
// assembleConversations with sensible defaults
function assemble(opts) {
  return assembleConversations(Object.assign(
    { prev: null, exportDatas: [], headerDatas: [], mediaIndex: {}, ignoredUsers: [] },
    opts
  ));
}
const onlyGroup = (res, id) => res.conversations.find((c) => c.id === id);

// ---- pure helpers ----------------------------------------------------------
test("isGroupId: numeric id is a group, {a}-{b} is a 1:1 DM", () => {
  assert.equal(isGroupId("123456"), true);
  assert.equal(isGroupId("100-200"), false);
});

test("kindOf maps extension to img/vid/file", () => {
  assert.equal(kindOf("a.jpg"), "img");
  assert.equal(kindOf("a.MP4"), "vid");
  assert.equal(kindOf("a.txt"), "file");
});

// ---- dedupe ----------------------------------------------------------------
test("dedupes messages by id across multiple exports (last write wins)", () => {
  const res = assemble({
    exportDatas: [
      [conv("G1", [msg("m1", "u1", "2020-05-01T10:00:00Z", "first")])],
      [conv("G1", [msg("m1", "u1", "2020-05-01T10:00:00Z", "edited")])],
    ],
  });
  const g = onlyGroup(res, "G1");
  assert.equal(g.count, 1);
  assert.equal(g.msgs.length, 1);
  assert.equal(g.msgs[0].x, "edited");
});

// ---- chronological sort ----------------------------------------------------
test("sorts messages chronologically by time", () => {
  const res = assemble({
    exportDatas: [[conv("G1", [
      msg("m2", "u1", "2020-05-01T12:00:00Z", "later"),
      msg("m1", "u2", "2020-05-01T10:00:00Z", "earlier"),
      msg("m3", "u1", "2020-05-01T14:00:00Z", "latest"),
    ])]],
  });
  const g = onlyGroup(res, "G1");
  assert.deepEqual(g.msgs.map((m) => m.i), ["m1", "m2", "m3"]);
});

// ---- merge accumulation ----------------------------------------------------
test("accumulates history from the previous build baseline", () => {
  const prev = {
    conversations: [
      { id: "G1", type: "group", title: "G", participants: ["u1"], count: 1,
        msgs: [{ i: "m1", s: "u1", t: Date.parse("2020-05-01T10:00:00Z"), x: "old" }], events: [] },
    ],
  };
  const res = assemble({
    prev,
    exportDatas: [[conv("G1", [msg("m2", "u2", "2020-05-02T10:00:00Z", "new")])]],
  });
  const g = onlyGroup(res, "G1");
  assert.equal(g.count, 2);
  assert.deepEqual(g.msgs.map((m) => m.i), ["m1", "m2"]);
  assert.equal(res.prevCount, 1);
});

// ---- headers-only roster folding -------------------------------------------
test("headers fold in roster participants + events without adding messages", () => {
  const res = assemble({
    exportDatas: [[conv("G1", [msg("m1", "u1", "2020-05-01T10:00:00Z", "hi")])]],
    headerDatas: [[conv("G1", [
      joinEvent("2020-04-30T10:00:00Z", "u1", ["u2", "u3"]),
      msg("h1", "u4", "2020-05-01T09:00:00Z", ""), // header messageCreate → roster only
    ])]],
  });
  const g = onlyGroup(res, "G1");
  assert.equal(g.count, 1, "headers must not add messages");
  for (const id of ["u1", "u2", "u3", "u4"]) {
    assert.ok(g.participants.includes(id), `roster should include ${id}`);
  }
});

// ---- media resolution ------------------------------------------------------
test("resolves local media by {messageId} filename prefix", () => {
  const res = assemble({
    exportDatas: [[conv("G1", [
      msg("m1", "u1", "2020-05-01T10:00:00Z", "pic"),
      msg("m2", "u1", "2020-05-01T11:00:00Z", "no media"),
    ])]],
    mediaIndex: { m1: "personal_data/media/m1-abc.jpg" },
  });
  const g = onlyGroup(res, "G1");
  const m1 = g.msgs.find((m) => m.i === "m1");
  const m2 = g.msgs.find((m) => m.i === "m2");
  assert.equal(m1.m, "personal_data/media/m1-abc.jpg");
  assert.equal(m1.k, "img");
  assert.equal(m2.m, undefined);
  assert.equal(res.totalMedia, 1);
});

// ---- 1:1 DM exclusion ------------------------------------------------------
test("skips 1:1 DM conversations, keeps groups", () => {
  const res = assemble({
    exportDatas: [[
      conv("100-200", [msg("d1", "100", "2020-05-01T10:00:00Z", "dm")]),
      conv("G1", [msg("m1", "u1", "2020-05-01T10:00:00Z", "group")]),
    ]],
  });
  assert.equal(res.conversations.length, 1);
  assert.equal(res.conversations[0].id, "G1");
});

// ---- ignoredUsers ----------------------------------------------------------
test("drops messages + roster entries from ignoredUsers", () => {
  const res = assemble({
    exportDatas: [[conv("G1", [
      msg("m1", "u1", "2020-05-01T10:00:00Z", "keep"),
      msg("m2", "bot", "2020-05-01T11:00:00Z", "drop me"),
    ])]],
    ignoredUsers: ["bot"],
  });
  const g = onlyGroup(res, "G1");
  assert.equal(g.count, 1);
  assert.deepEqual(g.msgs.map((m) => m.s), ["u1"]);
  assert.ok(!g.participants.includes("bot"));
});

// ---- title derivation ------------------------------------------------------
test("title is the most recent name event, else 'Group <last4>'", () => {
  const named = assemble({
    exportDatas: [[conv("G1", [
      msg("m1", "u1", "2020-05-01T10:00:00Z", "hi"),
      nameEvent("2020-05-02T10:00:00Z", "u1", "First Name"),
      nameEvent("2020-05-03T10:00:00Z", "u1", "Latest Name"),
    ])]],
  });
  assert.equal(onlyGroup(named, "G1").title, "Latest Name");

  const unnamed = assemble({
    exportDatas: [[conv("987654", [msg("m1", "u1", "2020-05-01T10:00:00Z", "hi")])]],
  });
  assert.equal(onlyGroup(unnamed, "987654").title, "Group 7654");
});
