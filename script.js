/* ════════════════════════════════════════════════════════
   DESIGN TOKENS
════════════════════════════════════════════════════════ */
:root {
  --bg:          #07090e;
  --surface:     #0c0f17;
  --surface-2:   #111520;
  --surface-3:   #181d2a;
  --border:      #1c2133;
  --border-soft: rgba(255,255,255,0.05);

  --accent:      #00e5ff;
  --accent-dim:  rgba(0,229,255,0.12);
  --accent-glow: rgba(0,229,255,0.25);
  --green:       #00e096;
  --green-dim:   rgba(0,224,150,0.12);
  --red:         #ff3d71;
  --red-dim:     rgba(255,61,113,0.12);
  --yellow:      #ffe566;
  --yellow-dim:  rgba(255,229,102,0.1);

  --text:        #eef0f6;
  --text-2:      #8892aa;
  --text-3:      #4a5266;

  --radius-sm:   6px;
  --radius:      12px;
  --radius-lg:   18px;

  --font-display: 'Syne', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  --transition: 0.22s cubic-bezier(0.4,0,0.2,1);
}

/* ════════════════════════════════════════════════════════
   RESET & BASE
════════════════════════════════════════════════════════ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-display);
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ════════════════════════════════════════════════════════
   BACKGROUND DECORATIONS
════════════════════════════════════════════════════════ */
.bg-grid {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
  z-index: 0;
}

.bg-orb {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  filter: blur(100px);
  opacity: 0.6;
}
.bg-orb--tl {
  width: 700px; height: 700px;
  background: radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%);
  top: -200px; left: -200px;
}
.bg-orb--br {
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(255,61,113,0.07) 0%, transparent 70%);
  bottom: -150px; right: -150px;
}

/* ════════════════════════════════════════════════════════
   APP WRAPPER
════════════════════════════════════════════════════════ */
.app {
  position: relative;
  z-index: 1;
  max-width: 1040px;
  margin: 0 auto;
  padding: 52px 24px 96px;
}

/* ════════════════════════════════════════════════════════
   HEADER
════════════════════════════════════════════════════════ */
.header {
  margin-bottom: 56px;
  text-align: left;
}

.header__pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid rgba(0,229,255,0.2);
  padding: 6px 14px;
  border-radius: 100px;
  margin-bottom: 24px;
}

.header__dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: blink 2s ease-in-out infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

.header__title {
  font-size: clamp(3rem, 7vw, 5rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--text);
}
.header__title span { color: var(--accent); }

.header__sub {
  margin-top: 16px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-3);
  letter-spacing: 0.02em;
}

/* ════════════════════════════════════════════════════════
   MAIN GRID
════════════════════════════════════════════════════════ */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 720px) {
  .main-grid { grid-template-columns: 1fr; }
}

/* ════════════════════════════════════════════════════════
   PANELS
════════════════════════════════════════════════════════ */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px;
  position: relative;
  overflow: hidden;
}
.panel::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 60%);
  pointer-events: none;
}

.panel__tag {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 20px;
}

/* ════════════════════════════════════════════════════════
   DROP ZONE
════════════════════════════════════════════════════════ */
.drop-zone {
  border: 1.5px dashed var(--border);
  border-radius: var(--radius);
  padding: 44px 24px;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition);
  background: var(--surface-2);
  user-select: none;
}
.drop-zone:hover, .drop-zone.over {
  border-color: var(--accent);
  background: var(--accent-dim);
  box-shadow: 0 0 0 4px var(--accent-glow) inset, 0 0 32px rgba(0,229,255,0.06);
}
.drop-zone:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.drop-zone__icon {
  width: 52px; height: 52px;
  margin: 0 auto 18px;
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition);
}
.drop-zone__icon svg { width: 22px; height: 22px; max-width: 22px; max-height: 22px; color: var(--text-3); transition: color var(--transition); }
.drop-zone:hover .drop-zone__icon,
.drop-zone.over .drop-zone__icon {
  background: var(--accent-dim);
  border-color: var(--accent);
}
.drop-zone:hover .drop-zone__icon svg,
.drop-zone.over .drop-zone__icon svg { color: var(--accent); }

