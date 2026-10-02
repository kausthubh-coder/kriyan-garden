"use client";
import { useEffect, useRef, useState } from "react";
import { KRIYAN_MCP_URL, mcpClients } from "@/lib/mcpClients";
import s from "./Public.module.css";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <>
      <button
        type="button"
        className={s.copyInline}
        onClick={async () => {
          clearTimeout(timer.current);
          try {
            await navigator.clipboard.writeText(text);
            setMessage("Copied");
          } catch {
            setMessage("Copy failed. Select the text and copy it manually.");
          }
          timer.current = setTimeout(() => setMessage(""), 2000);
        }}
      >
        {message === "Copied" ? "Copied" : label}
      </button>
      <p role="status" className={s.sr}>{message}</p>
    </>
  );
}

function serverUrl(label: string) {
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <div className={s.fieldRow}>
        <code>{KRIYAN_MCP_URL}</code>
        <CopyButton text={KRIYAN_MCP_URL} label="Copy URL" />
      </div>
    </div>
  );
}

export function ConnectAI() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const client = mcpClients[active];
  if (!client) return null;
  return (
    <div>
      <div className={s.tabs} role="tablist" aria-label="AI client">
        {mcpClients.map((item, i) => (
          <button
            key={item.name}
            id={`connect-${i}`}
            ref={(el) => { tabs.current[i] = el; }}
            role="tab"
            aria-selected={active === i}
            aria-controls="connect-panel"
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
              e.preventDefault();
              const last = mcpClients.length - 1;
              const next = e.key === "Home" ? 0 : e.key === "End" ? last : (active + (e.key === "ArrowRight" ? 1 : -1) + mcpClients.length) % mcpClients.length;
              setActive(next);
              tabs.current[next]?.focus();
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div id="connect-panel" role="tabpanel" aria-labelledby={`connect-${active}`} tabIndex={0} className={s.connect}>
        {client.action && (
          <a className={s.button} href={client.action.href} target="_blank" rel="noopener noreferrer">
            {client.action.label}<span className={s.sr}> (opens in a new tab)</span>
          </a>
        )}
        {client.command && (
          <div className={s.field}>
            <span className={s.fieldLabel}>Command</span>
            <div className={s.fieldRow}>
              <code>{client.command}</code>
              <CopyButton text={client.command} label="Copy command" />
            </div>
          </div>
        )}
        {!client.command && !client.oneClick && serverUrl("Server URL")}
        <ol className={s.steps}>
          {client.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        {client.oneClick && serverUrl("Server URL for manual setup")}
        {client.note && <p className={s.connectNote}>{client.note}</p>}
      </div>
    </div>
  );
}
