import * as vscode from 'vscode';
import type { DashboardData, FromWebview, Lang, ToWebview } from './shared/types';

/** Sidebar panel with the prayer countdown, today's schedule and the Ramadan countdown. */
export class DashboardProvider implements vscode.WebviewViewProvider {
  static readonly viewId = 'pray.dashboard';
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly getData: () => DashboardData,
    private readonly setLanguage: (lang: Lang) => Thenable<void>
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    const scripts = vscode.Uri.joinPath(this.extensionUri, 'out', 'webview');
    view.webview.options = { enableScripts: true, localResourceRoots: [media, scripts] };
    view.webview.html = this.html(view.webview, media, scripts);

    view.webview.onDidReceiveMessage((msg: FromWebview) => {
      if (msg.type === 'ready' || msg.type === 'refresh') this.refresh();
      else if (msg.type === 'command') vscode.commands.executeCommand(msg.command);
      else if (msg.type === 'setLanguage') void this.setLanguage(msg.lang);
    });
    view.onDidChangeVisibility(() => this.refresh());
    view.onDidDispose(() => (this.view = undefined));
  }

  refresh(): void {
    if (!this.view?.visible) return;
    const msg: ToWebview = { type: 'data', data: this.getData() };
    this.view.webview.postMessage(msg);
  }

  private html(webview: vscode.Webview, media: vscode.Uri, scripts: vscode.Uri): string {
    const css = webview.asWebviewUri(vscode.Uri.joinPath(media, 'dashboard.css'));
    const js = webview.asWebviewUri(vscode.Uri.joinPath(scripts, 'main.js'));
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource}`,
      `script-src ${webview.cspSource}`,
      `img-src ${webview.cspSource} data:`,
    ].join('; ');

    // Static text is filled in by the webview via data-i18n attributes, in the active language.
    return /* html */ `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${css}">
  <title>Pray Reminder</title>
</head>
<body>
  <main class="app">
    <header class="head">
      <div class="loc">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/></svg>
        <span id="loc">—</span>
        <span class="chip" id="method"></span>
        <div class="lang" role="group" aria-label="Language">
          <button data-lang="id">ID</button><button data-lang="en">EN</button>
        </div>
      </div>
      <div class="date" id="date"></div>
      <div class="hijri" id="hijri"></div>
    </header>

    <section class="hero" id="hero" data-phase="dhuhr">
      <div class="hero-sky" aria-hidden="true"></div>
      <div class="hero-badge" id="hero-badge" hidden></div>
      <div class="hero-label"><span data-i18n="wv.towards"></span> <strong id="next-name">—</strong></div>
      <div class="clock" id="countdown">--:--:--</div>
      <div class="hero-sub" id="next-at"></div>
      <div class="bar"><span id="hero-bar"></span></div>
      <div class="hero-foot"><span id="prev-name"></span><span id="next-short"></span></div>
    </section>

    <section class="card">
      <h2 data-i18n="wv.today"></h2>
      <ol class="list" id="list"></ol>
    </section>

    <section class="ramadan" id="ramadan" hidden></section>

    <footer class="actions">
      <button data-command="pray.setLocation" data-i18n="wv.setLocation"></button>
      <button data-command="pray.testReminder" data-i18n="wv.testReminder"></button>
      <button data-command="pray.toggleSound" class="ghost" id="sound-btn"></button>
      <button data-command="pray.openSettings" class="ghost" data-i18n-title="wv.settings">⚙</button>
    </footer>
  </main>
  <script type="module" src="${js}"></script>
</body>
</html>`;
  }
}
