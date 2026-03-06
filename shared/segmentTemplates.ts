// ─── SEGMENT TEMPLATES ────────────────────────────────────────────────────────
// Each template defines the default KPIs, funnel stages, activities, labels
// and vocabulary for a specific business segment.
// Adding a new segment = add a new entry here. Zero code changes elsewhere.

export type FunnelStageKey = "prospecting" | "qualification" | "presentation" | "negotiation" | "closing";
export type ActivityTypeKey = "calls" | "emails" | "whatsapp" | "in_person_visits" | "meetings_scheduled";

export interface SegmentKPI {
  metricName: string;
  defaultTarget: number;
  unit: "number" | "currency" | "percentage";
  description: string;
}

export interface SegmentActivity {
  activityType: ActivityTypeKey;
  label: string;
  defaultTarget: number;
}

export interface SegmentFunnelStage {
  stage: FunnelStageKey;
  label: string;
  description: string;
}

export interface SegmentLabel {
  key: string;
  value: string;
  category: string;
  description: string;
}

export interface SegmentProduct {
  name: string;
  description: string;
}

export interface SegmentRegion {
  name: string;
  code: string;
}

export interface SegmentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  kpis: SegmentKPI[];
  activities: SegmentActivity[];
  funnelStages: SegmentFunnelStage[];
  labels: SegmentLabel[];
  defaultProducts: SegmentProduct[];
  defaultRegions: SegmentRegion[];
}

// ─── CLÍNICA DE ESTÉTICA ──────────────────────────────────────────────────────
const aestheticsClinic: SegmentTemplate = {
  id: "aesthetics_clinic",
  name: "Clínica de Estética",
  description: "Gestão de vendas para clínicas de estética, beleza e bem-estar",
  icon: "✨",
  color: "#C084FC",
  kpis: [
    { metricName: "Atendimentos Realizados", defaultTarget: 40, unit: "number", description: "Total de atendimentos na semana" },
    { metricName: "Avaliações Agendadas", defaultTarget: 20, unit: "number", description: "Consultas de avaliação marcadas" },
    { metricName: "Procedimentos Fechados", defaultTarget: 15, unit: "number", description: "Procedimentos confirmados e pagos" },
    { metricName: "Faturamento Semanal", defaultTarget: 25000, unit: "currency", description: "Receita total da semana" },
    { metricName: "Taxa de Retorno (%)", defaultTarget: 60, unit: "percentage", description: "Clientes que retornaram para novo procedimento" },
    { metricName: "Ticket Médio", defaultTarget: 1500, unit: "currency", description: "Valor médio por procedimento" },
  ],
  activities: [
    { activityType: "calls", label: "Ligações para Clientes", defaultTarget: 30 },
    { activityType: "whatsapp", label: "WhatsApp / Mensagens", defaultTarget: 80 },
    { activityType: "meetings_scheduled", label: "Avaliações Agendadas", defaultTarget: 20 },
    { activityType: "in_person_visits", label: "Atendimentos Presenciais", defaultTarget: 40 },
    { activityType: "emails", label: "E-mails / Campanhas", defaultTarget: 10 },
  ],
  funnelStages: [
    { stage: "prospecting", label: "Interesse", description: "Lead demonstrou interesse no procedimento" },
    { stage: "qualification", label: "Avaliação", description: "Consulta de avaliação agendada ou realizada" },
    { stage: "presentation", label: "Orçamento", description: "Orçamento apresentado ao cliente" },
    { stage: "negotiation", label: "Negociação", description: "Cliente em processo de decisão" },
    { stage: "closing", label: "Agendamento", description: "Procedimento agendado e confirmado" },
  ],
  labels: [
    { key: "deal_client_label", value: "Paciente / Cliente", category: "deals", description: "Label para campo de cliente no negócio" },
    { key: "deal_product_label", value: "Procedimento", category: "deals", description: "Label para produto/serviço" },
    { key: "deal_value_label", value: "Valor do Procedimento", category: "deals", description: "Label para valor esperado" },
    { key: "opportunity_client_label", value: "Nome do Paciente", category: "opportunities", description: "Label para cliente na oportunidade" },
    { key: "kpi_contacts_label", value: "Atendimentos", category: "kpis", description: "Label para contatos realizados" },
    { key: "kpi_meetings_label", value: "Avaliações", category: "kpis", description: "Label para consultas agendadas" },
    { key: "kpi_closed_label", value: "Procedimentos Fechados", category: "kpis", description: "Label para negociações fechadas" },
  ],
  defaultProducts: [
    { name: "Botox / Toxina Botulínica", description: "Aplicação de toxina botulínica" },
    { name: "Preenchimento Facial", description: "Preenchimento com ácido hialurônico" },
    { name: "Limpeza de Pele Profunda", description: "Limpeza de pele com extração" },
    { name: "Peeling Químico", description: "Renovação celular com ácidos" },
    { name: "Laser / Fotorejuvenescimento", description: "Tratamento a laser" },
    { name: "Drenagem Linfática", description: "Massagem de drenagem" },
    { name: "Pacote Corporal", description: "Tratamentos corporais combinados" },
  ],
  defaultRegions: [
    { name: "Zona Norte", code: "ZN" },
    { name: "Zona Sul", code: "ZS" },
    { name: "Zona Leste", code: "ZL" },
    { name: "Zona Oeste", code: "ZO" },
    { name: "Centro", code: "CTR" },
    { name: "Online / Remoto", code: "ONL" },
  ],
};

