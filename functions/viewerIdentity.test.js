import test from "node:test";
import assert from "node:assert/strict";
import { nextBranchViewerUsername } from "./viewerIdentity.js";

test("gera identificador por código e UF sem reutilizar identificadores já existentes", () => {
  assert.equal(nextBranchViewerUsername("TESTE", "SP"), "USUARIO_TESTE_SP");
  assert.equal(nextBranchViewerUsername("TESTE", "SP", ["USUARIO_TESTE_SP"]), "USUARIO_TESTE_SP_02");
  assert.equal(nextBranchViewerUsername("TESTE", "SP", ["USUARIO_TESTE_SP", "USUARIO_TESTE_SP_02"]), "USUARIO_TESTE_SP_03");
});

test("conflito temporário de e-mail reserva o próximo sufixo", () => {
  assert.equal(nextBranchViewerUsername("MOB 2026", "RJ", ["USUARIO_MOB_2026_RJ"], ["USUARIO_MOB_2026_RJ_02"]), "USUARIO_MOB_2026_RJ_03");
});
