import { useAuthContext } from "@/app/auth-context";
import { CustomerLookupOption, CustomersClient } from "@/lib/sdk-local";
import type { CustomerBusinessFilterOptions } from "@/lib/types/customer-business-filters";
import { useEffect, useRef, useState } from "react";
import { subscribeCustomerSegmentsChanged } from "@/lib/customer-segments-events";

const CUSTOMERS_BASE_URL =
  process.env["NEXT_PUBLIC_CUSTOMERS_URL"] || "https://inpulse.infotecrs.inf.br";

const EMPTY_OPTIONS: CustomerBusinessFilterOptions = {
  campaigns: [],
  segments: [],
  operators: [],
};

function sortOptions(options: CustomerLookupOption[]) {
  return [...options].sort((a, b) => (a.NOME ?? "").localeCompare(b.NOME ?? "", "pt-BR"));
}

export default function useCustomerBusinessFilterOptions({
  includeCampaigns = true,
}: { includeCampaigns?: boolean } = {}) {
  const { token, instance, user } = useAuthContext();
  const scope = `${instance}:${user?.CODIGO ?? "anonymous"}:${token ?? ""}:${includeCampaigns}`;
  const client = useRef(new CustomersClient(CUSTOMERS_BASE_URL));
  const [state, setState] = useState({
    scope: "",
    options: EMPTY_OPTIONS,
    loading: false,
    error: false,
  });
  const [catalogVersion, setCatalogVersion] = useState(0);

  useEffect(
    () =>
      subscribeCustomerSegmentsChanged(instance, () => {
        setCatalogVersion((version) => version + 1);
      }),
    [instance],
  );

  useEffect(() => {
    if (!token) {
      setState({ scope, options: EMPTY_OPTIONS, loading: false, error: false });
      return;
    }

    let active = true;
    client.current.setAuth(token);
    setState((current) => ({
      scope,
      options: current.scope === scope ? current.options : EMPTY_OPTIONS,
      loading: true,
      error: false,
    }));

    Promise.all([
      includeCampaigns ? client.current.getCampaigns() : Promise.resolve([]),
      client.current.getSegments(),
      client.current.getOperators(),
    ])
      .then(([campaigns, segments, operators]) => {
        if (!active) return;
        setState({
          scope,
          loading: false,
          error: false,
          options: {
            campaigns: sortOptions(campaigns),
            segments: sortOptions(segments),
            operators: sortOptions(operators),
          },
        });
      })
      .catch(() => {
        if (active) setState({ scope, options: EMPTY_OPTIONS, loading: false, error: true });
      })
      .finally(() => {
        if (active)
          setState((current) =>
            current.scope === scope ? { ...current, loading: false } : current,
          );
      });

    return () => {
      active = false;
    };
  }, [token, instance, scope, includeCampaigns, catalogVersion]);

  return {
    options: state.scope === scope ? state.options : EMPTY_OPTIONS,
    loading: Boolean(token) && (state.scope !== scope || state.loading),
    error: state.scope === scope && state.error,
    refetch: () => setCatalogVersion((version) => version + 1),
  };
}
