export const BRAZIL_STATES = Object.freeze([
  { code: "AC", name: "Acre" }, { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" }, { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" }, { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" }, { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" }, { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" }, { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" }, { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" }, { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" }, { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" }, { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" }, { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" }, { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" }, { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
]);

export const BRAZIL_STATE_BY_CODE = Object.freeze(Object.fromEntries(BRAZIL_STATES.map((state) => [state.code, state])));
export const BRAZIL_STATE_BY_NAME = Object.freeze(Object.fromEntries(BRAZIL_STATES.map((state) => [state.name, state])));

export function normalizeBrazilStateName(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export const BRAZIL_STATE_BY_NORMALIZED_NAME = Object.freeze(
  Object.fromEntries(BRAZIL_STATES.map((state) => [normalizeBrazilStateName(state.name), state])),
);

export function isBrazilStateCode(value) {
  return typeof value === "string" && Boolean(BRAZIL_STATE_BY_CODE[value.toUpperCase()]);
}
