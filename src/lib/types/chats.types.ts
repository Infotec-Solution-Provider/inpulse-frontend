export type ChatUrgency = "NORMAL" | "ALTA" | "URGENTE";

export interface TemplateVariables {
	saudação_tempo: string;
	cliente_cnpj: string;
	cliente_razao: string;
	contato_primeiro_nome: string;
	contato_nome_completo: string;
	atendente_nome: string;
	atendente_nome_exibição: string;
}