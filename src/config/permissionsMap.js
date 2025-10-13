// ==========================
// 📌 Base de permissões por ESCOPO
// ==========================
const permissionsBase = {
  nacional: {
    geral: [
      "dashboard_nacional",
      "users_approve",
      "partners_view_nacional",
      "partners_approve_nacional",
      "volunteers_view_nacional",
      "volunteers_approve_nacional",
      "coordenacoes_view_nacional",
      "coordenacoes_approve_nacional",
    ],
    financeiro: ["dashboard_nacional", "financeiro_nacional"],
    projetos: ["dashboard_nacional", "projetos_nacionais"],
    comunicacao: ["dashboard_nacional", "comunicacao_nacional"],
  },

  estadual: {
    geral: [
      "dashboard_estadual",
      "users_approve",
      "partners_view_estadual",
      "partners_approve_estadual",
      "volunteers_view_estadual",
      "volunteers_approve_estadual",
      "coordenacoes_view_estadual",
      "coordenacoes_approve_estadual",
    ],
    financeiro: ["dashboard_estadual", "financeiro_estadual"],
    projetos: ["dashboard_estadual", "projetos_estaduais"],
    comunicacao: ["dashboard_estadual", "comunicacao_estadual"],
  },

  municipal: {
    geral: [
      "dashboard_municipal",
      "users_approve",
      "partners_view_municipal",
      "volunteers_view_municipal",
      "coordenacoes_view_municipal",
    ],
    financeiro: ["dashboard_municipal", "financeiro_municipal"],
    projetos: ["dashboard_municipal", "projetos_municipais"],
    comunicacao: ["dashboard_municipal", "comunicacao_municipal"],
  },

  voluntario: {
    geral: ["consultas_basicas"],
  },

  parceiro: {
    geral: ["consultas_basicas", "dashboard_parceiro"],
  },
};

// ==========================
// 📌 Helpers para composição
// ==========================
function flattenScope(scope) {
  return Object.values(scope || {}).flat();
}

function flattenAll(base) {
  return Object.values(base)
    .flatMap((nivel) => flattenScope(nivel))
    .flat();
}

// ==========================
// 📌 Perfis compostos (herdam da base)
// ==========================
const permissionsProfiles = {
  presidente: {
    // 🔹 todas as permissões do sistema
    allPermissions: flattenAll(permissionsBase),
  },

  coordenador_estadual: {
    // 🔹 tudo do escopo estadual
    allPermissions: flattenScope(permissionsBase.estadual),
  },

  financeiro_nacional: {
    // 🔹 tudo do financeiro (nacional + estadual + municipal)
    allPermissions: [
      ...permissionsBase.nacional.financeiro,
      ...permissionsBase.estadual.financeiro,
      ...permissionsBase.municipal.financeiro,
    ],
  },
};

// ==========================
// 📌 Export
// ==========================
export { permissionsBase, permissionsProfiles };
