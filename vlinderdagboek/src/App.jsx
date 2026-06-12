import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceArea, BarChart, Bar,
} from "recharts";
import { jsPDF } from "jspdf";

/* ── Vlinderdagboek ─ dagboek voor mensen met Hashimoto ──────────────
   De schildklier heeft de vorm van een vlinder; vandaar de naam.
   Kleuren: kalm zeegroen + warme koraal-accentkleur voor energie.   */

const C = {
  bg: "#EFF4F1",
  surface: "#FFFFFF",
  ink: "#1E2D2A",
  muted: "#5F7470",
  primary: "#2A6B63",
  primarySoft: "#DCEAE6",
  accent: "#E0795B",
  accentSoft: "#FAE6DE",
  line: "#D6E1DC",
  gold: "#C99A3C",
};

const SYMPTOMEN = [
  "Vermoeidheid", "Koude handen/voeten", "Haaruitval", "Droge huid",
  "Spier- of gewrichtspijn", "Obstipatie", "Hartkloppingen",
  "Opgezette hals / drukgevoel", "Opgeblazen gevoel", "Duizeligheid",
  "Somberheid", "Prikkelbaarheid", "Concentratieproblemen", "Hoofdpijn",
];

const LAB_VELDEN = [
  { key: "tsh", label: "TSH", unit: "mU/L", ref: "0,4 – 4,0" },
  { key: "ft4", label: "FT4 (vrij T4)", unit: "pmol/L", ref: "12 – 22" },
  { key: "ft3", label: "FT3 (vrij T3)", unit: "pmol/L", ref: "3,1 – 6,8" },
  { key: "tpo", label: "Anti-TPO", unit: "kU/L", ref: "< 35" },
  { key: "tg", label: "Anti-Tg", unit: "kU/L", ref: "< 115" },
  { key: "vitd", label: "Vitamine D", unit: "nmol/L", ref: "75 – 150" },
  { key: "b12", label: "Vitamine B12", unit: "pmol/L", ref: "150 – 700" },
  { key: "ferritine", label: "Ferritine", unit: "µg/L", ref: "30 – 200" },
];

const vandaag = () => new Date().toISOString().slice(0, 10);
const fmtDatum = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("nl-BE", { day: "numeric", month: "short" });
};

const leegDag = (datum) => ({
  datum,
  energie: null, brainfog: null, stemming: null, stress: null,
  slaapUren: "", slaapKwaliteit: null,
  symptomen: [],
  medicatieGenomen: false, medicatieNuchter: false, medicatieTijd: "",
  bewegingMin: "", gewicht: "", menstruatie: false,
  notities: "",
});

/* ── kleine bouwstenen ─────────────────────────────────────────── */

function ScoreRij({ label, hint, value, onChange, kleur = C.primary }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{label}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{hint}</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 7 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const actief = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(actief ? null : n)}
              aria-label={`${label} ${n} van 10`}
              style={{
                flex: 1, height: 34, borderRadius: 8, fontSize: 13,
                fontWeight: actief ? 700 : 500, cursor: "pointer",
                border: `1px solid ${actief ? kleur : C.line}`,
                background: actief ? kleur : C.surface,
                color: actief ? "#fff" : C.muted,
                transition: "background .15s, color .15s",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ actief, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 13px", borderRadius: 999, fontSize: 13, cursor: "pointer",
        border: `1px solid ${actief ? C.accent : C.line}`,
        background: actief ? C.accentSoft : C.surface,
        color: actief ? "#9C4A2E" : C.muted,
        fontWeight: actief ? 600 : 450,
        transition: "all .15s",
      }}
    >
      {children}
    </button>
  );
}

function Schakelaar({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: C.ink }}>
      <span
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        role="switch" aria-checked={checked}
        style={{
          width: 40, height: 22, borderRadius: 999, position: "relative", flexShrink: 0,
          background: checked ? C.primary : C.line, transition: "background .2s",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          transition: "left .2s", boxShadow: "0 1px 2px rgba(0,0,0,.2)",
        }} />
      </span>
      {label}
    </label>
  );
}

