export function ThemeScript() {
  const code = `
    (function () {
      try {
        var raw = window.localStorage.getItem('jdw_pixel_theme_v2');
        if (!raw) return;
        var theme = JSON.parse(raw);
        var root = document.documentElement;
        if (theme.bg) root.style.setProperty('--bg', theme.bg);
        if (theme.ink) root.style.setProperty('--ink', theme.ink);
        if (theme.paper) {
          root.style.setProperty('--paper', theme.paper);
          root.style.setProperty('--paper-2', theme.paper);
          root.style.setProperty('--accent-soft', theme.paper);
        }
        if (theme.accent) {
          root.style.setProperty('--accent', theme.accent);
          root.style.setProperty('--done', theme.accent);
        }
        if (theme.bg) root.style.setProperty('--wash', theme.bg);
        if (theme.ink) root.style.setProperty('--line', theme.ink);
      } catch (error) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
