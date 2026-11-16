import { useEffect, useState } from "react";
import { TextField } from "@mui/material";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { configurationAreas, sourceAreaId, sourceDescription } from "./parameter-navigation";
import type { Source } from "./types";

export function ParameterNavigation({
  sources,
  selected,
  enabled,
  loading,
  onSelect,
}: {
  sources: Source[];
  selected: Source | null;
  enabled: boolean;
  loading: boolean;
  onSelect: (source: Source) => boolean;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(sourceAreaId(selected?.id ?? "whatsapp"));
  useEffect(() => {
    if (selected) setExpanded(sourceAreaId(selected.id));
  }, [selected?.id]);
  const groups = configurationAreas(sources, search);
  return (
    <nav className="admin-parameter-nav admin-card" aria-label="Áreas de configuração">
      <div className="admin-parameter-nav-heading">
        <h2>Configurações</h2>
        <p>
          {enabled
            ? "Escolha uma área e a fonte que deseja consultar."
            : "Escolha o tenant para consultar suas configurações."}
        </p>
        <TextField
          fullWidth
          size="small"
          label="Encontrar configuração"
          placeholder="Ex.: OpenAI, canal, SIP"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <Search size={16} aria-hidden="true" className="admin-parameter-search-icon" />
              ),
            },
          }}
        />
      </div>
      {loading ? (
        <p className="admin-parameter-nav-empty">Carregando áreas…</p>
      ) : !groups.length ? (
        <p className="admin-parameter-nav-empty">Nenhuma configuração encontrada.</p>
      ) : (
        groups.map((group) => {
          const open = !!search.trim() || expanded === group.id;
          const current = selected && group.items.some((source) => source.id === selected.id);
          return (
            <section className="admin-parameter-area" key={group.id}>
              <h3>
                <button
                  type="button"
                  className="admin-parameter-area-toggle"
                  aria-expanded={open}
                  aria-controls={`admin-parameter-area-${group.id}`}
                  onClick={() => setExpanded(open ? "" : group.id)}
                >
                  <span>
                    {group.label}
                    {current && <i aria-label="Contém a configuração selecionada" />}
                  </span>
                  <span className="admin-parameter-area-count">{group.items.length}</span>
                  <ChevronDown size={16} aria-hidden="true" className={open ? "is-open" : ""} />
                </button>
              </h3>
              {open && (
                <div
                  id={`admin-parameter-area-${group.id}`}
                  className="admin-parameter-source-list"
                >
                  {group.items.map((source) => (
                    <button
                      type="button"
                      key={source.id}
                      className="admin-parameter-source"
                      aria-label={source.label}
                      aria-current={selected?.id === source.id ? "true" : undefined}
                      disabled={!enabled || !source.available}
                      title={source.message}
                      onClick={() => {
                        if (onSelect(source)) {
                          setExpanded(group.id);
                          setSearch("");
                        }
                      }}
                    >
                      <span>
                        <strong>{source.label}</strong>
                        <small>
                          {!source.available
                            ? source.message || "Indisponível neste ambiente"
                            : sourceDescription(source)}
                        </small>
                      </span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </nav>
  );
}
