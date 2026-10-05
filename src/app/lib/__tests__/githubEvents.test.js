import assert from "node:assert/strict";
import { test } from "node:test";
import { mapGitHubEvents } from "../githubEvents.js";

const waktu = "2026-10-05T01:02:03Z";

test("hanya PushEvent dan PullRequestEvent yang dipetakan", () => {
  const hasil = mapGitHubEvents([
    { id: "1", type: "WatchEvent", repo: { name: "a/b" }, created_at: waktu },
    { id: "2", type: "PushEvent", repo: { name: "a/b" }, payload: { head: "abc1234ff" }, created_at: waktu },
  ]);
  assert.equal(hasil.length, 1);
  assert.deepEqual(hasil[0], {
    id: "2",
    tipe: "push",
    repo: "a/b",
    commit: "abc1234ff",
    additions: null,
    deletions: null,
    time: waktu,
  });
});

test("PushEvent memakai sha commit pertama bila tersedia", () => {
  const [ev] = mapGitHubEvents([
    { id: "3", type: "PushEvent", repo: { name: "a/b" }, payload: { head: "zzz", commits: [{ sha: "c0ffee1" }] }, created_at: waktu },
  ]);
  assert.equal(ev.commit, "c0ffee1");
});

test("PullRequestEvent: additions/deletions null bila payload dipangkas", () => {
  const [lengkap, dipangkas] = mapGitHubEvents([
    { id: "4", type: "PullRequestEvent", repo: { name: "a/b" }, payload: { pull_request: { head: { sha: "beef" }, additions: 10, deletions: 2 } }, created_at: waktu },
    { id: "5", type: "PullRequestEvent", repo: { name: "a/b" }, payload: { pull_request: { number: 7 } }, created_at: waktu },
  ]);
  assert.equal(lengkap.tipe, "pr");
  assert.equal(lengkap.additions, 10);
  assert.equal(lengkap.deletions, 2);
  assert.equal(dipangkas.additions, null);
  assert.equal(dipangkas.deletions, null);
});

test("input bukan array menghasilkan array kosong", () => {
  assert.deepEqual(mapGitHubEvents(null), []);
  assert.deepEqual(mapGitHubEvents({ message: "rate limit" }), []);
});