function Veld({ label, suffix, ...props }) {
  return (
    <label style={{ display: "block", fontSize: 13, color: C.muted, fontWeight: 600 }}>
      {label}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
        <input
          {...props}
          style={{
            width: "100%", padding: "9px 11px", borderRadius: 9, fontSize: 15,
            border: `1px solid ${C.line}`, background: C.surface, color: C.ink, outline: "none",
          }}
        />
        {suffix && <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </label>
  );
}

function Kaart({ titel, children, sub }) {
  return (
    <section style={{
      background: C.surface, borderRadius: 16, padding: "20px 18px",
      border: `1px solid ${C.line}`, marginBottom: 16,
    }}>
      {titel && (
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontFamily: "'Fraunces', Georgia, serif", color: C.ink }}>
          {titel}
        </h2>
      )}
      {sub && <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.muted }}>{sub}</p>}
      {!sub && titel && <div style={{ height: 10 }} />}
      {children}
    </section>
  );
}

function Vlinder({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <g fill="none" stroke={C.primary} strokeWidth="2.4" strokeLinecap="round">
        <path d="M24 14 C 14 4, 4 8, 6 18 C 7.5 25, 16 28, 24 26" fill={C.primarySoft} />
        <path d="M24 14 C 34 4, 44 8, 42 18 C 40.5 25, 32 28, 24 26" fill={C.primarySoft} />
        <path d="M24 26 C 17 27, 11 33, 13 38 C 15 42, 22 40, 24 34" fill={C.accentSoft} stroke={C.accent} />
        <path d="M24 26 C 31 27, 37 33, 35 38 C 33 42, 26 40, 24 34" fill={C.accentSoft} stroke={C.accent} />
        <line x1="24" y1="12" x2="24" y2="36" stroke={C.ink} />
      </g>
    </svg>
  );
}

/* ── hoofdcomponent ─────────────────────────────────────────────── */

