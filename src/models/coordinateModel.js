export const coordinateModel = {
  state: "", // código ou nome do estado (usar o brazilStates)
  endereco: "",
  projetos: [], // lista de projetos, pode ser string[] (IDs) ou array de objetos
  contatos: {
    email: "",
    telefone: "",
    whatsapp: "",
  },
  qrcodePix: {
    codigo: "",
    imagem: "",
  },
  team: [
    // cada item representa um membro da equipe
    {
      nome: "",
      cargo: "",
      foto: "", // URL ou path da foto do membro
    },
  ],
};
