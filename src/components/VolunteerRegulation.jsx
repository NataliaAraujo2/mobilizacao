import styles from "./VolunteerRegulation.module.css";

export default function VolunteerRegulation({ open, onClose }) {
  if (!open) return null;
  return <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="volunteer-regulation-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p>ONG Moradia e Cidadania</p><h2 id="volunteer-regulation-title">REGULAMENTO DO VOLUNTÁRIO</h2></div><button type="button" onClick={onClose} aria-label="Fechar regulamento">Fechar</button></header>
      <div className={styles.content}>
        <h3>1. Finalidade</h3><p>O presente regulamento tem como objetivo estabelecer as condições de participação de voluntários nas ações promovidas pela ONG Moradia e Cidadania, garantindo transparência, segurança e respeito mútuo entre a instituição e os participantes.</p>
        <h3>2. Conceito de Trabalho Voluntário</h3><p>Nos termos da Lei nº 9.608/1998, considera-se trabalho voluntário a atividade não remunerada, prestada por pessoa física, com fins cívicos, educacionais, científicos, culturais, humanitários ou de assistência social, sem vínculo empregatício, funcional ou qualquer obrigação de natureza trabalhista, previdenciária ou afim.</p><p>O voluntário atua de forma espontânea e solidária, sem expectativa de contraprestação financeira ou benefícios de qualquer espécie.</p>
        <h3>3. Direitos e Deveres do Voluntário</h3><p>O voluntário tem direito a:</p><ul><li>Ser tratado com respeito, dignidade e igualdade;</li><li>Receber informações claras sobre a ação, sua função e o público atendido;</li><li>Solicitar, a qualquer momento, o encerramento de sua participação;</li><li>Receber orientação e formação inicial para a atividade quando necessário;</li></ul><p>O voluntário compromete-se a:</p><ul><li>Cumprir horários, prazos e atividades acordados com a coordenação do projeto;</li><li>Zelar pela boa imagem da ONG e pelo respeito às comunidades e às pessoas beneficiadas;</li><li>Manter sigilo sobre informações pessoais, estratégicas e institucionais a que tiver acesso;</li><li>Utilizar equipamentos e materiais apenas para fins das ações voluntárias;</li><li>Seguir as normas de segurança e conduta estabelecidas pela ONG.</li></ul>
        <h3>4. Inexistência de Vínculo Trabalhista</h3><p>A atuação voluntária não gera qualquer tipo de vínculo empregatício, trabalhista, previdenciário ou de natureza salarial com a ONG Moradia e Cidadania. O voluntário não receberá remuneração por suas atividades.</p>
        <h3>5. Seleção e Capacitação</h3><p>A ONG poderá realizar processo seletivo quando necessário, com entrevistas e verificação de disponibilidade. A formação e capacitação serão oferecidas conforme a natureza da ação.</p>
        <h3>6. Segurança e Saúde</h3><p>A segurança dos voluntários é prioridade. A ONG compromete-se a fornecer orientações de segurança, equipamentos de proteção quando aplicáveis, e a informar riscos previsíveis. Voluntários com restrições de saúde devem comunicar previamente à coordenação.</p>
        <h3>7. Conduta e Suspensão</h3><p>Condutas inadequadas, assédio, discriminação, violência ou descumprimento de normas podem resultar em advertência, suspensão temporária ou desligamento imediato do voluntário.</p>
        <h3>8. Proteção de Dados e Imagem</h3><p>Ao participar das ações, o voluntário autoriza o uso de sua imagem e depoimentos pela ONG para fins institucionais, salvo manifestação em contrário por escrito.</p>
        <h3>9. Avaliação e Acompanhamento</h3><p>A ONG realizará avaliações periódicas das ações e poderá solicitar feedback dos voluntários para melhoria contínua dos projetos.</p>
        <h3>10. Declaração de Ciência e Aceite</h3><p>Ao enviar sua inscrição, o voluntário declara que leu, compreendeu e concorda integralmente com os termos deste Regulamento, ciente de que sua atuação será de caráter voluntário, gratuito e solidário, conforme previsto na legislação vigente.</p>
        <h3>11. Disposições Finais</h3><p>Este regulamento entra em vigor na data de sua publicação. Casos omissos serão avaliados pela direção e coordenação da ONG.</p>
        <p><strong>ONG Moradia e Cidadania</strong></p><p><em>Promovendo solidariedade e cidadania por todo o Brasil.</em></p><p>Para mais informações, entre em contato: <strong>contato@moradiaecidadania.org.br</strong></p>
      </div>
    </section>
  </div>;
}
