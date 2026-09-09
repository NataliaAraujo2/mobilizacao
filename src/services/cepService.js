export async function findAddressByCep(value) {
  const cep = String(value ?? "").replace(/\D/g, "");
  if (cep.length !== 8) throw new Error("Informe os 8 números do CEP.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
    if (!response.ok) throw new Error("Não foi possível consultar o CEP.");
    const data = await response.json();
    if (data.erro) throw new Error("CEP não encontrado. Preencha o endereço manualmente.");
    return { cep, street: data.logradouro ?? "", neighborhood: data.bairro ?? "", city: data.localidade ?? "", state: data.uf ?? "", complement: data.complemento ?? "", source: "cep" };
  } catch (error) {
    if (error.name === "AbortError") throw new Error("A consulta demorou demais. Preencha o endereço manualmente.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
