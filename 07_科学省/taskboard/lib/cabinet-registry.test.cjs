const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { MEMBERS, listMembers, getMember, contextModeFor, DEFAULT_CONTEXT_MODE } = require("./cabinet-registry.cjs");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

test("cabinet registry has exactly 13 members with unique ids", () => {
  assert.equal(MEMBERS.length, 13);
  const ids = MEMBERS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every member's persona and skill files exist in the repo", () => {
  MEMBERS.forEach((m) => {
    const personaPath = path.join(REPO_ROOT, m.personaFile);
    const skillPath = path.join(REPO_ROOT, m.skillFile);
    assert.ok(fs.existsSync(personaPath), `missing persona file for ${m.id}: ${m.personaFile}`);
    assert.ok(fs.existsSync(skillPath), `missing skill file for ${m.id}: ${m.skillFile}`);
  });
});

test("listMembers exposes only safe display fields", () => {
  const members = listMembers();
  assert.equal(members.length, 13);
  members.forEach((m) => {
    assert.equal(Object.keys(m).sort().join(","), "avatar,id,ministry,name,title");
  });
});

test("getMember resolves known ids and returns null for unknown ids", () => {
  const eiichi = getMember("eiichi");
  assert.equal(eiichi.name, "栄一");
  assert.equal(getMember("not_a_real_member"), null);
  assert.equal(getMember(""), null);
  assert.equal(getMember(undefined), null);
});

test("contextModeFor maps members to a valid business-context mode, defaulting for unknown ids", () => {
  assert.equal(contextModeFor("luca"), "finance");
  assert.equal(contextModeFor("sontoku"), "today");
  assert.equal(contextModeFor("not_a_real_member"), DEFAULT_CONTEXT_MODE);
});
