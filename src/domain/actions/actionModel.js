import { isBrazilStateCode } from "../locations/brazilStates";
import { normalizeSearchText } from '../../../functions/contactFields.js';

export const ACTION_PHASES = Object.freeze({ before: "Antes", during: "Durante", after: "Depois" });

export function createAction(input) {
  const address = input.address ?? {};
  const data = {
    name: String(input.name ?? "").trim(),
    nameSearch: normalizeSearchText(input.name),
    branchId: String(input.branchId ?? "").trim(),
    status: input.status ?? "planning",
    address: {
      cep: String(address.cep ?? "").replace(/\D/g, ""),
      street: String(address.street ?? "").trim(),
      number: String(address.number ?? "").trim(),
      complement: String(address.complement ?? "").trim(),
      neighborhood: String(address.neighborhood ?? "").trim(),
      city: String(address.city ?? "").trim(),
      state: String(address.state ?? "").trim().toUpperCase(),
      source: address.source === "cep" ? "cep" : "manual",
    },
    whatToBring: String(input.whatToBring ?? "").trim(),
    tips: String(input.tips ?? "").trim(),
    photosBefore: [],
    photosDuring: [],
    photosAfter: [],
    createdAt: null,
    updatedAt: null,
  };
  if (data.name.length < 3 || data.name.length > 160) throw new Error("Informe o nome da ação.");
  if (!data.branchId) throw new Error("Selecione uma regional.");
  if (!data.address.street || !data.address.number || !data.address.city || !isBrazilStateCode(data.address.state)) {
    throw new Error("Preencha logradouro, número, cidade e estado.");
  }
  return data;
}
