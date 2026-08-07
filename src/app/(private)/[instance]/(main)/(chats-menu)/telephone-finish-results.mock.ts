export interface TelephoneFinishResult {
  id: number;
  name: string;
  actionCode?: number;
}

export const telephoneFinishResultsMock: TelephoneFinishResult[] = [
  {
    id: 1,
    name: "Contato realizado",
  },
  {
    id: 2,
    name: "Reagendar retorno",
    actionCode: 2,
  },
  {
    id: 3,
    name: "Sem resposta",
  },
  {
    id: 4,
    name: "Numero invalido",
  },
];