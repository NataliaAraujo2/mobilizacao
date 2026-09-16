import test from "node:test";
import assert from "node:assert/strict";
import { nextBranchViewerUsername } from "./viewerIdentity.js";

test("gera identificador sequencial por UF", () => {
  assert.deepEqual(nextBranchViewerUsername("TO", "TO"), { username: "USUARIO-TO-01-01", coordinationNumber: 1, userNumber: 1 });
  assert.deepEqual(nextBranchViewerUsername("TO", "TO", ["USUARIO-TO-01-01"]), { username: "USUARIO-TO-01-02", coordinationNumber: 1, userNumber: 2 });
  assert.deepEqual(nextBranchViewerUsername("TO_02", "TO"), { username: "USUARIO-TO-02-01", coordinationNumber: 2, userNumber: 1 });
});

test("conflito temporário de e-mail reserva o próximo número", () => {
  assert.deepEqual(nextBranchViewerUsername("RJ", "RJ", ["USUARIO-RJ-01-01"], ["USUARIO-RJ-01-02"]), { username: "USUARIO-RJ-01-03", coordinationNumber: 1, userNumber: 3 });
});
