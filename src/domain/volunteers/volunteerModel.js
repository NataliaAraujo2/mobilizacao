import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone, normalizeSearchText } from '../../../functions/contactFields.js';
import { isBrazilStateCode } from '../locations/brazilStates.js';
const CPF_LENGTH = 11;
export const NGO_RELATIONSHIPS = Object.freeze(['Comunidade ou Projeto local', 'Empregado ou Aposentado da CAIXA', 'Indicação de amigos ou família']);
export const SHIRT_SIZES = Object.freeze(['PP', 'P', 'M', 'G', 'GG', 'XG']);

export function isMinorBirthDate(value, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return false;
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return false;
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (today < birthdayThisYear) age -= 1;
  return age < 18;
}

function digits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function isValidCpf(value) {
  const cpf = digits(value);
  if (cpf.length !== CPF_LENGTH || /^(\d)\1{10}$/.test(cpf)) return false;

  for (let size = 9; size <= 10; size += 1) {
    let sum = 0;
    for (let index = 0; index < size; index += 1) sum += Number(cpf[index]) * (size + 1 - index);
    const digit = (sum * 10) % 11 % 10;
    if (digit !== Number(cpf[size])) return false;
  }
  return true;
}

export function maskCpf(value) {
  const cpf = digits(value);
  return cpf.length === CPF_LENGTH ? `***.***.***-${cpf.slice(-2)}` : "CPF inválido";
}

export function createVolunteerRecords(input) {
  const fullName = String(input.fullName ?? "").trim();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const actionIds = [...new Set(Array.isArray(input.actionIds) ? input.actionIds.map(value => String(value).trim()).filter(Boolean) : [])];
  const regionalIds = [...new Set(Array.isArray(input.regionalIds) ? input.regionalIds.map(value => String(value).trim()).filter(Boolean) : [])];
  const participationDates = [...new Set(Array.isArray(input.participationDates) ? input.participationDates.map(value => String(value).trim()).filter(Boolean) : [])];
  const cpf = digits(input.cpf);
  const rg = String(input.rg ?? "").trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  const birthDate = String(input.birthDate ?? "").trim();
  const addressInput = input.address ?? {};
  const address = {
    cep: digits(addressInput.cep), street: String(addressInput.street ?? '').trim(), number: String(addressInput.number ?? '').trim(),
    complement: String(addressInput.complement ?? '').trim(), neighborhood: String(addressInput.neighborhood ?? '').trim(),
    city: String(addressInput.city ?? '').trim(), state: String(addressInput.state ?? '').trim().toUpperCase(),
  };
  const shirtSize = String(input.shirtSize ?? '').trim().toUpperCase();
  const ngoRelationship = String(input.ngoRelationship ?? '').trim();

  if (fullName.length < 2 || fullName.length > 120) throw new Error("Informe o nome completo.");
  if (actionIds.length < 1 || actionIds.length > 20) throw new Error("Selecione de 1 a 20 ações.");
  if (regionalIds.length < 1 || regionalIds.length > 20) throw new Error("Não foi possível identificar as coordenações estaduais das ações selecionadas.");
  if (participationDates.length !== actionIds.length || participationDates.some(value => !/^\d{4}-\d{2}-\d{2}$/.test(value))) throw new Error('Cada ação selecionada deve ocorrer em uma data diferente.');
  if (!isValidEmail(email)) throw new Error("Informe um e-mail válido.");
  if (!isValidPhone(input.phone, 13)) throw new Error("Informe um telefone válido com DDD (até 13 dígitos).");
  if (!isValidCpf(cpf)) throw new Error("Informe um CPF válido.");
  if (rg.length < 3 || rg.length > 20) throw new Error("Informe um RG válido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(`${birthDate}T00:00:00`))) {
    throw new Error("Informe uma data de nascimento válida.");
  }
  if (new Date(`${birthDate}T00:00:00`) > new Date()) throw new Error("A data de nascimento não pode estar no futuro.");
  if (!address.city || !isBrazilStateCode(address.state)) throw new Error('Informe cidade e estado do voluntário.');
  if (!SHIRT_SIZES.includes(shirtSize)) throw new Error('Selecione o tamanho da camiseta.');
  if (!NGO_RELATIONSHIPS.includes(ngoRelationship)) throw new Error('Selecione o vínculo com a ONG.');
  if (input.lgpdAccepted !== true || input.regulationAccepted !== true || input.imageUseAccepted !== true) throw new Error('É necessário aceitar a LGPD, o regulamento e a autorização de uso de imagem.');
  if (isMinorBirthDate(birthDate) && input.guardianAuthorizationAccepted !== true) throw new Error('Para menores de idade, é necessária a autorização do responsável.');

  return {
    publicData: { fullName, fullNameSearch: normalizeSearchText(fullName), email, phone, actionIds, regionalIds, participationDates, status: input.status ?? "active", accessStatus: input.accessStatus ?? "none", createdAt: null, updatedAt: null },
    privateData: { cpf, rg, birthDate, address, shirtSize, ngoRelationship, lgpdAccepted: true, regulationAccepted: true, imageUseAccepted: true, guardianAuthorizationAccepted: input.guardianAuthorizationAccepted === true, createdAt: null, updatedAt: null },
  };
}