.drop-zone__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}
.drop-zone__sub { font-size: 13px; color: var(--text-2); }
.drop-zone__link {
  background: none;
  border: none;
  color: var(--accent);
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.drop-zone__hint {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
  margin-top: 12px;
  letter-spacing: 0.06em;
}

/* ════════════════════════════════════════════════════════
   PREVIEW BLOCK
════════════════════════════════════════════════════════ */
.preview-block {
  display: none;
  margin-top: 20px;
}
.preview-block__label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 8px;
}

.video-player {
  width: 100%;
  border-radius: var(--radius-sm);
  background: #000;
  display: block;
  max-height: 240px;
}
.video-player--result { max-height: 360px; }

.waveform {
  width: 100%;
  height: 52px;
  display: block;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  margin-top: 10px;
}

.file-info {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-3);
  margin-top: 8px;
}

/* ════════════════════════════════════════════════════════
   PRESET BUTTONS
════════════════════════════════════════════════════════ */
.preset-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 14px 8px;
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-2);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: 0.02em;
}
.preset-btn svg { width: 18px; height: 18px; transition: color var(--transition); }
.preset-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}
.preset-btn--active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
  box-shadow: 0 0 16px rgba(0,229,255,0.1);
}

/* ════════════════════════════════════════════════════════
   ADVANCED TOGGLE
════════════════════════════════════════════════════════ */
.advanced-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-2);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition);
  margin-bottom: 0;
  letter-spacing: 0.04em;
}
.advanced-toggle svg:first-child { width: 14px; height: 14px; flex-shrink: 0; }
.advanced-toggle:hover { border-color: var(--accent); color: var(--text); }
.advanced-toggle[aria-expanded="true"] { border-color: var(--accent); color: var(--accent); }

.advanced-toggle__arrow {
  width: 14px; height: 14px;
  margin-left: auto;
  transition: transform var(--transition);
}
.advanced-toggle[aria-expanded="true"] .advanced-toggle__arrow {
  transform: rotate(180deg);
}

/* ════════════════════════════════════════════════════════
   ADVANCED PANEL (accordion)
════════════════════════════════════════════════════════ */
.advanced-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
}
.advanced-panel.open {
  grid-template-rows: 1fr;
  margin-top: 12px;
}
.advanced-panel > * { overflow: hidden; }

/* Wrapper inside the panel for spacing */
.advanced-panel {
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  transition: grid-template-rows 0.3s cubic-bezier(0.4,0,0.2,1),
              border-color 0.22s, padding 0.22s;
}
.advanced-panel.open {
  border-color: var(--border);
  padding: 20px;
  margin-top: 10px;
}

/* ════════════════════════════════════════════════════════
   SLIDERS
════════════════════════════════════════════════════════ */
.slider-group {
  margin-bottom: 20px;
}
.slider-group:last-child { margin-bottom: 0; }

.slider-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-2);
}

.slider-group__val {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid rgba(0,229,255,0.2);
  padding: 3px 10px;
  border-radius: 100px;
  min-width: 64px;
  text-align: center;
}

input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: var(--surface-3);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 0 0 3px var(--accent-glow);
  transition: transform var(--transition);
}
input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
input[type="range"]::-moz-range-thumb {
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
}

.slider-group__hint {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
  margin-top: 8px;
  line-height: 1.6;
}

/* ════════════════════════════════════════════════════════
   RUN BUTTON
════════════════════════════════════════════════════════ */
.run-btn {
  width: 100%;
  margin-top: 20px;
  padding: 17px 24px;
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: var(--radius);
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
}
.run-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
  opacity: 0;
  transition: opacity var(--transition);
}
.run-btn:hover:not(:disabled)::before { opacity: 1; }
.run-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,229,255,0.35);
}
.run-btn:active:not(:disabled) { transform: translateY(0); }
.run-btn:disabled {
  background: var(--surface-3);
  color: var(--text-3);
  cursor: not-allowed;
  border: 1px solid var(--border);
  box-shadow: none;
}

.run-btn__icon svg { width: 16px; height: 16px; }
.run-btn:disabled .run-btn__icon { display: none; }

.run-btn__spinner {
  display: none;
  width: 16px; height: 16px;
  border: 2px solid rgba(0,0,0,0.2);
  border-top-color: rgba(0,0,0,0.7);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.run-btn.running .run-btn__icon  { display: none; }
.run-btn.running .run-btn__spinner { display: block; }

/* ════════════════════════════════════════════════════════
   STATUS BOX
════════════════════════════════════════════════════════ */
.status-box {
  margin-top: 16px;
  padding: 20px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Etapas ── */
.steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  transition: all var(--transition);
  opacity: 0.35;
}

.step__icon {
  width: 26px; height: 26px;
  border-radius: 6px;
  background: var(--surface-3);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition);
  color: var(--text-3);
}