// ─── AGRONEGÓCIO ──────────────────────────────────────────────────────────────
const agribusiness: SegmentTemplate = {
  id: "agribusiness",
  name: "Agronegócio",
  description: "Gestão de vendas para distribuidoras, revendas e multinacionais do agro",
  icon: "🌾",
  color: "#4ADE80",
  kpis: [
    { metricName: "Visitas a Produtores", defaultTarget: 25, unit: "number", description: "Visitas técnicas realizadas na semana" },
    { metricName: "Demonstrações Técnicas", defaultTarget: 10, unit: "number", description: "Demos de produto realizadas" },
    { metricName: "Pedidos Fechados", defaultTarget: 8, unit: "number", description: "Pedidos confirmados na semana" },
    { metricName: "Volume de Vendas (R$)", defaultTarget: 150000, unit: "currency", description: "Faturamento total da semana" },
    { metricName: "Cobertura de Área (ha)", defaultTarget: 5000, unit: "number", description: "Hectares cobertos com produto" },
    { metricName: "Novos Produtores", defaultTarget: 5, unit: "number", description: "Novos clientes prospectados" },
  ],
  activities: [
    { activityType: "in_person_visits", label: "Visitas a Campo", defaultTarget: 25 },
    { activityType: "whatsapp", label: "WhatsApp / Grupos", defaultTarget: 60 },
    { activityType: "meetings_scheduled", label: "Reuniões Técnicas", defaultTarget: 10 },
    { activityType: "calls", label: "Ligações / Follow-up", defaultTarget: 40 },
    { activityType: "emails", label: "E-mails / Propostas", defaultTarget: 15 },
  ],
  funnelStages: [
    { stage: "prospecting", label: "Prospecção", description: "Produtor identificado e mapeado" },
    { stage: "qualification", label: "Visita Técnica", description: "Visita realizada, necessidade identificada" },
    { stage: "presentation", label: "Proposta Técnica", description: "Proposta e recomendação técnica apresentada" },
    { stage: "negotiation", label: "Negociação", description: "Em negociação de preço, prazo e condições" },
    { stage: "closing", label: "Pedido", description: "Pedido emitido e confirmado" },
  ],
  labels: [
    { key: "deal_client_label", value: "Produtor / Cliente", category: "deals", description: "Label para campo de cliente no negócio" },
    { key: "deal_product_label", value: "Produto / Insumo", category: "deals", description: "Label para produto/serviço" },
    { key: "deal_value_label", value: "Volume do Pedido (R$)", category: "deals", description: "Label para valor esperado" },
    { key: "opportunity_client_label", value: "Nome do Produtor", category: "opportunities", description: "Label para cliente na oportunidade" },
    { key: "kpi_contacts_label", value: "Visitas a Campo", category: "kpis", description: "Label para contatos realizados" },
    { key: "kpi_meetings_label", value: "Demonstrações Técnicas", category: "kpis", description: "Label para consultas agendadas" },
    { key: "kpi_closed_label", value: "Pedidos Fechados", category: "kpis", description: "Label para negociações fechadas" },
  ],
  defaultProducts: [
    { name: "Herbicida Seletivo", description: "Controle de plantas daninhas" },
    { name: "Fungicida Sistêmico", description: "Controle de doenças fúngicas" },
    { name: "Inseticida / Acaricida", description: "Controle de pragas" },
    { name: "Fertilizante Foliar", description: "Nutrição foliar de alta eficiência" },
    { name: "Semente Certificada", description: "Sementes de alto desempenho" },
    { name: "Inoculante Biológico", description: "Fixação biológica de nitrogênio" },
    { name: "Defensivo Biológico", description: "Controle biológico de pragas e doenças" },
  ],
  defaultRegions: [
    { name: "Cerrado", code: "CER" },
    { name: "Sul do País", code: "SUL" },
    { name: "Nordeste", code: "NE" },
    { name: "Norte / Amazônia", code: "NOR" },
    { name: "Triângulo Mineiro", code: "TRI" },
    { name: "Mato Grosso", code: "MT" },
    { name: "Mato Grosso do Sul", code: "MS" },
    { name: "Goiás / DF", code: "GO" },
    { name: "Bahia / Piauí (MATOPIBA)", code: "MAP" },
  ],
};

