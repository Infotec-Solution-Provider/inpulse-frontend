export const WPP_BASE_URL = "http://fixture-whatsapp";
const sectors = [
  { id: 8, name: "Pós-vendas" },
  { id: 19, name: "Suporte" },
];
export const useWhatsappContext = () => ({
  loaded: true,
  sectors,
  parameters: { feature_reports_advanced_enabled: "true" },
});
