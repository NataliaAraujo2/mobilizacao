import test from "node:test";
import assert from "node:assert/strict";
import { nextBranchViewerUsername } from "./viewerIdentity.js";

test("gera identificador sequencial por UF", () => {
  assert.equal(nextBranchViewerUsername("TESTE", "SP"), "USUARIO_01_SP");
  assert.equal(nextBranchViewerUsername("TESTE", "SP", ["USUARIO_01_SP"]), "USUARIO_02_SP");
  assert.equal(nextBranchViewerUsername("TESTE", "SP", ["USUARIO_TESTE_SP", "USUARIO_TESTE_SP_02", "USUARIO_02_SP"]), "USUARIO_04_SP");
});

test("conflito temporário de e-mail reserva o próximo número", () => {
  assert.equal(nextBranchViewerUsername("MOB 2026", "RJ", ["USUARIO_01_RJ"], ["USUARIO_02_RJ"]), "USUARIO_03_RJ");
});
