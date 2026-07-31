import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import {
  Sun, Moon, CircleDot, History, Settings, X, Copy, Trash2, Download,
  ChevronDown, ChevronRight, ChevronLeft, Keyboard, ArrowLeftRight, Ruler, Wallet,
  Percent, HeartPulse, CalendarClock, CalendarDays, Coins, Check, Menu
} from "lucide-react";

/* ============================================================
   FONTS
   ============================================================ */
function useFonts() {
  useEffect(() => {
    if (document.getElementById("sc-fonts")) return;
    const link = document.createElement("link");
    link.id = "sc-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* ============================================================
   THEME TOKENS
   ============================================================ */
/* ============================================================
   CUSTOM WALLPAPER
   Put an image file in your project's `public/` folder (e.g. public/wallpaper.jpg)
   and set the path below, e.g. "/wallpaper.jpg". Leave it "" for no wallpaper
   (just the flat theme background).
   ============================================================ */
const WALLPAPER_URL = "cat_calculator_theme.png";

const THEMES = {
  light: {
    name: "Light",
    "--bg": "#F6E2DB",
    "--bg-grad": "none",
    "--panel": "#3B57F5",
    "--panel-strong": "#FDF3EC",
    "--panel-border": "#14183D",
    "--text": "#14183D",
    "--text-muted": "#5A5F86",
    "--text-faint": "#9098C0",
    "--text-on-card": "#FDF3EC",
    "--text-on-card-muted": "rgba(253,243,236,0.88)",
    "--key-bg": "#FDF3EC",
    "--key-bg-hover": "#FFFFFF",
    "--key-border": "#14183D",
    "--op-bg": "#14183D",
    "--op-text": "#FDF3EC",
    "--shadow": "6px 6px 0px var(--panel-border)",
    "--shadow-sm": "4px 4px 0px var(--panel-border)",
    "--accent": "#3B57F5",
    "--accent-2": "#14183D",
    "--accent-text": "#FDF3EC",
    scheme: "light",
  },
  dark: {
    name: "Dark",
    "--bg": "#14183D",
    "--bg-grad": "none",
    "--panel": "#3B57F5",
    "--panel-strong": "#1B2050",
    "--panel-border": "#FDF3EC",
    "--text": "#FDF3EC",
    "--text-muted": "rgba(253,243,236,0.65)",
    "--text-faint": "rgba(253,243,236,0.4)",
    "--text-on-card": "#FDF3EC",
    "--text-on-card-muted": "rgba(253,243,236,0.88)",
    "--key-bg": "#1B2050",
    "--key-bg-hover": "#262C66",
    "--key-border": "#FDF3EC",
    "--op-bg": "#FDF3EC",
    "--op-text": "#14183D",
    "--shadow": "6px 6px 0px var(--panel-border)",
    "--shadow-sm": "4px 4px 0px var(--panel-border)",
    "--accent": "#7C90FF",
    "--accent-2": "#FDF3EC",
    "--accent-text": "#14183D",
    scheme: "dark",
  },
  amoled: {
    name: "AMOLED",
    "--bg": "#000000",
    "--bg-grad": "none",
    "--panel": "#3B57F5",
    "--panel-strong": "#0D0F22",
    "--panel-border": "#FDF3EC",
    "--text": "#FDF3EC",
    "--text-muted": "rgba(253,243,236,0.6)",
    "--text-faint": "rgba(253,243,236,0.35)",
    "--text-on-card": "#FDF3EC",
    "--text-on-card-muted": "rgba(253,243,236,0.88)",
    "--key-bg": "#0D0F22",
    "--key-bg-hover": "#181B33",
    "--key-border": "#FDF3EC",
    "--op-bg": "#FDF3EC",
    "--op-text": "#000000",
    "--shadow": "6px 6px 0px var(--panel-border)",
    "--shadow-sm": "4px 4px 0px var(--panel-border)",
    "--accent": "#7C90FF",
    "--accent-2": "#FDF3EC",
    "--accent-text": "#000000",
    scheme: "dark",
  },
};

const ThemeCtx = createContext(null);
const useTheme = () => useContext(ThemeCtx);

/* ============================================================
   SAFE MATH PARSER (no eval)
   ============================================================ */
const FUNCS = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "log", "ln", "sqrt", "cbrt", "abs"]);
const CONSTS = { pi: Math.PI, "π": Math.PI, e: Math.E };

function tokenize(src) {
  const s = src.replace(/\u00d7/g, "*").replace(/\u00f7/g, "/").replace(/\u2212/g, "-");
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      tokens.push({ t: "num", v: parseFloat(s.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[a-zA-Zπ]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const word = s.slice(i, j) || c;
      const w = c === "π" ? "π" : word;
      if (c === "π") { tokens.push({ t: "const", v: "π" }); i++; continue; }
      if (FUNCS.has(w)) tokens.push({ t: "func", v: w });
      else if (w in CONSTS) tokens.push({ t: "const", v: w });
      else throw new Error("Unknown token: " + w);
      i = j;
      continue;
    }
    if ("+-*/%^(),!".includes(c)) {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new Error("Unexpected character: " + c);
  }
  // insert implicit multiplication
  const out = [];
  for (let k = 0; k < tokens.length; k++) {
    const cur = tokens[k];
    const prev = out[out.length - 1];
    if (prev) {
      const prevClosesValue =
        prev.t === "num" || prev.t === "const" || (prev.t === "op" && (prev.v === ")" || prev.v === "!"));
      const curOpensValue =
        cur.t === "num" || cur.t === "const" || cur.t === "func" || (cur.t === "op" && cur.v === "(");
      if (prevClosesValue && curOpensValue) out.push({ t: "op", v: "*" });
    }
    out.push(cur);
  }
  return out;
}

function parseExpr(tokens, angleMode) {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (v) => {
    const tok = tokens[pos];
    if (!tok || (v && tok.v !== v)) throw new Error("Unexpected expression");
    pos++;
    return tok;
  };

  function parseAdd() {
    let left = parseMul();
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = eat().v;
      const right = parseMul();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }
  function parseMul() {
    let left = parsePow();
    while (peek() && peek().t === "op" && (peek().v === "*" || peek().v === "/" || peek().v === "%")) {
      const op = eat().v;
      const right = parsePow();
      if (op === "*") left = left * right;
      else if (op === "/") left = left / right;
      else left = left % right;
    }
    return left;
  }
  function parsePow() {
    const base = parseUnary();
    if (peek() && peek().t === "op" && peek().v === "^") {
      eat();
      const exp = parsePow();
      return Math.pow(base, exp);
    }
    return base;
  }
  function parseUnary() {
    if (peek() && peek().t === "op" && (peek().v === "-" || peek().v === "+")) {
      const op = eat().v;
      const val = parseUnary();
      return op === "-" ? -val : val;
    }
    return parsePostfix();
  }
  function parsePostfix() {
    let val = parsePrimary();
    while (peek() && peek().t === "op" && peek().v === "!") {
      eat();
      if (val < 0 || !Number.isInteger(val)) throw new Error("Factorial needs a non-negative integer");
      let r = 1;
      for (let k = 2; k <= val; k++) r *= k;
      val = r;
    }
    return val;
  }
  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new Error("Unexpected end of expression");
    if (tok.t === "num") { eat(); return tok.v; }
    if (tok.t === "const") { eat(); return CONSTS[tok.v]; }
    if (tok.t === "func") {
      eat();
      eat("(");
      const arg = parseAdd();
      eat(")");
      return applyFunc(tok.v, arg, angleMode);
    }
    if (tok.t === "op" && tok.v === "(") {
      eat();
      const val = parseAdd();
      eat(")");
      return val;
    }
    throw new Error("Unexpected token");
  }

  const result = parseAdd();
  if (pos !== tokens.length) throw new Error("Unexpected trailing input");
  return result;
}

function applyFunc(name, arg, angleMode) {
  const toRad = (x) => (angleMode === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x) => (angleMode === "deg" ? (x * 180) / Math.PI : x);
  switch (name) {
    case "sin": return Math.sin(toRad(arg));
    case "cos": return Math.cos(toRad(arg));
    case "tan": return Math.tan(toRad(arg));
    case "asin": return fromRad(Math.asin(arg));
    case "acos": return fromRad(Math.acos(arg));
    case "atan": return fromRad(Math.atan(arg));
    case "log": return Math.log10(arg);
    case "ln": return Math.log(arg);
    case "sqrt": return Math.sqrt(arg);
    case "cbrt": return Math.cbrt(arg);
    case "abs": return Math.abs(arg);
    default: throw new Error("Unknown function");
  }
}

function safeEvaluate(expr, angleMode) {
  if (!expr || !expr.trim()) return null;
  const tokens = tokenize(expr);
  const result = parseExpr(tokens, angleMode);
  if (!Number.isFinite(result)) throw new Error("Math error");
  return result;
}

function formatResult(n) {
  if (n === null || n === undefined) return "";
  if (!Number.isFinite(n)) return "Error";
  const rounded = parseFloat(n.toPrecision(12));
  if (Math.abs(rounded) >= 1e12 || (Math.abs(rounded) < 1e-9 && rounded !== 0)) {
    return rounded.toExponential(6).replace(/e\+?/, "e");
  }
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 10 });
}

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
function Panel({ className = "", strong = false, style = {}, children }) {
  return (
    <div
      className={`sc-panel ${className}`}
      style={{
        background: strong ? "var(--panel-strong)" : "var(--panel)",
        border: "3px solid var(--panel-border)",
        borderRadius: 28,
        boxShadow: "var(--shadow)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function IconButton({ onClick, title, active, onCard, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="sc-iconbtn sc-press"
      style={{
        width: 40,
        height: 40,
        display: "grid",
        placeItems: "center",
        borderRadius: 14,
        border: "2.5px solid var(--panel-border)",
        background: active ? "var(--accent)" : onCard ? "var(--panel-strong)" : "var(--key-bg)",
        color: active ? "var(--accent-text)" : "var(--text)",
        cursor: "pointer",
        boxShadow: "3px 3px 0px var(--panel-border)",
      }}
    >
      {children}
    </button>
  );
}

/* ============================================================
   DISPLAY
   ============================================================ */
function Display({ expr, result, angleMode, memoryActive, pulseKey }) {
  return (
    <div style={{ padding: "22px 24px 6px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        {memoryActive && <span style={badgeStyle}>M</span>}
        <span style={badgeStyle}>{angleMode.toUpperCase()}</span>
      </div>
      <div
        style={{
          background: "var(--panel-strong)",
          border: "3px solid var(--panel-border)",
          borderRadius: 24,
          boxShadow: "var(--shadow-sm)",
          padding: "26px 26px 22px",
          minHeight: 128,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
            color: "var(--text-muted)",
            fontSize: 17,
            minHeight: 26,
            textAlign: "right",
            overflowX: "auto",
            whiteSpace: "nowrap",
            letterSpacing: 0.2,
          }}
        >
          {expr || " "}
        </div>
        <div
          key={pulseKey}
          className="sc-result"
          style={{
            fontFamily: "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            fontSize: "clamp(48px, 9vw, 80px)",
            textAlign: "right",
            color: "var(--text)",
            lineHeight: 1.1,
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {result === "" ? "0" : result}
        </div>
      </div>
    </div>
  );
}
const badgeStyle = {
  fontSize: 11,
  fontFamily: "Inter, sans-serif",
  fontWeight: 700,
  color: "var(--text)",
  background: "var(--panel-strong)",
  border: "2px solid var(--panel-border)",
  padding: "3px 9px",
  borderRadius: 999,
  letterSpacing: 0.4,
};

/* ============================================================
   KEYPAD
   ============================================================ */
function Key({ label, onClick, kind = "num", flex = 1, sub }) {
  const bg =
    kind === "equals" ? "var(--accent)" : kind === "op" ? "var(--op-bg)" : "var(--key-bg)";
  const color = kind === "equals" ? "var(--accent-text)" : kind === "op" ? "var(--op-text)" : "var(--text)";
  return (
    <button
      onClick={onClick}
      className="sc-key sc-press"
      style={{
        flex,
        height: 74,
        borderRadius: 16,
        border: "2.5px solid var(--panel-border)",
        background: bg,
        color,
        fontFamily: "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
        fontSize: kind === "fn" ? 16 : 25,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "4px 4px 0px var(--panel-border)",
        position: "relative",
      }}
    >
      {label}
      {sub && <span style={{ position: "absolute", top: 4, right: 8, fontSize: 9, color: "var(--text-faint)" }}>{sub}</span>}
    </button>
  );
}

function Keypad({ dispatch }) {
  const row = (children) => <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>{children}</div>;
  return (
    <div style={{ padding: "0 24px 26px" }}>
      {row([
        <Key key="ac" label="AC" kind="fn" onClick={() => dispatch({ type: "clear" })} />,
        <Key key="bksp" label="⌫" kind="fn" onClick={() => dispatch({ type: "backspace" })} />,
        <Key key="pct" label="%" kind="op" onClick={() => dispatch({ type: "char", v: "%" })} />,
        <Key key="div" label="÷" kind="op" onClick={() => dispatch({ type: "char", v: "/" })} />,
      ])}
      {row([
        <Key key="7" label="7" onClick={() => dispatch({ type: "char", v: "7" })} />,
        <Key key="8" label="8" onClick={() => dispatch({ type: "char", v: "8" })} />,
        <Key key="9" label="9" onClick={() => dispatch({ type: "char", v: "9" })} />,
        <Key key="mul" label="×" kind="op" onClick={() => dispatch({ type: "char", v: "*" })} />,
      ])}
      {row([
        <Key key="4" label="4" onClick={() => dispatch({ type: "char", v: "4" })} />,
        <Key key="5" label="5" onClick={() => dispatch({ type: "char", v: "5" })} />,
        <Key key="6" label="6" onClick={() => dispatch({ type: "char", v: "6" })} />,
        <Key key="sub" label="−" kind="op" onClick={() => dispatch({ type: "char", v: "-" })} />,
      ])}
      {row([
        <Key key="1" label="1" onClick={() => dispatch({ type: "char", v: "1" })} />,
        <Key key="2" label="2" onClick={() => dispatch({ type: "char", v: "2" })} />,
        <Key key="3" label="3" onClick={() => dispatch({ type: "char", v: "3" })} />,
        <Key key="add" label="+" kind="op" onClick={() => dispatch({ type: "char", v: "+" })} />,
      ])}
      {row([
        <Key key="sign" label="±" kind="fn" onClick={() => dispatch({ type: "negate" })} />,
        <Key key="0" label="0" onClick={() => dispatch({ type: "char", v: "0" })} />,
        <Key key="dot" label="." onClick={() => dispatch({ type: "char", v: "." })} />,
        <Key key="eq" label="=" kind="equals" onClick={() => dispatch({ type: "equals" })} />,
      ])}
    </div>
  );
}

function ScientificPad({ dispatch, angleMode, setAngleMode }) {
  const row = (children) => <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>{children}</div>;
  return (
    <div style={{ padding: "4px 20px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, letterSpacing: 0.5 }}>SCIENTIFIC</span>
        <div style={{ display: "flex", gap: 6, background: "var(--key-bg)", border: "2.5px solid var(--panel-border)", borderRadius: 999, padding: 3 }}>
          {["deg", "rad"].map((m) => (
            <button
              key={m}
              onClick={() => setAngleMode(m)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 11px",
                borderRadius: 999,
                border: "none",
                background: angleMode === m ? "var(--accent-2)" : "transparent",
                color: angleMode === m ? "var(--panel-strong)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {row([
        <Key key="sin" label="sin" kind="fn" onClick={() => dispatch({ type: "func", v: "sin(" })} />,
        <Key key="cos" label="cos" kind="fn" onClick={() => dispatch({ type: "func", v: "cos(" })} />,
        <Key key="tan" label="tan" kind="fn" onClick={() => dispatch({ type: "func", v: "tan(" })} />,
        <Key key="fact" label="n!" kind="fn" onClick={() => dispatch({ type: "char", v: "!" })} />,
      ])}
      {row([
        <Key key="log" label="log" kind="fn" onClick={() => dispatch({ type: "func", v: "log(" })} />,
        <Key key="ln" label="ln" kind="fn" onClick={() => dispatch({ type: "func", v: "ln(" })} />,
        <Key key="sqrt" label="√x" kind="fn" onClick={() => dispatch({ type: "func", v: "sqrt(" })} />,
        <Key key="pow" label="x^y" kind="fn" onClick={() => dispatch({ type: "char", v: "^" })} />,
      ])}
      {row([
        <Key key="pi" label="π" kind="fn" onClick={() => dispatch({ type: "char", v: "π" })} />,
        <Key key="e" label="e" kind="fn" onClick={() => dispatch({ type: "char", v: "e" })} />,
        <Key key="lp" label="(" kind="fn" onClick={() => dispatch({ type: "char", v: "(" })} />,
        <Key key="rp" label=")" kind="fn" onClick={() => dispatch({ type: "char", v: ")" })} />,
      ])}
      {row([
        <Key key="mc" label="MC" kind="fn" onClick={() => dispatch({ type: "mem", v: "MC" })} />,
        <Key key="mr" label="MR" kind="fn" onClick={() => dispatch({ type: "mem", v: "MR" })} />,
        <Key key="mminus" label="M−" kind="fn" onClick={() => dispatch({ type: "mem", v: "M-" })} />,
        <Key key="mplus" label="M+" kind="fn" onClick={() => dispatch({ type: "mem", v: "M+" })} />,
      ])}
    </div>
  );
}

/* ============================================================
   CALCULATOR STATE / LOGIC (custom hook)
   ============================================================ */
function useCalculator(pushHistory) {
  const [expr, setExpr] = useState("");
  const [liveResult, setLiveResult] = useState("");
  const [angleMode, setAngleMode] = useState("deg");
  const [memory, setMemory] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const r = safeEvaluate(expr, angleMode);
      setLiveResult(r === null ? "" : formatResult(r));
      setError(false);
    } catch {
      setLiveResult(expr ? "..." : "");
    }
  }, [expr, angleMode]);

  const dispatch = useCallback(
    (action) => {
      switch (action.type) {
        case "char":
          setExpr((e) => e + action.v);
          break;
        case "func":
          setExpr((e) => e + action.v);
          break;
        case "backspace":
          setExpr((e) => e.slice(0, -1));
          break;
        case "clear":
          setExpr("");
          setLiveResult("");
          setError(false);
          break;
        case "negate":
          setExpr((e) => (e && !isNaN(e) ? String(parseFloat(e) * -1) : e ? `-(${e})` : "-"));
          break;
        case "mem": {
          let current = 0;
          try {
            current = safeEvaluate(expr || liveResult, angleMode) ?? 0;
          } catch {
            current = 0;
          }
          if (action.v === "MC") setMemory(0);
          if (action.v === "MR") setExpr((e) => e + String(memory));
          if (action.v === "M+") setMemory((m) => m + (parseFloat(liveResult.replace(/,/g, "")) || 0));
          if (action.v === "M-") setMemory((m) => m - (parseFloat(liveResult.replace(/,/g, "")) || 0));
          break;
        }
        case "equals": {
          try {
            const r = safeEvaluate(expr, angleMode);
            if (r === null) return;
            const formatted = formatResult(r);
            pushHistory && pushHistory(expr, formatted);
            setExpr(formatted.replace(/,/g, ""));
            setLiveResult(formatted);
            setPulseKey((k) => k + 1);
            setError(false);
          } catch {
            setError(true);
            setLiveResult("Error");
          }
          break;
        }
        default:
          break;
      }
    },
    [expr, liveResult, memory, angleMode, pushHistory]
  );

  return { expr, liveResult, angleMode, setAngleMode, memory, dispatch, pulseKey, error };
}

/* ============================================================
   HISTORY SIDEBAR
   ============================================================ */
function HistoryPanel({ history, onReuse, onClear, onClose, floating, showClose }) {
  const exportHistory = () => {
    const text = history.map((h) => `${h.expr} = ${h.result}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calculation-history.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel
      className="sc-history"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 18,
        ...(floating ? { position: "absolute", inset: 0, zIndex: 30 } : {}),
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <History size={17} color="var(--accent)" />
          <span style={{ fontWeight: 700, fontSize: 15 }}>History</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <IconButton title="Export as text" onClick={exportHistory}><Download size={15} /></IconButton>
          <IconButton title="Clear history" onClick={onClear}><Trash2 size={15} /></IconButton>
          {(floating || showClose) && <IconButton title="Close" onClick={onClose}><X size={15} /></IconButton>}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {history.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", marginTop: 40, fontSize: 13 }}>
            Nothing calculated yet.
            <br />
            Your history will appear here.
          </div>
        )}
        {history.map((h) => (
          <button
            key={h.id}
            onClick={() => onReuse(h)}
            className="sc-history-item sc-press"
            style={{
              textAlign: "right",
              background: "var(--key-bg)",
              border: "2.5px solid var(--panel-border)",
              borderRadius: 16,
              padding: "10px 12px",
              cursor: "pointer",
              boxShadow: "3px 3px 0px var(--panel-border)",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" }}>{h.expr}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" }}>{h.result}</div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

/* ============================================================
   CONVERTER PANEL
   ============================================================ */
const UNIT_GROUPS = {
  Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
  Weight: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.0283495231, ton: 1000 },
  Volume: { l: 1, ml: 0.001, gal: 3.785411784, qt: 0.946352946, cup: 0.2365882365 },
};

function UnitConverter() {
  const [group, setGroup] = useState("Length");
  const units = Object.keys(UNIT_GROUPS[group]);
  const [from, setFrom] = useState(units[0]);
  const [to, setTo] = useState(units[1]);
  const [value, setValue] = useState("1");

  useEffect(() => {
    const u = Object.keys(UNIT_GROUPS[group]);
    setFrom(u[0]);
    setTo(u[1]);
  }, [group]);

  const converted = useMemo(() => {
    const v = parseFloat(value);
    if (isNaN(v)) return "";
    if (group === "Temperature") return "";
    const table = UNIT_GROUPS[group];
    const meters = v * table[from];
    return formatResult(meters / table[to]);
  }, [value, from, to, group]);

  return (
    <div>
      <SelectRow label="Category" value={group} onChange={setGroup} options={Object.keys(UNIT_GROUPS).concat(["Temperature"])} />
      {group === "Temperature" ? <TempConverter /> : (
        <>
          <FieldRow label="Amount" value={value} onChange={setValue} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <SelectRow label="From" value={from} onChange={setFrom} options={units} half />
            <SelectRow label="To" value={to} onChange={setTo} options={units} half />
          </div>
          <ResultBox label={`${value || 0} ${from} =`} value={`${converted} ${to}`} />
        </>
      )}
    </div>
  );
}

function TempConverter() {
  const [value, setValue] = useState("0");
  const [from, setFrom] = useState("C");
  const v = parseFloat(value) || 0;
  const toC = from === "C" ? v : from === "F" ? ((v - 32) * 5) / 9 : v - 273.15;
  const c = formatResult(toC), f = formatResult((toC * 9) / 5 + 32), k = formatResult(toC + 273.15);
  return (
    <div>
      <FieldRow label="Amount" value={value} onChange={setValue} />
      <SelectRow label="Input unit" value={from} onChange={setFrom} options={["C", "F", "K"]} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <ResultBox small label="Celsius" value={`${c}°C`} />
        <ResultBox small label="Fahrenheit" value={`${f}°F`} />
        <ResultBox small label="Kelvin" value={`${k}K`} />
      </div>
    </div>
  );
}

const DEMO_RATES = { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.9, JPY: 156.4, AUD: 1.51, CAD: 1.36 };
function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const result = useMemo(() => {
    const v = parseFloat(amount);
    if (isNaN(v)) return "";
    const usd = v / DEMO_RATES[from];
    return formatResult(usd * DEMO_RATES[to]);
  }, [amount, from, to]);
  return (
    <div>
      <FieldRow label="Amount" value={amount} onChange={setAmount} />
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <SelectRow label="From" value={from} onChange={setFrom} options={Object.keys(DEMO_RATES)} half />
        <SelectRow label="To" value={to} onChange={setTo} options={Object.keys(DEMO_RATES)} half />
      </div>
      <ResultBox label={`${amount || 0} ${from} =`} value={`${result} ${to}`} />
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8, lineHeight: 1.5 }}>
        Using cached offline reference rates. Connect a live exchange-rate API for real-time pricing.
      </div>
    </div>
  );
}

function GSTCalculator() {
  const [amount, setAmount] = useState("1000");
  const [rate, setRate] = useState("18");
  const [mode, setMode] = useState("exclusive");
  const a = parseFloat(amount) || 0, r = parseFloat(rate) || 0;
  const gst = mode === "exclusive" ? (a * r) / 100 : a - a / (1 + r / 100);
  const total = mode === "exclusive" ? a + gst : a;
  const base = mode === "exclusive" ? a : a - gst;
  return (
    <div>
      <FieldRow label="Amount" value={amount} onChange={setAmount} />
      <FieldRow label="GST rate (%)" value={rate} onChange={setRate} />
      <SelectRow label="Amount is" value={mode} onChange={setMode} options={["exclusive", "inclusive"]} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <ResultBox small label="Base" value={formatResult(base)} />
        <ResultBox small label="GST" value={formatResult(gst)} />
        <ResultBox small label="Total" value={formatResult(total)} />
      </div>
    </div>
  );
}

function BMICalculator() {
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("175");
  const w = parseFloat(weight) || 0, h = (parseFloat(height) || 0) / 100;
  const bmi = h > 0 ? w / (h * h) : 0;
  const category = bmi === 0 ? "" : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obese";
  return (
    <div>
      <FieldRow label="Weight (kg)" value={weight} onChange={setWeight} />
      <FieldRow label="Height (cm)" value={height} onChange={setHeight} />
      <ResultBox label="BMI" value={`${formatResult(bmi)}  —  ${category}`} />
    </div>
  );
}

function AgeCalculator() {
  const [dob, setDob] = useState("2000-01-01");
  const result = useMemo(() => {
    const birth = new Date(dob);
    if (isNaN(birth)) return null;
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) { months -= 1; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years -= 1; months += 12; }
    return { years, months, days };
  }, [dob]);
  return (
    <div>
      <DateRow label="Date of birth" value={dob} onChange={setDob} />
      {result && <ResultBox label="Current age" value={`${result.years}y  ${result.months}m  ${result.days}d`} />}
    </div>
  );
}

function DateDiffCalculator() {
  const [d1, setD1] = useState("2026-01-01");
  const [d2, setD2] = useState("2026-07-29");
  const diffDays = useMemo(() => {
    const a = new Date(d1), b = new Date(d2);
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round(Math.abs(b - a) / 86400000);
  }, [d1, d2]);
  return (
    <div>
      <DateRow label="From" value={d1} onChange={setD1} />
      <DateRow label="To" value={d2} onChange={setD2} />
      {diffDays !== null && (
        <ResultBox label="Difference" value={`${diffDays} days  —  ${(diffDays / 7).toFixed(1)} weeks`} />
      )}
    </div>
  );
}

function TipCalculator() {
  const [bill, setBill] = useState("50");
  const [pct, setPct] = useState(15);
  const [split, setSplit] = useState("1");
  const b = parseFloat(bill) || 0;
  const tip = (b * pct) / 100;
  const total = b + tip;
  const per = total / (parseFloat(split) || 1);
  return (
    <div>
      <FieldRow label="Bill amount" value={bill} onChange={setBill} />
      <div style={{ margin: "14px 0 8px", display: "flex", justifyContent: "space-between" }}>
        <label style={fieldLabelOnCard}>TIP: {pct}%</label>
      </div>
      <input
        type="range" min={0} max={30} value={pct} onChange={(e) => setPct(parseInt(e.target.value))}
        className="sc-slider"
        style={{ width: "100%", "--slider-pct": `${(pct / 30) * 100}%` }}
      />
      <FieldRow label="Split between" value={split} onChange={setSplit} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <ResultBox small label="Tip" value={formatResult(tip)} />
        <ResultBox small label="Total" value={formatResult(total)} />
        <ResultBox small label="Per person" value={formatResult(per)} />
      </div>
    </div>
  );
}

/* small form primitives */
const fieldLabel = { fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.4 };
const fieldLabelOnCard = { fontSize: 11.5, fontWeight: 700, color: "var(--text-on-card-muted)", letterSpacing: 0.5 };
function FieldRow({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...fieldLabelOnCard, marginBottom: 6 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        style={inputStyle}
      />
    </div>
  );
}
function DateRow({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...fieldLabelOnCard, marginBottom: 6 }}>{label}</div>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}
function SelectRow({ label, value, onChange, options, half }) {
  return (
    <div style={{ marginBottom: 10, flex: half ? 1 : undefined }}>
      <div style={{ ...fieldLabelOnCard, marginBottom: 6 }}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
function ResultBox({ label, value, small }) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--key-bg)",
        border: "2.5px solid var(--panel-border)",
        borderRadius: 16,
        padding: small ? "10px 12px" : "14px 16px",
        marginTop: small ? 0 : 14,
        boxShadow: "3px 3px 0px var(--panel-border)",
      }}
    >
      <div style={{ ...fieldLabel, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif", fontWeight: 700, fontSize: small ? 17 : 22, color: "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "var(--key-bg)",
  border: "2.5px solid var(--panel-border)",
  borderRadius: 14,
  padding: "10px 13px",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "Inter, sans-serif",
  outline: "none",
  boxShadow: "3px 3px 0px var(--panel-border)",
};

const arrowBtnStyle = {
  flexShrink: 0,
  width: 30,
  height: 30,
  display: "grid",
  placeItems: "center",
  borderRadius: 10,
  border: "2.5px solid var(--panel-border)",
  background: "var(--panel-strong)",
  color: "var(--text)",
  cursor: "pointer",
  boxShadow: "2px 2px 0px var(--panel-border)",
};

const CONVERTER_TABS = [
  { id: "unit", label: "Unit", icon: Ruler, Comp: UnitConverter },
  { id: "currency", label: "Currency", icon: Coins, Comp: CurrencyConverter },
  { id: "gst", label: "GST", icon: Percent, Comp: GSTCalculator },
  { id: "bmi", label: "BMI", icon: HeartPulse, Comp: BMICalculator },
  { id: "age", label: "Age", icon: CalendarClock, Comp: AgeCalculator },
  { id: "date", label: "Date diff", icon: CalendarDays, Comp: DateDiffCalculator },
  { id: "tip", label: "Tip", icon: Wallet, Comp: TipCalculator },
];

function ConverterPanel() {
  const [tab, setTab] = useState("unit");
  const Active = CONVERTER_TABS.find((t) => t.id === tab).Comp;
  const tabsRef = useRef(null);
  const scrollTabs = (dir) => {
    tabsRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  };
  return (
    <div style={{ padding: "4px 20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <button
          onClick={() => scrollTabs(-1)}
          className="sc-press"
          aria-label="Scroll tabs left"
          style={arrowBtnStyle}
        >
          <ChevronLeft size={15} />
        </button>
        <div ref={tabsRef} className="sc-tabs" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, flex: 1 }}>
          {CONVERTER_TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="sc-press"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  padding: "8px 13px",
                  borderRadius: 999,
                  border: "2.5px solid var(--panel-border)",
                  background: isActive ? "var(--accent-2)" : "var(--key-bg)",
                  color: isActive ? "var(--panel-strong)" : "var(--text)",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                  boxShadow: "3px 3px 0px var(--panel-border)",
                }}
              >
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => scrollTabs(1)}
          className="sc-press"
          aria-label="Scroll tabs right"
          style={arrowBtnStyle}
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <div key={tab} className="sc-fade-in">
        <Active />
      </div>
    </div>
  );
}

/* ============================================================
   SETTINGS DRAWER
   ============================================================ */
function SettingsDrawer({ onClose, theme, setTheme }) {
  const shortcuts = [
    ["0–9", "Enter digits"],
    ["+ − * /", "Operators"],
    ["Enter / =", "Calculate result"],
    ["Backspace", "Delete last character"],
    ["Esc", "All clear"],
    ["( )", "Parentheses"],
    ["Ctrl/Cmd + C", "Copy result"],
  ];
  return (
    <div className="sc-overlay" onClick={onClose}>
      <div className="sc-drawer" onClick={(e) => e.stopPropagation()}>
        <Panel style={{ height: "100%", padding: 22, borderRadius: 24, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Settings size={17} color="var(--accent)" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Settings</span>
            </div>
            <IconButton title="Close" onClick={onClose}><X size={15} /></IconButton>
          </div>

          <div style={{ ...fieldLabel, marginBottom: 10 }}>THEME</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className="sc-press"
                style={{
                  flex: 1,
                  padding: "12px 8px",
                  borderRadius: 16,
                  border: "2.5px solid var(--panel-border)",
                  background: theme === key ? "var(--accent-2)" : "var(--key-bg)",
                  color: theme === key ? "var(--panel-strong)" : "var(--text)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "3px 3px 0px var(--panel-border)",
                  fontWeight: 700,
                }}
              >
                {key === "light" ? <Sun size={16} /> : key === "dark" ? <Moon size={16} /> : <CircleDot size={16} />}
                <span style={{ fontSize: 11, fontWeight: 700 }}>{t.name}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, ...fieldLabel, marginBottom: 10 }}>
            <Keyboard size={13} /> KEYBOARD SHORTCUTS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto" }}>
            {shortcuts.map(([k, d]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                <span style={{ color: "var(--text-muted)" }}>{d}</span>
                <span
                  style={{
                    fontFamily: "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
                    background: "var(--key-bg)",
                    border: "2px solid var(--panel-border)",
                    borderRadius: 8,
                    padding: "3px 9px",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {k}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
export default function SmartCalculator() {
  useFonts();
  const [theme, setTheme] = useState("dark");
  const [mode, setMode] = useState("calc"); // 'calc' | 'convert'
  const [sciOpen, setSciOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 900 : true
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 900 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pushHistory = useCallback((expr, result) => {
    setHistory((h) => [{ id: Date.now() + Math.random(), expr, result }, ...h].slice(0, 100));
  }, []);

  const calc = useCalculator(pushHistory);

  const handleReuse = (h) => {
    calc.dispatch({ type: "clear" });
    setTimeout(() => calc.dispatch({ type: "char", v: h.result.replace(/,/g, "") }), 0);
    if (isMobile) setHistoryOpen(false);
  };

  const handleCopy = () => {
    const val = calc.liveResult || "0";
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (settingsOpen) return;
      const target = e.target;
      const tag = target && target.tagName;
      const isFormField =
        tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || (target && target.isContentEditable);
      if (isFormField) return; // don't let typing in converter fields leak into the main calculator
      if (mode !== "calc") return; // only respond to shortcuts while the calculator tab is active
      const k = e.key;
      if (/^[0-9.]$/.test(k)) { calc.dispatch({ type: "char", v: k }); return; }
      if (["+", "-", "*", "/", "%", "^", "(", ")"].includes(k)) { calc.dispatch({ type: "char", v: k }); return; }
      if (k === "Enter" || k === "=") { e.preventDefault(); calc.dispatch({ type: "equals" }); return; }
      if (k === "Backspace") { calc.dispatch({ type: "backspace" }); return; }
      if (k === "Escape") { calc.dispatch({ type: "clear" }); return; }
      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "c") { handleCopy(); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [calc, settingsOpen]);

  const themeVars = THEMES[theme];

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      <div
        className="sc-root"
        style={{
          ...themeVars,
          minHeight: "100vh",
          width: "100%",
          backgroundColor: "var(--bg)",
          backgroundImage: WALLPAPER_URL ? `url("${WALLPAPER_URL}")` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: isMobile ? "scroll" : "fixed",
          backgroundRepeat: "no-repeat",
          color: "var(--text)",
          fontFamily: "Inter, sans-serif",
          padding: isMobile ? "16px 12px 90px" : "40px 28px",
          position: "relative",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
        data-scheme={themeVars.scheme}
      >
        <style>{CSS}</style>

        {/* dims the wallpaper so panels/text stay legible; harmless no-op when there's no wallpaper */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--bg)",
            opacity: WALLPAPER_URL ? 0.55 : 1,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, maxWidth: 1320, width: "100%", margin: "0 auto 18px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: "var(--accent)",
                border: "2.5px solid var(--panel-border)",
                boxShadow: "3px 3px 0px var(--panel-border)",
                display: "grid", placeItems: "center", color: "var(--accent-text)", fontWeight: 800, fontFamily: "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
              }}
            >
              =
            </div>
            <span style={{ fontFamily: "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif", fontWeight: 700, fontSize: 17 }}>Smart Calculator</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <IconButton
              title={isMobile ? "History" : historyOpen ? "Hide history" : "Show history"}
              active={!isMobile && historyOpen}
              onClick={() => setHistoryOpen((o) => (isMobile ? true : !o))}
            >
              <History size={16} />
            </IconButton>
            <IconButton title="Settings" onClick={() => setSettingsOpen(true)}><Settings size={16} /></IconButton>
          </div>
        </div>

        {/* body */}
        <div
          style={{
            display: "flex",
            gap: 20,
            maxWidth: 1320,
            width: "100%",
            margin: "0 auto",
            alignItems: "stretch",
            justifyContent: !isMobile && !historyOpen ? "center" : "flex-start",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Panel style={{ flex: isMobile ? "1 1 auto" : "0 0 580px", overflow: "hidden", width: isMobile ? "100%" : 580, alignSelf: "flex-start" }}>
            {/* segmented mode control */}
            <div style={{ padding: "18px 20px 0" }}>
              <div style={{ display: "flex", background: "var(--panel-strong)", borderRadius: 999, padding: 4, border: "2.5px solid var(--panel-border)" }}>
                {["calc", "convert"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 999,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 12.5,
                      letterSpacing: 0.3,
                      background: mode === m ? "var(--accent-2)" : "transparent",
                      color: mode === m ? "var(--panel-strong)" : "var(--text)",
                      transition: "all .18s ease",
                    }}
                  >
                    {m === "calc" ? "Calculator" : "Converters"}
                  </button>
                ))}
              </div>
            </div>

            {mode === "calc" ? (
              <>
                <Display
                  expr={calc.expr}
                  result={calc.liveResult}
                  angleMode={calc.angleMode}
                  memoryActive={calc.memory !== 0}
                  pulseKey={calc.pulseKey}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 22px 14px" }}>
                  <button onClick={handleCopy} className="sc-press" style={ghostBtn}>
                    {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
                  </button>
                  <button onClick={() => setSciOpen((s) => !s)} className="sc-press" style={ghostBtn}>
                    {sciOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Scientific
                  </button>
                </div>
                {sciOpen && <ScientificPad dispatch={calc.dispatch} angleMode={calc.angleMode} setAngleMode={calc.setAngleMode} />}
                <Keypad dispatch={calc.dispatch} />
              </>
            ) : (
              <ConverterPanel />
            )}
          </Panel>

          {!isMobile && historyOpen && (
            <div style={{ flex: "1 1 auto" }} className="sc-fade-in">
              <HistoryPanel history={history} onReuse={handleReuse} onClear={() => setHistory([])} onClose={() => setHistoryOpen(false)} showClose />
            </div>
          )}
        </div>

        {isMobile && historyOpen && (
          <div className="sc-overlay" onClick={() => setHistoryOpen(false)}>
            <div className="sc-sheet" onClick={(e) => e.stopPropagation()}>
              <HistoryPanel history={history} onReuse={handleReuse} onClear={() => setHistory([])} onClose={() => setHistoryOpen(false)} floating showClose />
            </div>
          </div>
        )}

        {settingsOpen && <SettingsDrawer onClose={() => setSettingsOpen(false)} theme={theme} setTheme={setTheme} />}
      </div>
    </ThemeCtx.Provider>
  );
}

const ghostBtn = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text)",
  background: "var(--panel-strong)",
  border: "2px solid var(--panel-border)",
  borderRadius: 999,
  padding: "6px 12px",
  cursor: "pointer",
  boxShadow: "3px 3px 0px var(--panel-border)",
};

const CSS = `
  .sc-root * { box-sizing: border-box; }
  .sc-press { transition: transform .08s ease, box-shadow .08s ease; }
  .sc-press:active { transform: translate(3px, 3px) !important; box-shadow: 0px 0px 0px var(--panel-border) !important; }
  .sc-key:active { transform: translate(4px, 4px) !important; box-shadow: 0px 0px 0px var(--panel-border) !important; }
  .sc-history-item:hover { background: var(--key-bg-hover) !important; }
  .sc-history-item { transition: background .15s ease, transform .08s ease, box-shadow .08s ease; }
  .sc-history-item:active { transform: translate(3px, 3px); box-shadow: 0px 0px 0px var(--panel-border) !important; }
  .sc-result { animation: sc-pulse .35s ease; }
  @keyframes sc-pulse {
    0% { opacity: 0; transform: translateY(4px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .sc-fade-in { animation: sc-fadein .2s ease; }
  @keyframes sc-fadein { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
  .sc-overlay {
    position: fixed; inset: 0; background: rgba(20,24,61,0.45);
    display: flex; justify-content: flex-end; z-index: 50;
    animation: sc-fadein .18s ease;
  }
  .sc-drawer { width: min(340px, 90vw); height: 100%; padding: 14px; }
  .sc-sheet { width: 100%; max-width: 480px; height: 78vh; align-self: flex-end; padding: 10px; margin: 0 auto; }
  @media (max-width: 520px) {
    .sc-drawer { width: 100%; }
  }
  select { -webkit-appearance: none; appearance: none; }
  input, select { color-scheme: light dark; }

  .sc-tabs { scrollbar-width: thin; scrollbar-color: var(--panel-border) transparent; }
  .sc-tabs::-webkit-scrollbar { height: 6px; }
  .sc-tabs::-webkit-scrollbar-track { background: transparent; }
  .sc-tabs::-webkit-scrollbar-thumb { background: var(--panel-border); border-radius: 999px; }

  .sc-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 10px;
    border-radius: 999px;
    border: 2.5px solid var(--panel-border);
    background: linear-gradient(to right, var(--accent-2) var(--slider-pct, 50%), var(--key-bg) var(--slider-pct, 50%));
    box-shadow: 3px 3px 0px var(--panel-border);
    cursor: pointer;
    outline: none;
  }
  .sc-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent-2);
    border: 2.5px solid var(--panel-border);
    box-shadow: 2px 2px 0px var(--panel-border);
    cursor: pointer;
    margin-top: -0.5px;
  }
  .sc-slider::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent-2);
    border: 2.5px solid var(--panel-border);
    box-shadow: 2px 2px 0px var(--panel-border);
    cursor: pointer;
  }
  .sc-slider::-moz-range-track {
    height: 10px;
    border-radius: 999px;
    background: var(--key-bg);
  }
  .sc-slider::-moz-range-progress {
    height: 10px;
    border-radius: 999px;
    background: var(--accent-2);
  }
`;
