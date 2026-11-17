"use client";

import { Suspense, useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "../whatsapp-context";
import { availableReports, REPORT_CATEGORIES } from "@/lib/reports/catalog";
import { ReportCatalogView } from "@/components/reports/ReportCatalog";

function ReportsCentral() {
  const { instance, user } = useContext(AuthContext);
  const { parameters, loaded } = useWhatsappContext();
  const params = useSearchParams();
  const requestedCategory = params.get("category");
  const requestedQuery = params.get("q") ?? "";
  const validCategory = REPORT_CATEGORIES.some((item) => item.id === requestedCategory)
    ? requestedCategory!
    : "all";
  const [query, setQuery] = useState(requestedQuery);
  const [category, setCategory] = useState(validCategory);
  useEffect(() => {
    setQuery(requestedQuery);
    setCategory(validCategory);
  }, [requestedQuery, validCategory]);
  if (!loaded) return <p className="p-6 text-sm">Carregando relatórios disponíveis…</p>;
  return (
    <ReportCatalogView
      instance={instance}
      reports={availableReports(parameters, user?.NIVEL, instance)}
      query={query}
      category={category}
      onChange={(query, nextCategory) => {
        setQuery(query);
        setCategory(nextCategory);
        const next = new URLSearchParams();
        if (query) next.set("q", query);
        if (nextCategory !== "all") next.set("category", nextCategory);
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${next.size ? `?${next}` : ""}`);
      }}
    />
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Carregando relatórios…</p>}>
      <ReportsCentral />
    </Suspense>
  );
}
