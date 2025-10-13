import { useState, useEffect } from "react";
import { useCoordination } from "../../../hooks/useCoordination";
import { CoordinationForm } from "../../../components/CoordinationForm";
import FilterBar from "../../../components/ui/FilterBar";
import brazilStates from "../../../utils/brazilStates";
import styles from "../../../styles/CoordinationsPage.module.css"; // CSS Modules
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import Button from "../../../components/ui/Button";

export function CoordinationsPage() {
  const { coordinations, loading } = useCoordination();
  const [filteredCoordinations, setFilteredCoordinations] = useState([]);
  const [selectedCoordId, setSelectedCoordId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // Inicializa lista filtrada
  useEffect(() => {
    setFilteredCoordinations(coordinations);
  }, [coordinations]);

  const handleCreate = () => {
    setSelectedCoordId(null);
    setShowForm(true);
  };

  const handleEdit = (id) => {
    setSelectedCoordId(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedCoordId(null);
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

  // Prepara os dados para o FilterBar (teamPresence)
  const filterData = coordinations.map((c) => ({
    ...c,
    projectPresence: c.projeto?.length > 0 ? "yes" : "no",
  }));

  return (
    <div className={styles.container}>
      <Header />
      
      <div className={styles.header}>
        <h1 className={styles.title}>Coordenações</h1>
      <Button onClick={() => navigate("/dashboard")}>Ir para Dashboard</Button>
      </div>

      <button className={styles.createButton} onClick={handleCreate}>
        Nova Coordenação
      </button>
      {showForm && (
        <div className={styles.formContainer}>
          <CoordinationForm
            coordinationId={selectedCoordId}
            onClose={handleCloseForm}
          />
        </div>
      )}
      <FilterBar
        data={filterData}
        filters={filters}
        onFilter={(filtered) => setFilteredCoordinations(filtered)}
      />

      {loading ? (
        <p>Carregando...</p>
      ) : filteredCoordinations.length === 0 ? (
        <p>Nenhuma coordenação encontrada.</p>
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
            {filteredCoordinations.map((coord) => (
              <tr key={coord.id}>
                <td>{coord.state}</td>
                <td>{coord.endereco}</td>
                <td>
                  {coord.team?.map((member, i) => (
                    <div key={i}>
                      {member.nome} ({member.cargo})
                    </div>
                  ))}
                </td>
                <td>
                  <button
                    className={styles.editButton}
                    onClick={() => handleEdit(coord.id)}
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
