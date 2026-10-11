import CampaignGateway from "./CampaignGateway";
import Campaign2026Page from "./Campaign2026Page";
import Agenda2030Page from "./Agenda2030Page";
import Campaign2025Page from "./Campaign2025Page";

export default function HomePage() {
  return (
    <main>
      <section id="inicio" aria-label="Início"><CampaignGateway embedded /></section>
      <section id="acoes-2026" aria-label="Ações 2026"><Campaign2026Page embedded /></section>
      <section id="agenda-2030" aria-label="Agenda 2030"><Agenda2030Page embedded /></section>
      <section id="edicao-2025" aria-label="Edição 2025"><Campaign2025Page embedded /></section>
    </main>
  );
}
