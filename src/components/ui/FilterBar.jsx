// components/ui/FilterBar.jsx
import { useState } from "react";
import styles from "../../styles/FilterBar.module.css";

export default function FilterBar({ data, filters, onFilter }) {
  const [activeFilters, setActiveFilters] = useState({});

  const handleFilterChange = (key, value) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);

    // aplica filtros na lista recebida
    let filtered = [...data];
    Object.keys(newFilters).forEach((f) => {
      if (newFilters[f] && newFilters[f] !== "all") {
        filtered = filtered.filter((item) => item[f] === newFilters[f]);
      }
    });

    onFilter(filtered);
  };

  return (
    <div className={styles.filterBar}>
      {filters.map((filter) => (
        <select
          key={filter.key}
          onChange={(e) => handleFilterChange(filter.key, e.target.value)}
        >
          <option value="all">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