// ─── GENÉRICO (fallback para qualquer segmento) ───────────────────────────────
const generic: SegmentTemplate = {
  id: "generic",
  name: "Genérico / Outros",
  description: "Template padrão adaptável a qualquer segmento de negócio",
  icon: "📊",
  color: "#60A5FA",
  kpis: [
    { metricName: "Contatos Realizados", defaultTarget: 50, unit: "number", description: "Total de contatos na semana" },
    { metricName: "Consultas Agendadas", defaultTarget: 18, unit: "number", description: "Reuniões e consultas marcadas" },
    { metricName: "Negociações Fechadas", defaultTarget: 3, unit: "number", description: "Negócios fechados na semana" },
    { metricName: "Faturamento (R$)", defaultTarget: 120000, unit: "currency", description: "Receita total da semana" },
  ],
  activities: [
    { activityType: "calls", label: "Ligações", defaultTarget: 40 },
    { activityType: "emails", label: "E-mails", defaultTarget: 30 },
    { activityType: "whatsapp", label: "WhatsApp", defaultTarget: 60 },
    { activityType: "in_person_visits", label: "Visitas Presenciais", defaultTarget: 10 },
    { activityType: "meetings_scheduled", label: "Reuniões Agendadas", defaultTarget: 15 },
  ],
  funnelStages: [
    { stage: "prospecting", label: "Prospecção", description: "Lead identificado e primeiro contato" },
    { stage: "qualification", label: "Qualificação", description: "Necessidade identificada e lead qualificado" },
    { stage: "presentation", label: "Apresentação", description: "Proposta ou apresentação realizada" },
    { stage: "negotiation", label: "Negociação", description: "Em processo de negociação" },
    { stage: "closing", label: "Fechamento", description: "Negócio fechado ou prestes a fechar" },
  ],
  labels: [
    { key: "deal_client_label", value: "Cliente", category: "deals", description: "Label para campo de cliente" },
    { key: "deal_product_label", value: "Produto / Serviço", category: "deals", description: "Label para produto/serviço" },
    { key: "deal_value_label", value: "Valor Esperado", category: "deals", description: "Label para valor esperado" },
    { key: "opportunity_client_label", value: "Nome do Cliente", category: "opportunities", description: "Label para cliente" },
    { key: "kpi_contacts_label", value: "Contatos", category: "kpis", description: "Label para contatos realizados" },
    { key: "kpi_meetings_label", value: "Consultas", category: "kpis", description: "Label para consultas agendadas" },
    { key: "kpi_closed_label", value: "Fechamentos", category: "kpis", description: "Label para negociações fechadas" },
  ],
  defaultProducts: [
    { name: "Produto / Serviço Principal", description: "Oferta principal da empresa" },
    { name: "Produto / Serviço Secundário", description: "Oferta complementar" },
  ],
  defaultRegions: [
    { name: "Região Norte", code: "N" },
    { name: "Região Sul", code: "S" },
    { name: "Região Leste", code: "L" },
    { name: "Região Oeste", code: "O" },
    { name: "Nacional", code: "NAC" },
  ],
};

// ─── REGISTRY ─────────────────────────────────────────────────────────────────
export const SEGMENT_TEMPLATES: Record<string, SegmentTemplate> = {
  aesthetics_clinic: aestheticsClinic,
  agribusiness: agribusiness,
  generic,
  // Add new segments here — no other code changes needed
};

export function getTemplate(segment: string): SegmentTemplate {
  return SEGMENT_TEMPLATES[segment] ?? SEGMENT_TEMPLATES.generic;
}

export const SEGMENT_OPTIONS = Object.values(SEGMENT_TEMPLATES).map(t => ({
  id: t.id,
  name: t.name,
  description: t.description,
  icon: t.icon,
  color: t.color,
}));
