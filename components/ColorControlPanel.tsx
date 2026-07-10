"use client";

import { useEffect, useState } from "react";

type Theme = {
  bg: string;
  ink: string;
  paper: string;
  accent: string;
};

const DEFAULT_THEME: Theme = {
  bg: "#000000",
  ink: "#000000",
  paper: "#ffffff",
  accent: "#eb5160",
};

const PRESETS: { label: string; theme: Theme }[] = [
  { label: "Mono", theme: DEFAULT_THEME },
  {
    label: "Red",
    theme: {
      bg: "#000000",
      ink: "#000000",
      paper: "#ffffff",
      accent: "#eb5160",
    },
  },
  {
    label: "Blue",
    theme: {
      bg: "#000000",
      ink: "#000000",
      paper: "#ffffff",
      accent: "#3b82f6",
    },
  },
  {
    label: "Green",
    theme: {
      bg: "#000000",
      ink: "#000000",
      paper: "#ffffff",
      accent: "#22c55e",
    },
  },
];

const STORAGE_KEY = "jdw_pixel_theme_v1";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--ink", theme.ink);
  root.style.setProperty("--paper", theme.paper);
  root.style.setProperty("--paper-2", theme.paper);
  root.style.setProperty("--wash", theme.bg);
  root.style.setProperty("--line", theme.ink);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-soft", theme.paper);
  root.style.setProperty("--done", theme.accent);
  root.style.setProperty("--done-soft", theme.paper);
}

function safeTheme(value: string | null): Theme | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<Theme>;
    if (!parsed.bg || !parsed.ink || !parsed.paper || !parsed.accent)
      return null;
    return {
      bg: parsed.bg,
      ink: parsed.ink,
      paper: parsed.paper,
      accent: parsed.accent,
    };
  } catch {
    return null;
  }
}

export function ColorControlPanel() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const saved = safeTheme(window.localStorage.getItem(STORAGE_KEY));
    const initial = saved || DEFAULT_THEME;
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function updateTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function resetTheme() {
    updateTheme(DEFAULT_THEME);
  }

  return (
    <div className="theme-control-wrap">
      <button
        type="button"
        className="nav-chip focus-ring"
        onClick={() => setOpen((current) => !current)}
      >
        Colour
      </button>
      {open ? (
        <div className="theme-control-panel animate-pop">
          <div className="flex items-center justify-between gap-3 border-b-3 border-black pb-3">
            <div>
              <p className="pixel-label">Colour panel</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.08em]">
                High contrast by default
              </p>
            </div>
            <button
              type="button"
              className="mini-button"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="mini-button"
                onClick={() => updateTheme(preset.theme)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="theme-colour-row">
              <span>Background</span>
              <input
                type="color"
                value={theme.bg}
                onChange={(event) =>
                  updateTheme({ ...theme, bg: event.target.value })
                }
              />
            </label>
            <label className="theme-colour-row">
              <span>Text / Lines</span>
              <input
                type="color"
                value={theme.ink}
                onChange={(event) =>
                  updateTheme({ ...theme, ink: event.target.value })
                }
              />
            </label>
            <label className="theme-colour-row">
              <span>Panels</span>
              <input
                type="color"
                value={theme.paper}
                onChange={(event) =>
                  updateTheme({ ...theme, paper: event.target.value })
                }
              />
            </label>
            <label className="theme-colour-row">
              <span>Accent</span>
              <input
                type="color"
                value={theme.accent}
                onChange={(event) =>
                  updateTheme({ ...theme, accent: event.target.value })
                }
              />
            </label>
          </div>

          <button
            type="button"
            className="pixel-button mt-4 w-full text-xs"
            onClick={resetTheme}
          >
            Reset to black / white / salmon
          </button>
        </div>
      ) : null}
    </div>
  );
}