export default function Vlinderdagboek() {
  const [tab, setTab] = useState("dag");
  const [datum, setDatum] = useState(vandaag());
  const [dag, setDag] = useState(leegDag(vandaag()));
  const [entries, setEntries] = useState({});
  const [labs, setLabs] = useState([]);
  const [labForm, setLabForm] = useState({ datum: vandaag(), dosis: "", notities: "" });
  const [melding, setMelding] = useState("");
  const [laden, setLaden] = useState(true);

  /* laden bij start — gegevens staan in de browser van de gebruiker (localStorage) */
  useEffect(() => {
    try {
      const r = localStorage.getItem("vlinderdagboek-data");
      if (r) {
        const d = JSON.parse(r);
        setEntries(d.entries || {});
        setLabs(d.labs || []);
        if (d.entries?.[vandaag()]) setDag({ ...leegDag(vandaag()), ...d.entries[vandaag()] });
      }
    } catch { /* nog geen gegevens — prima */ }
    setLaden(false);
  }, []);

  const bewaarAlles = (nieuweEntries, nieuweLabs) => {
    try {
      localStorage.setItem("vlinderdagboek-data", JSON.stringify({ entries: nieuweEntries, labs: nieuweLabs }));
      setMelding("Opgeslagen ✓");
      setTimeout(() => setMelding(""), 2200);
    } catch {
      setMelding("Opslaan mislukt — probeer opnieuw");
      setTimeout(() => setMelding(""), 3000);
    }
  };

  const kiesDatum = (d) => {
    setDatum(d);
    setDag(entries[d] ? { ...leegDag(d), ...entries[d] } : leegDag(d));
  };

  const bewaarDag = () => {
    const nieuw = { ...entries, [datum]: { ...dag, datum } };
    setEntries(nieuw);
    bewaarAlles(nieuw, labs);
  };

  const bewaarLab = () => {
    const heeftWaarde = LAB_VELDEN.some((v) => labForm[v.key]);
    if (!heeftWaarde) { setMelding("Vul minstens één waarde in"); setTimeout(() => setMelding(""), 2500); return; }
    const nieuw = [...labs.filter((l) => l.datum !== labForm.datum), { ...labForm }]
      .sort((a, b) => a.datum.localeCompare(b.datum));
    setLabs(nieuw);
    bewaarAlles(entries, nieuw);
    setLabForm({ datum: vandaag(), dosis: "", notities: "" });
  };

  const verwijderLab = (d) => {
    const nieuw = labs.filter((l) => l.datum !== d);
    setLabs(nieuw);
    bewaarAlles(entries, nieuw);
  };

  /* back-up: alles als bestand bewaren of terugzetten */
  const exporteer = () => {
    const blob = new Blob(
      [JSON.stringify({ app: "vlinderdagboek", versie: 1, entries, labs }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vlinderdagboek-backup-${vandaag()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMelding("Back-up gedownload ✓");
    setTimeout(() => setMelding(""), 2500);
  };

  const importeer = (e) => {
    const bestand = e.target.files?.[0];
    if (!bestand) return;
    const lezer = new FileReader();
    lezer.onload = () => {
      try {
        const d = JSON.parse(lezer.result);
        if (d.app !== "vlinderdagboek") throw new Error();
        const nieuweEntries = { ...d.entries, ...entries };
        const nieuweLabs = [
          ...(d.labs || []).filter((l) => !labs.some((b) => b.datum === l.datum)),
          ...labs,
        ].sort((a, b) => a.datum.localeCompare(b.datum));
        setEntries(nieuweEntries);
        setLabs(nieuweLabs);
        bewaarAlles(nieuweEntries, nieuweLabs);
        if (nieuweEntries[datum]) setDag({ ...leegDag(datum), ...nieuweEntries[datum] });
      } catch {
        setMelding("Bestand niet herkend — kies een Vlinderdagboek-back-up");
        setTimeout(() => setMelding(""), 3500);
      }
    };
    lezer.readAsText(bestand);
    e.target.value = "";
  };

  const toggleSymptoom = (s) =>
    setDag((p) => ({
      ...p,
      symptomen: p.symptomen.includes(s) ? p.symptomen.filter((x) => x !== s) : [...p.symptomen, s],
    }));

  /* trend-data: laatste 30 ingevulde dagen */
  const trendData = Object.values(entries)
    .filter((e) => e.energie || e.stress || e.brainfog)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .slice(-30)
    .map((e) => ({ d: fmtDatum(e.datum), Energie: e.energie, Stress: e.stress, "Brain fog": e.brainfog }));

  const tshData = labs.filter((l) => l.tsh).map((l) => ({ d: fmtDatum(l.datum), TSH: parseFloat(String(l.tsh).replace(",", ".")) }));

  /* hoe vaak kwam elk symptoom voor (laatste 30 ingevulde dagen)? */
  const dagen30 = Object.values(entries).sort((a, b) => a.datum.localeCompare(b.datum)).slice(-30);
  const symptoomTelling = {};
  dagen30.forEach((e) => (e.symptomen || []).forEach((s) => { symptoomTelling[s] = (symptoomTelling[s] || 0) + 1; }));
  const symptoomData = Object.entries(symptoomTelling)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([naam, n]) => ({ naam, dagen: n }));

  /* PDF-rapport voor de arts */
  const maakPdf = () => {
    const doc = new jsPDF();
    const B = 14; // linkermarge
    let y = 18;
    const gem = (arr) => {
      const v = arr.filter((x) => x != null && x !== "");
      return v.length ? (v.reduce((a, b) => a + Number(b), 0) / v.length).toFixed(1) : "—";
    };
    const checkPagina = (nodig = 10) => {
      if (y > 282 - nodig) { doc.addPage(); y = 18; }
    };

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(42, 107, 99);
    doc.text("Vlinderdagboek — rapport", B, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(95, 116, 112);
    doc.text(`Dagboek bij de ziekte van Hashimoto · aangemaakt op ${new Date().toLocaleDateString("nl-BE")}`, B, y);
    y += 4; doc.setDrawColor(214, 225, 220); doc.line(B, y, 196, y); y += 9;

    /* samenvatting laatste 30 dagen */
    doc.setTextColor(30, 45, 42);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(`Samenvatting (laatste ${dagen30.length} ingevulde dagen)`, B, y); y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
    const medDagen = dagen30.filter((e) => e.medicatieGenomen).length;
    const nuchterDagen = dagen30.filter((e) => e.medicatieNuchter).length;
    [
      `Gemiddelde energie: ${gem(dagen30.map((e) => e.energie))} / 10`,
      `Gemiddeld helder hoofd (brain fog omgekeerd): ${gem(dagen30.map((e) => e.brainfog))} / 10`,
      `Gemiddelde stemming: ${gem(dagen30.map((e) => e.stemming))} / 10  ·  gemiddelde stress: ${gem(dagen30.map((e) => e.stress))} / 10`,
      `Gemiddelde slaap: ${gem(dagen30.map((e) => e.slaapUren))} uur (kwaliteit ${gem(dagen30.map((e) => e.slaapKwaliteit))} / 10)`,
      `Medicatie genomen op ${medDagen} van ${dagen30.length} dagen, waarvan ${nuchterDagen}× nuchter`,
    ].forEach((r) => { doc.text(r, B, y); y += 6; });
    y += 3;

    /* energiegrafiek getekend in de pdf */
    const punten = dagen30.filter((e) => e.energie != null);
    if (punten.length >= 2) {
      checkPagina(58);
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text("Energieverloop", B, y); y += 5;
      const gx = B, gy = y, gw = 182, gh = 38;
      doc.setDrawColor(214, 225, 220); doc.setFillColor(239, 244, 241);
      doc.rect(gx, gy, gw, gh, "FD");
      doc.setDrawColor(224, 121, 91); doc.setLineWidth(0.7);
      punten.forEach((e, i) => {
        if (i === 0) return;
        const x1 = gx + ((i - 1) / (punten.length - 1)) * gw;
        const x2 = gx + (i / (punten.length - 1)) * gw;
        const y1 = gy + gh - (punten[i - 1].energie / 10) * gh;
        const y2 = gy + gh - (e.energie / 10) * gh;
        doc.line(x1, y1, x2, y2);
      });
      doc.setLineWidth(0.2); doc.setFontSize(8); doc.setTextColor(95, 116, 112);
      doc.setFont("helvetica", "normal");
      doc.text("10", gx - 5, gy + 3); doc.text("0", gx - 4, gy + gh);
      doc.text(fmtDatum(punten[0].datum), gx, gy + gh + 5);
      doc.text(fmtDatum(punten[punten.length - 1].datum), gx + gw - 14, gy + gh + 5);
      y = gy + gh + 12; doc.setTextColor(30, 45, 42);
    }

    /* meest voorkomende symptomen */
    if (symptoomData.length) {
      checkPagina(12 + symptoomData.length * 6);
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text("Meest voorkomende symptomen", B, y); y += 7;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
      symptoomData.forEach((s) => {
        doc.text(`${s.naam}: ${s.dagen} ${s.dagen === 1 ? "dag" : "dagen"}`, B, y);
        doc.setFillColor(224, 121, 91);
        doc.rect(110, y - 3.2, (s.dagen / dagen30.length) * 80, 4, "F");
        y += 6;
      });
      y += 3;
    }

    /* bloedwaarden */
    if (labs.length) {
      checkPagina(20);
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text("Bloedwaarden", B, y); y += 7;
      doc.setFontSize(9.5);
      [...labs].reverse().forEach((l) => {
        checkPagina(16);
        doc.setFont("helvetica", "bold");
        const kop = new Date(l.datum + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })
          + (l.dosis ? `  ·  dosis ${l.dosis} µg levothyroxine` : "");
        doc.text(kop, B, y); y += 5.5;
        doc.setFont("helvetica", "normal");
        const regel = LAB_VELDEN.filter((v) => l[v.key]).map((v) => `${v.label}: ${l[v.key]} ${v.unit}`).join("   ·   ");
        const regels = doc.splitTextToSize(regel, 182);
        doc.text(regels, B, y); y += regels.length * 5;
        if (l.notities) { const n = doc.splitTextToSize(`Notitie: ${l.notities}`, 182); doc.text(n, B, y); y += n.length * 5; }
        y += 3;
      });
    }

    /* voettekst */
    checkPagina(10);
    doc.setFontSize(8.5); doc.setTextColor(95, 116, 112);
    doc.text("Dit rapport is door de patiënt zelf bijgehouden met het Vlinderdagboek en vervangt geen medisch dossier.", B, 290);

    doc.save(`vlinderdagboek-rapport-${vandaag()}.pdf`);
    setMelding("PDF-rapport gedownload ✓");
    setTimeout(() => setMelding(""), 2500);
  };

  const tabs = [
    { id: "dag", label: "Dagboek" },
    { id: "lab", label: "Bloed" },
    { id: "trend", label: "Trends" },
    { id: "backup", label: "Back-up" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Sora', system-ui, sans-serif", color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Sora:wght@400;450;600;700&display=swap');
        input:focus, textarea:focus { border-color: ${C.primary} !important; }
        button:focus-visible { outline: 2px solid ${C.primary}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 14px 60px" }}>

        {/* kop */}
        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Vlinder size={36} />
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600 }}>
              Vlinderdagboek
            </h1>
            <p style={{ margin: 0, fontSize: 12.5, color: C.muted }}>
              Jouw dagboek bij Hashimoto — de schildklier is tenslotte een vlinder.
            </p>
          </div>
        </header>

        {/* tabs */}
        <nav style={{ display: "flex", gap: 6, margin: "18px 0 16px", background: C.surface, padding: 5, borderRadius: 12, border: `1px solid ${C.line}` }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
                background: tab === t.id ? C.primary : "transparent",
                color: tab === t.id ? "#fff" : C.muted, transition: "all .15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {melding && (
          <div style={{
            position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)",
            background: C.ink, color: "#fff", padding: "9px 18px", borderRadius: 999,
            fontSize: 13.5, zIndex: 10, boxShadow: "0 4px 14px rgba(0,0,0,.2)",
          }}>
            {melding}
          </div>
        )}

        {laden ? (
          <p style={{ textAlign: "center", color: C.muted }}>Gegevens laden…</p>
        ) : tab === "dag" ? (
          <>
            <Kaart>
              <Veld label="Datum" type="date" value={datum} max={vandaag()} onChange={(e) => kiesDatum(e.target.value)} />
            </Kaart>

            <Kaart titel="Hoe voel je je vandaag?" sub="Tik een score aan (1 = heel slecht, 10 = uitstekend). Tik nogmaals om te wissen.">
              <ScoreRij label="Energie" hint="1 = uitgeput · 10 = energiek" value={dag.energie} onChange={(v) => setDag({ ...dag, energie: v })} kleur={C.accent} />
              <ScoreRij label="Helder hoofd" hint="1 = zware brain fog · 10 = glashelder" value={dag.brainfog} onChange={(v) => setDag({ ...dag, brainfog: v })} />
              <ScoreRij label="Stemming" hint="1 = somber · 10 = opgewekt" value={dag.stemming} onChange={(v) => setDag({ ...dag, stemming: v })} />
              <ScoreRij label="Stress" hint="1 = ontspannen · 10 = zeer gestrest" value={dag.stress} onChange={(v) => setDag({ ...dag, stress: v })} kleur={C.gold} />
            </Kaart>

            <Kaart titel="Symptomen" sub="Welke klachten merkte je vandaag op?">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SYMPTOMEN.map((s) => (
                  <Chip key={s} actief={dag.symptomen.includes(s)} onClick={() => toggleSymptoom(s)}>{s}</Chip>
                ))}
              </div>
            </Kaart>

            <Kaart titel="Medicatie" sub="Levothyroxine werkt het best nuchter, 30–60 min vóór het ontbijt.">
              <div style={{ display: "grid", gap: 12 }}>
                <Schakelaar label="Schildkliermedicatie genomen" checked={dag.medicatieGenomen} onChange={(v) => setDag({ ...dag, medicatieGenomen: v })} />
                {dag.medicatieGenomen && (
                  <>
                    <Schakelaar label="Nuchter genomen (en gewacht met eten)" checked={dag.medicatieNuchter} onChange={(v) => setDag({ ...dag, medicatieNuchter: v })} />
                    <Veld label="Tijdstip van inname" type="time" value={dag.medicatieTijd} onChange={(e) => setDag({ ...dag, medicatieTijd: e.target.value })} />
                  </>
                )}
              </div>
            </Kaart>

            <Kaart titel="Slaap & lichaam">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <Veld label="Uren geslapen" type="number" inputMode="decimal" min="0" max="24" step="0.5" value={dag.slaapUren} onChange={(e) => setDag({ ...dag, slaapUren: e.target.value })} suffix="u" />
                <Veld label="Beweging" type="number" inputMode="numeric" min="0" value={dag.bewegingMin} onChange={(e) => setDag({ ...dag, bewegingMin: e.target.value })} suffix="min" />
              </div>
              <ScoreRij label="Slaapkwaliteit" hint="1 = zeer slecht · 10 = heerlijk" value={dag.slaapKwaliteit} onChange={(v) => setDag({ ...dag, slaapKwaliteit: v })} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "end" }}>
                <Veld label="Gewicht (optioneel)" type="number" inputMode="decimal" step="0.1" value={dag.gewicht} onChange={(e) => setDag({ ...dag, gewicht: e.target.value })} suffix="kg" />
                <Schakelaar label="Menstruatie" checked={dag.menstruatie} onChange={(v) => setDag({ ...dag, menstruatie: v })} />
              </div>
            </Kaart>

            <Kaart titel="Notities" sub="Voeding, bijzondere gebeurtenissen, vermoedelijke triggers…">
              <textarea
                rows={3}
                value={dag.notities}
                onChange={(e) => setDag({ ...dag, notities: e.target.value })}
                placeholder="bv. glutenvrij gegeten, drukke werkdag, om 15u energiedip…"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 9,
                  border: `1px solid ${C.line}`, fontSize: 14.5, fontFamily: "inherit",
                  color: C.ink, resize: "vertical", outline: "none", background: C.surface,
                }}
              />
            </Kaart>

            <button
              onClick={bewaarDag}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                background: C.primary, color: "#fff", fontSize: 16, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Dag opslaan
            </button>

            {Object.keys(entries).length > 0 && (
              <Kaart titel="Eerdere dagen">
                <div style={{ display: "grid", gap: 8 }}>
                  {Object.values(entries).sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 7).map((e) => (
                    <button
                      key={e.datum}
                      onClick={() => { kiesDatum(e.datum); window.scrollTo({ top: 0 }); }}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`,
                        background: e.datum === datum ? C.primarySoft : C.surface,
                        cursor: "pointer", fontSize: 13.5, color: C.ink, fontFamily: "inherit", textAlign: "left",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{fmtDatum(e.datum)}</span>
                      <span style={{ color: C.muted }}>
                        {e.energie ? `Energie ${e.energie}/10` : "—"}
                        {e.symptomen?.length ? ` · ${e.symptomen.length} sympt.` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </Kaart>
            )}
          </>
        ) : tab === "lab" ? (
          <>
            <Kaart titel="Nieuwe bloedafname" sub="Vul in wat je labo gemeten heeft; laat de rest leeg. Referentiewaarden verschillen per labo — neem die van jouw uitslag als leidraad.">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <Veld label="Datum afname" type="date" max={vandaag()} value={labForm.datum} onChange={(e) => setLabForm({ ...labForm, datum: e.target.value })} />
                <Veld label="Dosis levothyroxine" type="number" inputMode="numeric" value={labForm.dosis} onChange={(e) => setLabForm({ ...labForm, dosis: e.target.value })} suffix="µg" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {LAB_VELDEN.map((v) => (
                  <Veld
                    key={v.key}
                    label={`${v.label} (ref. ±${v.ref})`}
                    type="text" inputMode="decimal"
                    value={labForm[v.key] || ""}
                    onChange={(e) => setLabForm({ ...labForm, [v.key]: e.target.value })}
                    suffix={v.unit}
                  />
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <Veld label="Notities (bv. dokter wil dosis aanpassen)" type="text" value={labForm.notities} onChange={(e) => setLabForm({ ...labForm, notities: e.target.value })} />
              </div>
              <button
                onClick={bewaarLab}
                style={{
                  width: "100%", marginTop: 16, padding: "13px 0", borderRadius: 12, border: "none",
                  background: C.primary, color: "#fff", fontSize: 15.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Bloedwaarden opslaan
              </button>
            </Kaart>

            {labs.length === 0 ? (
              <p style={{ textAlign: "center", color: C.muted, fontSize: 14 }}>
                Nog geen bloedwaarden ingevoerd. Begin met je meest recente uitslag.
              </p>
            ) : (
              [...labs].reverse().map((l) => (
                <Kaart key={l.datum} titel={new Date(l.datum + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })} sub={l.dosis ? `Dosis: ${l.dosis} µg levothyroxine` : undefined}>
                  <table style={{ width: "100%", fontSize: 13.5, borderCollapse: "collapse" }}>
                    <tbody>
                      {LAB_VELDEN.filter((v) => l[v.key]).map((v) => (
                        <tr key={v.key} style={{ borderBottom: `1px solid ${C.line}` }}>
                          <td style={{ padding: "7px 0", color: C.muted }}>{v.label}</td>
                          <td style={{ padding: "7px 0", fontWeight: 600, textAlign: "right" }}>{l[v.key]} {v.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {l.notities && <p style={{ fontSize: 13, color: C.muted, margin: "10px 0 0" }}>{l.notities}</p>}
                  <button
                    onClick={() => verwijderLab(l.datum)}
                    style={{ marginTop: 10, background: "none", border: "none", color: "#B4543A", fontSize: 12.5, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                  >
                    Verwijderen
                  </button>
                </Kaart>
              ))
            )}
          </>
        ) : tab === "trend" ? (
          <>
            <Kaart titel="Energie, brain fog & stress" sub="Laatste 30 ingevulde dagen. Zoek patronen: dipt je energie na slechte nachten of stressvolle periodes?">
              {trendData.length < 2 ? (
                <p style={{ color: C.muted, fontSize: 14 }}>Vul minstens twee dagen in om een trend te zien.</p>
              ) : (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={trendData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                      <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                      <XAxis dataKey="d" tick={{ fontSize: 11, fill: C.muted }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: C.muted }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="Energie" stroke={C.accent} strokeWidth={2.4} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="Brain fog" stroke={C.primary} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="Stress" stroke={C.gold} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Kaart>

            <Kaart titel="TSH-verloop" sub="De groene band toont een gangbaar referentiegebied (0,4–4,0 mU/L); jouw streefwaarde bepaal je samen met je arts.">
              {tshData.length < 2 ? (
                <p style={{ color: C.muted, fontSize: 14 }}>Voer minstens twee bloedafnames met TSH in om het verloop te zien.</p>
              ) : (
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <LineChart data={tshData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                      <XAxis dataKey="d" tick={{ fontSize: 11, fill: C.muted }} />
                      <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                      <Tooltip />
                      <ReferenceArea y1={0.4} y2={4.0} fill={C.primarySoft} fillOpacity={0.6} />
                      <Line type="monotone" dataKey="TSH" stroke={C.primary} strokeWidth={2.6} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Kaart>

            {symptoomData.length > 0 && (
              <Kaart titel="Meest voorkomende symptomen" sub={`Aantal dagen per symptoom, gemeten over de laatste ${dagen30.length} ingevulde dagen.`}>
                <div style={{ width: "100%", height: 46 + symptoomData.length * 34 }}>
                  <ResponsiveContainer>
                    <BarChart data={symptoomData} layout="vertical" margin={{ top: 0, right: 26, left: 4, bottom: 0 }}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: C.muted }} />
                      <YAxis type="category" dataKey="naam" width={150} tick={{ fontSize: 11.5, fill: C.ink }} />
                      <Tooltip />
                      <Bar dataKey="dagen" fill={C.accent} radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Kaart>
            )}

            <p style={{ fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.5, padding: "0 10px" }}>
              Dit dagboek vervangt geen medisch advies. Neem je gegevens mee naar je arts of endocrinoloog — een goed bijgehouden dagboek maakt consultaties een stuk waardevoller.
            </p>
          </>
        ) : (
          <>
            <Kaart
              titel="Rapport voor je arts (PDF)"
              sub="Een overzichtelijk document met je gemiddelden, energieverloop, meest voorkomende symptomen en alle bloedwaarden — ideaal om mee te nemen naar een consultatie."
            >
              <button
                onClick={maakPdf}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                  background: C.accent, color: "#fff", fontSize: 15.5, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Download PDF-rapport
              </button>
            </Kaart>

            <Kaart
              titel="Back-up maken"
              sub="Je gegevens staan alleen op dit toestel. Download regelmatig een back-upbestand en bewaar het op een veilige plek (bv. je e-mail aan jezelf of een cloudmap)."
            >
              <button
                onClick={exporteer}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                  background: C.primary, color: "#fff", fontSize: 15.5, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Download back-up ({Object.keys(entries).length} dagen · {labs.length} bloedafnames)
              </button>
            </Kaart>

            <Kaart
              titel="Back-up terugzetten"
              sub="Nieuwe telefoon of gegevens kwijt? Kies hier je back-upbestand. Bestaande invoer blijft staan; de back-up vult alleen aan."
            >
              <label
                style={{
                  display: "block", textAlign: "center", padding: "13px 0", borderRadius: 12,
                  border: `1.5px dashed ${C.primary}`, color: C.primary, fontSize: 15,
                  fontWeight: 700, cursor: "pointer", background: C.primarySoft,
                }}
              >
                Kies back-upbestand…
                <input type="file" accept="application/json,.json" onChange={importeer} style={{ display: "none" }} />
              </label>
            </Kaart>

            <p style={{ fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.5, padding: "0 10px" }}>
              Privacy: je dagboek wordt nergens naartoe gestuurd. Alles blijft in de browser van dit toestel; alleen jij kunt het bestand downloaden of delen.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
