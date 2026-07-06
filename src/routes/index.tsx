import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Academy China 2026 — Imersão executiva em IA aplicada" },
      { name: "description", content: "Imersão executiva em IA aplicada na China. Vagas limitadas, edição 2026." },
      { "http-equiv": "refresh", content: "0; url=/academy.html" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div style={{ background: "#141414", minHeight: "100vh" }}>
      <script
        dangerouslySetInnerHTML={{
          __html: "window.location.replace('/academy.html');",
        }}
      />
      <noscript>
        <a href="/academy.html" style={{ color: "#fff" }}>
          Continuar para o site
        </a>
      </noscript>
    </div>
  );
}
