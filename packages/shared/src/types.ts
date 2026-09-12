// Tipos que espelham supabase/migrations/0001_init.sql — mantenha os dois em sincronia.

export type UserRole = "responsavel_tecnico" | "assistente" | "sindico";

export type Severity = "baixa" | "media" | "alta" | "critica";

export type InspectionStatus = "rascunho" | "em_vistoria" | "concluida";

export type ReportStatus = "rascunho" | "gerado" | "entregue";

export interface Profile {
  id: string;
  role: UserRole;
  fullName: string;
  crea: string | null;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Building {
  id: string;
  clientId: string;
  name: string;
  address: string;
  floors: number | null;
  createdAt: string;
}

export interface Inspection {
  id: string;
  buildingId: string;
  responsibleId: string;
  inspectionType: string;
  status: InspectionStatus;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface AnomalyCatalogEntry {
  id: string;
  category: string;
  description: string;
  systemType: string;
  defaultSeverity: Severity;
  treatmentRecommendation: string;
}

export interface CatalogProduct {
  id: string;
  anomalyCatalogId: string;
  manufacturer: string;
  productName: string;
  datasheetUrl: string | null;
  videoUrl: string | null;
}

export interface Anomaly {
  id: string;
  inspectionId: string;
  catalogId: string | null;
  environment: string;
  systemType: string;
  description: string;
  treatmentRecommendation: string;
  severity: Severity;
  code: string | null;
  createdBy: string;
  createdAt: string;
}

export interface AnomalyPhoto {
  id: string;
  anomalyId: string;
  storagePath: string;
  caption: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  inspectionId: string;
  version: number;
  reportNumber: string;
  artNumber: string | null;
  status: ReportStatus;
  pdfUrl: string | null;
  excelUrl: string | null;
  generatedAt: string | null;
  createdBy: string;
  createdAt: string;
}

/** Rótulos em pt-BR para exibir na UI — mantém o texto fora dos componentes. */
export const SEVERITY_LABELS: Record<Severity, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  rascunho: "Rascunho",
  em_vistoria: "Em vistoria",
  concluida: "Concluído",
};
