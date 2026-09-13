import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone, normalizeSearchText } from '../../../functions/contactFields.js';
const CPF_LENGTH = 11;

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
  const branchId = String(input.branchId ?? "").trim();
  const cpf = digits(input.cpf);
  const rg = String(input.rg ?? "").trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  const birthDate = String(input.birthDate ?? "").trim();

  if (fullName.length < 2 || fullName.length > 120) throw new Error("Informe o nome completo.");
  if (!branchId) throw new Error("Selecione uma regional.");
  if (email && !isValidEmail(email)) throw new Error("Informe um e-mail válido.");
  if (phone && !isValidPhone(input.phone, 13)) throw new Error("Informe um telefone válido com DDD (até 13 dígitos).");
  if (!isValidCpf(cpf)) throw new Error("Informe um CPF válido.");
  if (rg.length < 3 || rg.length > 20) throw new Error("Informe um RG válido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(`${birthDate}T00:00:00`))) {
    throw new Error("Informe uma data de nascimento válida.");
  }
  if (new Date(`${birthDate}T00:00:00`) > new Date()) throw new Error("A data de nascimento não pode estar no futuro.");

  return {
    publicData: { fullName, fullNameSearch: normalizeSearchText(fullName), email, phone, branchId, status: input.status ?? "active", createdAt: null, updatedAt: null },
    privateData: { branchId, cpf, rg, birthDate, createdAt: null, updatedAt: null },
  };
}
