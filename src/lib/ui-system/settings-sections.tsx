"use client";

import { Tab, Tabs } from "@mui/material";
import { useId, type ReactNode } from "react";
import "./settings.css";

/** Panels stay mounted so switching sections never discards a draft. */
export function SettingsSections({
  label,
  value,
  onChange,
  sections,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  sections: { id: string; label: string; content: ReactNode }[];
}) {
  const id = useId();
  return (
    <div className="ip-settings">
      <Tabs
        aria-label={label}
        value={value}
        onChange={(_, next) => onChange(next)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        {sections.map((section) => (
          <Tab
            key={section.id}
            id={`${id}-${section.id}-tab`}
            aria-controls={`${id}-${section.id}`}
            value={section.id}
            label={section.label}
          />
        ))}
      </Tabs>
      {sections.map((section) => (
        <div
          key={section.id}
          role="tabpanel"
          id={`${id}-${section.id}`}
          aria-labelledby={`${id}-${section.id}-tab`}
          hidden={value !== section.id}
          style={value === section.id ? undefined : { display: "none" }}
          className="ip-settings-panel"
        >
          {section.content}
        </div>
      ))}
    </div>
  );
}

export function SettingsPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="ip-settings-card">
      <header>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}
