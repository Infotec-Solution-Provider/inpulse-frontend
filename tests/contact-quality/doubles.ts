const scenario = new URLSearchParams(location.search).get("scenario");
export const state = { posts: [] as unknown[], searches: [] as unknown[], closed: 0, refreshed: 0 };
Object.assign(window, { contactFixture: state });
const candidates = [
  { id: 12, name: "Empresa de teste A", cpfCnpj: "12345678000190", erpCode: "A12" },
  { id: 13, name: "Empresa de teste B com nome longo para conferir a apresentação no celular", cpfCnpj: "98765432000190", erpCode: "B13" },
];
const api = { current: { ax: {
  get: async () => ({ data: { data: { status: scenario === "unavailable" ? "unavailable" : "ready", candidates: scenario === "unavailable" ? [] : candidates, truncated: false } } }),
  post: async (url: string, body: unknown) => {
    state.posts.push({ url, body });
    await new Promise(resolve => setTimeout(resolve, 100));
    if (scenario === "conflict") throw { response: { status: 409 } };
    if (scenario === "sync-pending" && state.posts.length === 1) throw { response: { status: 500, data: { message: "CONTACT_CUSTOMER_SYNC_PENDING" } } };
    return { data: {} };
  },
} } };
const searchCustomers = async (text: string, field: string) => {
  state.searches.push({ text, field });
  return text ? candidates.map(c => ({ CODIGO: c.id, RAZAO: c.name, CPF_CNPJ: c.cpfCnpj, COD_ERP: c.erpCode })) : [];
};
export const useAppContext = () => ({ closeModal: () => { state.closed++; } });
export const useWhatsappContext = () => ({ wppApi: api });
export const useCustomersContext = () => ({ searchCustomers });
