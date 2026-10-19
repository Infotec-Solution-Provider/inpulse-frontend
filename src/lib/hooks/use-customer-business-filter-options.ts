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

export default function useCustomerBusinessFilterOptions() {
  const { token, instance } = useAuthContext();
  const client = useRef(new CustomersClient(CUSTOMERS_BASE_URL));
  const [options, setOptions] = useState<CustomerBusinessFilterOptions>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);

  useEffect(() => subscribeCustomerSegmentsChanged(instance, () => {
    setCatalogVersion((version) => version + 1);
  }), [instance]);

  useEffect(() => {
    if (!token) {
      setOptions(EMPTY_OPTIONS);
      return;
    }

    let active = true;
    client.current.setAuth(token);
    setLoading(true);

    Promise.all([
      client.current.getCampaigns(),
      client.current.getSegments(),
      client.current.getOperators(),
    ])
      .then(([campaigns, segments, operators]) => {
        if (!active) return;
        setOptions({
          campaigns: sortOptions(campaigns),
          segments: sortOptions(segments),
          operators: sortOptions(operators),
        });
      })
      .catch(() => {
        if (active) setOptions(EMPTY_OPTIONS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, instance, catalogVersion]);

  return { options, loading };
}
