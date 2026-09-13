import test from "node:test";
import assert from "node:assert/strict";
import { nextBranchViewerUsername } from "./viewerIdentity.js";

test("gera sufixo por UF sem reutilizar identificadores já existentes", () => {
  assert.equal(nextBranchViewerUsername("SP"), "USUARIO_SP");
  assert.equal(nextBranchViewerUsername("SP", ["USUARIO_SP"]), "USUARIO_SP_02");
  assert.equal(nextBranchViewerUsername("SP", ["USUARIO_SP", "USUARIO_SP_02"]), "USUARIO_SP_03");
});

test("conflito temporário de e-mail reserva o próximo sufixo", () => {
  assert.equal(nextBranchViewerUsername("RJ", ["USUARIO_RJ"], ["USUARIO_RJ_02"]), "USUARIO_RJ_03");
});
