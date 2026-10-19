"use client";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import NextLink from "next/link";
import { type ReactNode } from "react";
import "./crm.css";

export function CrmPage({
  title,
  description,
  count,
  breadcrumbs = [],
  actions,
  children,
}: {
  title: string;
  description?: string;
  count?: number;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ip-crud-page">
      {breadcrumbs.length > 0 && (
        <Breadcrumbs aria-label="Navegação">
          {breadcrumbs.map((item, i) =>
            item.href ? (
              <Link key={i} component={NextLink} href={item.href} color="inherit" underline="hover">
                {item.label}
              </Link>
            ) : (
              <Typography key={i} component="span" color="text.secondary" fontSize={13}>
                {item.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <header className="ip-crud-header">
        <div>
          <div className="ip-crud-title">
            <h1>{title}</h1>
            {count !== undefined && (
              <span className="ip-crud-count" aria-label={`${count} registros`}>
                {count.toLocaleString("pt-BR")}
              </span>
            )}
          </div>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="ip-crud-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
export function CrmToolbar({ children }: { children: ReactNode }) {
  return <div className="ip-crud-toolbar">{children}</div>;
}
