// ProjectsPage.jsx
import { useState, useEffect } from "react";
import { useProjects } from "../../../hooks/useProjects";
import { ProjectForm } from "../../../components/ProjectForm";
import FilterBar from "../../../components/ui/FilterBar";
import brazilStates from "../../../utils/brazilStates";
import styles from "../../../styles/ProjectsPage.module.css"; // CSS Modules
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import Button from "../../../components/ui/Button";

export function ProjectsPage() {
  const { projects, loading } = useProjects();
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // Inicializa lista filtrada
  useEffect(() => {
    setFilteredProjects(projects);
  }, [projects]);

  const handleCreate = () => {
    setSelectedProjectId(null);
    setShowForm(true);
  };

  const handleEdit = (id) => {
    setSelectedProjectId(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedProjectId(null);
  };

  // Configuração dos filtros para o FilterBar
  const filters = [
    {
      key: "state",
      label: "Estado",
      options: brazilStates.map((s) => ({ label: s.name, value: s.name })),
    },
    {
      key: "projectPresence",
      label: "Projetos",
      options: [
        { label: "Com projeto", value: "yes" },
        { label: "Sem projeto", value: "no" },
      ],
    },
  ];

  // Prepara os dados para o FilterBar (projectPresence)
  const filterData = projects.map((c) => ({
    ...c,
    projectPresence: c.projetos?.length > 0 ? "yes" : "no",
  }));

  return (
    <div className={styles.container}>
      <Header />

      <div className={styles.header}>
        <h1 className={styles.title}>Projetos</h1>
        <Button onClick={() => navigate("/dashboard")}>Ir para Dashboard</Button>
      </div>

      <button className={styles.createButton} onClick={handleCreate}>
        Novo Projeto
      </button>

      {showForm && (
        <div className={styles.formContainer}>
          <ProjectForm
            project={projects.find((p) => p.id === selectedProjectId) || null}
            onClose={handleCloseForm}
          />
        </div>
      )}

      <FilterBar
        data={filterData}
        filters={filters}
        onFilter={(filtered) => setFilteredProjects(filtered)}
      />

      {loading ? (
        <p>Carregando...</p>
      ) : filteredProjects.length === 0 ? (
        <p>Nenhum projeto encontrado.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Endereço</th>
              <th>Equipe</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((project) => (
              <tr key={project.id}>
                <td data-label="Estado">{project.state}</td>
                <td data-label="Endereço">{project.endereco}</td>
                <td data-label="Equipe">
                  {project.team?.map((member, i) => (
                    <div key={i}>
                      {member.nome} ({member.cargo})
                    </div>
                  ))}
                </td>
                <td data-label="Ações">
                  <button
                    className={styles.editButton}
                    onClick={() => handleEdit(project.id)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
