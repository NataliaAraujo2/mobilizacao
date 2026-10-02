export function formatCep(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
  return digits.length === 8 ? digits.replace(/(\d{5})(\d{3})/, "$1-$2") : digits;
}

export function formatFullAddress(address = {}) {
  const streetLine = [address.street, address.number].map(value => String(value ?? "").trim()).filter(Boolean).join(", ");
  const cityState = [address.city, address.state].map(value => String(value ?? "").trim()).filter(Boolean).join(" - ");
  const cep = formatCep(address.cep);

  return [streetLine, address.complement, address.neighborhood, cityState, cep && `CEP ${cep}`]
    .map(value => String(value ?? "").trim())
    .filter(Boolean)
    .join(" · ");
}

export default function FullAddress({ address, fallback = "Endereço não informado" }) {
  return formatFullAddress(address) || fallback;
}
