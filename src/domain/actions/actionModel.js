import { isBrazilStateCode } from "../locations/brazilStates";
import { normalizeSearchText } from '../../../functions/contactFields.js';

export const ACTION_PHASES = Object.freeze({ before: "Antes", during: "Durante", after: "Depois" });

export function createAction(input) {
  const address = input.address ?? {};
  const startDate = String(input.startDate ?? input.date ?? '').trim();
  const endDate = String(input.endDate ?? startDate).trim();
  const startTime = String(input.startTime ?? '').trim();
  const endTime = String(input.endTime ?? '').trim();
  const dateStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? new Date(`${startDate}T00:00:00-03:00`) : null;
  const endDateValue = /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? new Date(`${endDate}T00:00:00-03:00`) : null;
  const dateEnd = endDateValue ? new Date(endDateValue.getTime() + 24 * 60 * 60 * 1000) : null;
  const data = {
    name: String(input.name ?? "").trim(),
    nameSearch: normalizeSearchText(input.name),
    branchId: String(input.branchId ?? "").trim(),
    // A publicação no mapa é vinculada à coordenação responsável, e não ao
    // estado do endereço onde a atividade acontece.
    coordinationState: String(input.coordinationState ?? "").trim().toUpperCase(),
    publicVisible: input.publicVisible !== false,
    // `date` permanece como início para regras existentes de inscrição e presença.
    date: startDate,
    startDate,
    endDate,
    startTime,
    endTime,
    scheduleText: String(input.scheduleText ?? '').trim(),
    dateStart,
    dateEnd,
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
    description: String(input.description ?? "").trim(),
    whatToBring: String(input.whatToBring ?? "").trim(),
    tips: String(input.tips ?? "").trim(),
    photosBefore: [],
    photosDuring: [],
    photosAfter: [],
    createdAt: null,
    updatedAt: null,
  };
  if (data.name.length < 3 || data.name.length > 160) throw new Error("Informe o nome da ação.");
  if (!data.branchId) throw new Error("Selecione uma coordenação estadual.");
  if (!isBrazilStateCode(data.coordinationState)) throw new Error("Selecione uma coordenação estadual válida.");
  if (!dateStart || !endDateValue || Number.isNaN(dateStart.getTime()) || Number.isNaN(endDateValue.getTime())) throw new Error('Informe as datas de início e fim da ação.');
  if (endDateValue < dateStart) throw new Error('A data de fim não pode ser anterior à data de início.');
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) throw new Error('Informe os horários de início e fim da ação.');
  if (startDate === endDate && endTime <= startTime) throw new Error('Em uma ação no mesmo dia, o horário de fim deve ser posterior ao início.');
  if (!data.address.street || !data.address.number || !data.address.city || !isBrazilStateCode(data.address.state)) {
    throw new Error("Preencha logradouro, número, cidade e estado.");
  }
  return data;
}
