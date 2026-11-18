export const useParams = () => ({
  instance: "tenant-a",
  id: "fixture-dashboard",
  reportId: "fixture-report",
});
export const useRouter = () => ({ push: (path: string) => window.history.pushState({}, "", path) });