.step__label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.05em;
  color: var(--text-2);
  flex: 1;
}

.step__status {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
  text-align: right;
  min-width: 40px;
}

/* Estado: ativo (processando agora) */
.step.active {
  opacity: 1;
  background: var(--accent-dim);
  border-color: rgba(0,229,255,0.2);
}
.step.active .step__icon {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: 0 0 10px rgba(0,229,255,0.25);
}
.step.active .step__icon svg {
  animation: stepPulse 1s ease-in-out infinite;
}
@keyframes stepPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.6; transform: scale(0.9); }
}
.step.active .step__label { color: var(--accent); }
.step.active .step__status { color: var(--accent); }

/* Estado: concluído */
.step.done {
  opacity: 1;
}
.step.done .step__icon {
  background: var(--green-dim);
  border-color: var(--green);
  color: var(--green);
}
.step.done .step__icon svg { display: none; }
.step.done .step__icon::after {
  content: '';
  width: 8px; height: 5px;
  border-left: 2px solid var(--green);
  border-bottom: 2px solid var(--green);
  transform: rotate(-45deg) translateY(-1px);
  display: block;
}
.step.done .step__label { color: var(--text-2); }
.step.done .step__status { color: var(--green); }

/* Estado: erro */
.step.error {
  opacity: 1;
  background: var(--red-dim);
  border-color: rgba(255,61,113,0.2);
}
.step.error .step__icon {
  background: var(--red-dim);
  border-color: var(--red);
  color: var(--red);
}

/* ── Barra de progresso ── */
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: var(--surface-3);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), var(--green));
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
  box-shadow: 0 0 12px rgba(0,229,255,0.5);
}

.progress-pct {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  min-width: 32px;
  text-align: right;
}

/* ── Mensagem de status ── */
.status-box__text {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.5;
  min-height: 16px;
  transition: color var(--transition);
  padding: 0 2px;
}
.status-box__text.success { color: var(--green); }
.status-box__text.error   { color: var(--red); }
.status-box__text.active  { color: var(--text-2); }

/* ════════════════════════════════════════════════════════
   SEGMENT VISUALIZER
════════════════════════════════════════════════════════ */
.seg-viz {
  display: none;
  margin-top: 14px;
}
.seg-viz__label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.seg-viz__dot {
  width: 8px; height: 8px;
  border-radius: 2px;
  display: inline-block;
}
.seg-viz__dot--green { background: var(--green); }
.seg-viz__dot--red   { background: var(--red); }
.seg-viz__canvas { width: 100%; display: block; border-radius: 4px; }

/* ════════════════════════════════════════════════════════
   RESULT SECTION
════════════════════════════════════════════════════════ */
.result-section {
  display: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  margin-top: 16px;
  position: relative;
  overflow: hidden;
  animation: slideUp 0.4s cubic-bezier(0.4,0,0.2,1);
}
.result-section::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent), var(--green));
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.result-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  flex: 1;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
  transition: all var(--transition);
}
.stat-card--accent {
  border-color: rgba(0,229,255,0.3);
  background: var(--accent-dim);
}
.stat-card__val {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  color: var(--accent);
  line-height: 1;
  letter-spacing: -0.03em;
}
.stat-card__label {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 6px;
}

.dl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  margin-top: 20px;
  padding: 16px;
  background: transparent;
  border: 1.5px solid var(--green);
  border-radius: var(--radius);
  color: var(--green);
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition);
}
.dl-btn svg { width: 18px; height: 18px; }
.dl-btn:hover {
  background: var(--green-dim);
  box-shadow: 0 8px 24px rgba(0,224,150,0.2);
  transform: translateY(-2px);
}

/* ════════════════════════════════════════════════════════
   RESPONSIVE
════════════════════════════════════════════════════════ */
@media (max-width: 480px) {
  .app { padding: 32px 16px 64px; }
  .result-stats { flex-direction: column; }
  .preset-row { grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
  .preset-btn { padding: 12px 6px; font-size: 11px; }
}
