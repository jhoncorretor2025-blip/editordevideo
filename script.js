// ════════════════════════════════════════════════════════
//  JumpCut — script.js
//  Dependências: nenhuma. Funciona em qualquer host estático.
// ════════════════════════════════════════════════════════

'use strict';

// ── Presets de configuração ─────────────────────────────────────────────────
const PRESETS = {
  auto: {
    threshold:  0.02,
    minSilence: 500,
    padding:    80,
  },
  suave: {
    threshold:  0.01,
    minSilence: 800,
    padding:    150,
  },
  agressivo: {
    threshold:  0.04,
    minSilence: 250,
    padding:    40,
  },
};

// ── Referências ao DOM ──────────────────────────────────────────────────────
const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const previewBlock  = document.getElementById('previewBlock');
const vidOriginal   = document.getElementById('vidOriginal');
const waveCanvas    = document.getElementById('waveCanvas');
const fileInfoEl    = document.getElementById('fileInfo');

const presetBtns    = document.querySelectorAll('.preset-btn');
const advToggle     = document.getElementById('advancedToggle');
const advPanel      = document.getElementById('advancedPanel');

const thresholdInput  = document.getElementById('threshold');
const minSilenceInput = document.getElementById('minSilence');
const paddingInput    = document.getElementById('padding');
const thresholdVal    = document.getElementById('thresholdVal');
const minSilenceVal   = document.getElementById('minSilenceVal');
const paddingVal      = document.getElementById('paddingVal');

const runBtn        = document.getElementById('runBtn');
const btnLabel      = document.getElementById('btnLabel');
const spinner       = document.getElementById('spinner');
const statusText    = document.getElementById('statusText');
const progBar       = document.getElementById('progBar');
const segViz        = document.getElementById('segViz');
const segCanvas     = document.getElementById('segCanvas');

const resultSection = document.getElementById('resultSection');
const vidResult     = document.getElementById('vidResult');
const dlBtn         = document.getElementById('dlBtn');
const statSegs      = document.getElementById('statSegs');
const statRemoved   = document.getElementById('statRemoved');
const statDuration  = document.getElementById('statDuration');

// ── Estado ──────────────────────────────────────────────────────────────────
let videoFile       = null;
let activePreset    = 'auto';

// ── Presets ─────────────────────────────────────────────────────────────────
function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  activePreset = name;

  thresholdInput.value  = p.threshold;
  minSilenceInput.value = p.minSilence;
  paddingInput.value    = p.padding;

  updateSliderDisplays();

  presetBtns.forEach(btn => {
    btn.classList.toggle('preset-btn--active', btn.dataset.preset === name);
  });
}

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
});

// Aplica preset padrão ao carregar
applyPreset('auto');

// ── Painel avançado (accordion) ─────────────────────────────────────────────
advToggle.addEventListener('click', () => {
  const isOpen = advPanel.classList.toggle('open');
  advToggle.setAttribute('aria-expanded', isOpen);
});

// ── Sliders — atualizar display em tempo real ────────────────────────────────
function updateSliderDisplays() {
  thresholdVal.textContent  = parseFloat(thresholdInput.value).toFixed(3);
  minSilenceVal.textContent = minSilenceInput.value + 'ms';
  paddingVal.textContent    = paddingInput.value + 'ms';
}

thresholdInput.addEventListener('input',  updateSliderDisplays);
minSilenceInput.addEventListener('input', updateSliderDisplays);
paddingInput.addEventListener('input',    updateSliderDisplays);

// ── Upload / Drag-and-drop ───────────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('over');
  handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

function handleFile(file) {
  if (!file || !file.type.startsWith('video/')) {
    alert('Por favor selecione um arquivo de vídeo válido (MP4, WebM, MOV, AVI).');
    return;
  }

  videoFile = file;

  const url = URL.createObjectURL(file);
  vidOriginal.src = url;
  previewBlock.style.display = 'block';
  resultSection.style.display = 'none';
  segViz.style.display = 'none';

  fileInfoEl.textContent = `${file.name}  ·  ${(file.size / 1024 / 1024).toFixed(1)} MB`;

  setStatus(`✓ Vídeo carregado. Pronto para processar.`, 'active', 0);

  runBtn.disabled = false;
  btnLabel.textContent = 'Processar Vídeo';

  // Desenha waveform após metadados carregarem
  vidOriginal.addEventListener('loadedmetadata', () => drawWaveform(file), { once: true });
}

// ── Waveform visual ──────────────────────────────────────────────────────────
async function drawWaveform(file) {
  try {
    const actx    = new (window.AudioContext || window.webkitAudioContext)();
    const arrBuf  = await file.arrayBuffer();
    const decoded = await actx.decodeAudioData(arrBuf);
    actx.close();

    const ch   = decoded.getChannelData(0);
    const W    = (waveCanvas.offsetWidth || 400) * devicePixelRatio;
    const H    = 52 * devicePixelRatio;
    waveCanvas.width  = W;
    waveCanvas.height = H;

    const c    = waveCanvas.getContext('2d');
    const step = Math.max(1, Math.floor(ch.length / W));

    c.strokeStyle = 'rgba(0,229,255,0.5)';
    c.lineWidth   = 1;

    for (let x = 0; x < W; x++) {
      let peak = 0;
      for (let i = 0; i < step; i++) peak = Math.max(peak, Math.abs(ch[x * step + i] || 0));
      const barH = peak * H * 0.9;
      c.beginPath();
      c.moveTo(x, (H - barH) / 2);
      c.lineTo(x, (H + barH) / 2);
      c.stroke();
    }
  } catch (_) { /* waveform é opcional, ignora erros */ }
}

// ── Processamento principal ──────────────────────────────────────────────────
runBtn.addEventListener('click', processVideo);

async function processVideo() {
  if (!videoFile) return;

  const threshold = parseFloat(thresholdInput.value);
  const minSilMs  = parseInt(minSilenceInput.value);
  const padMs     = parseInt(paddingInput.value);

  // UI → estado processando
  runBtn.disabled = true;
  runBtn.classList.add('running');
  btnLabel.textContent = 'Processando...';
  resultSection.style.display = 'none';
  progBar.style.width = '0%';
  segViz.style.display = 'none';

  try {
    // 1 ── Decodifica áudio
    setStatus('🔍 Decodificando áudio...', 'active', 5);
    const actx    = new (window.AudioContext || window.webkitAudioContext)();
    const arrBuf  = await videoFile.arrayBuffer();
    const audioBuf = await actx.decodeAudioData(arrBuf);
    actx.close();

    // 2 ── Detecta segmentos de fala
    setStatus('📊 Analisando silêncios...', 'active', 20);
    const segments = detectSpeechSegments(audioBuf, threshold, minSilMs, padMs);

    if (segments.length === 0) {
      setStatus('⚠️ Nenhum segmento de fala encontrado. Reduza o threshold.', 'error', 0);
      resetBtn();
      return;
    }

    drawSegmentMap(segments, audioBuf.duration);
    setStatus(`✂️ ${segments.length} segmentos encontrados. Iniciando captura...`, 'active', 30);

    // 3 ── Renderiza segmentos via Canvas + MediaRecorder
    const blobs = await renderSegments(videoFile, segments, ({ cur, total, ratio }) => {
      setStatus(`🎬 Capturando segmento ${cur} de ${total}...`, 'active', 30 + ratio * 60);
    });

    if (blobs.length === 0) throw new Error('Captura falhou: nenhum segmento foi gravado.');

    // 4 ── Monta arquivo final
    setStatus('📦 Montando arquivo final...', 'active', 92);
    const mimeType  = blobs[0].type || 'video/webm';
    const finalBlob = new Blob(blobs, { type: mimeType });
    const finalUrl  = URL.createObjectURL(finalBlob);

    // 5 ── Exibe resultado
    const origDur   = audioBuf.duration;
    const newDur    = segments.reduce((s, g) => s + g.end - g.start, 0);
    const pctRemoved = ((1 - newDur / origDur) * 100).toFixed(1);

    statSegs.textContent     = segments.length;
    statRemoved.textContent  = pctRemoved + '%';
    statDuration.textContent = formatTime(newDur);

    vidResult.src = finalUrl;
    dlBtn.href    = finalUrl;

    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setStatus(`✅ Pronto! ${pctRemoved}% do vídeo removido.`, 'success', 100);

  } catch (err) {
    console.error('[JumpCut] Erro:', err);
    setStatus('❌ Erro: ' + err.message, 'error', 0);
  }

  resetBtn();
}

// ── Detecção de segmentos de fala ────────────────────────────────────────────
/**
 * Retorna array de { start, end } (segundos) com os trechos de fala.
 *
 * @param {AudioBuffer} audioBuf
 * @param {number}      threshold   Amplitude mínima para considerar fala (0–1)
 * @param {number}      minSilMs    Duração mínima de silêncio a cortar (ms)
 * @param {number}      padMs       Padding ao redor de cada segmento (ms)
 */
function detectSpeechSegments(audioBuf, threshold, minSilMs, padMs) {
  const sr          = audioBuf.sampleRate;
  const data        = audioBuf.getChannelData(0);
  const totalDur    = audioBuf.duration;

  const frameSamples  = Math.floor(sr * 0.02);          // janelas de 20ms
  const minSilFrames  = Math.ceil((minSilMs / 1000) * sr / frameSamples);
  const padSec        = padMs / 1000;

  // RMS de cada frame
  const rms = [];
  for (let i = 0; i < data.length; i += frameSamples) {
    const end = Math.min(i + frameSamples, data.length);
    let sum = 0;
    for (let j = i; j < end; j++) sum += data[j] * data[j];
    rms.push(Math.sqrt(sum / (end - i)));
  }

  // Marca frames como fala ou silêncio
  const isSpeech = rms.map(r => r > threshold);

  // Preenche lacunas de silêncio curtas (< minSilFrames)
  let silCount = 0;
  for (let i = 0; i <= isSpeech.length; i++) {
    if (i < isSpeech.length && !isSpeech[i]) { silCount++; continue; }
    if (silCount > 0 && silCount < minSilFrames) {
      for (let j = i - silCount; j < i; j++) isSpeech[j] = true;
    }
    silCount = 0;
  }

  // Converte sequências de frames em segmentos de tempo
  const frameDur = frameSamples / sr;
  const raw = [];
  let inSeg = false, segStart = 0;

  for (let i = 0; i <= isSpeech.length; i++) {
    const speaking = i < isSpeech.length ? isSpeech[i] : false;
    if (speaking && !inSeg)  { segStart = i * frameDur; inSeg = true; }
    if (!speaking && inSeg)  { raw.push({ start: segStart, end: i * frameDur }); inSeg = false; }
  }

  // Aplica padding e descarta segmentos muito curtos (< 50ms)
  return raw
    .map(s => ({
      start: Math.max(0, s.start - padSec),
      end:   Math.min(totalDur, s.end + padSec),
    }))
    .filter(s => s.end - s.start > 0.05);
}

// ── Captura de segmentos (Canvas + MediaRecorder) ───────────────────────────
/**
 * Para cada segmento, posiciona o vídeo, grava via Canvas captureStream
 * e retorna array de Blob.
 *
 * @param {File}     file
 * @param {Array}    segments   [{ start, end }]
 * @param {Function} onProgress ({ cur, total, ratio }) => void
 */
function renderSegments(file, segments, onProgress) {
  return new Promise((resolve, reject) => {
    const blobs = [];
    let idx = 0;

    // Vídeo oculto para seek + captura
    const vid = document.createElement('video');
    vid.src   = URL.createObjectURL(file);
    vid.muted = false;
    Object.assign(vid.style, {
      position: 'fixed', opacity: '0', pointerEvents: 'none',
      top: '-9999px', width: '1px', height: '1px',
    });
    document.body.appendChild(vid);

    // Canvas de captura
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');

    // Mime type suportado pelo browser
    const mime = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    // Roteamento de áudio (opcional — falha silenciosamente em alguns browsers)
    let audioCtx, audioSrc, audioDest;
    function getAudioTrack() {
      try {
        if (!audioCtx) {
          audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
          audioSrc  = audioCtx.createMediaElementSource(vid);
          audioDest = audioCtx.createMediaStreamDestination();
          audioSrc.connect(audioDest);
          audioSrc.connect(audioCtx.destination);
        }
        return audioDest.stream.getAudioTracks()[0] || null;
      } catch (_) { return null; }
    }

    vid.addEventListener('loadedmetadata', processNext);

    function processNext() {
      if (idx >= segments.length) {
        vid.remove();
        resolve(blobs);
        return;
      }

      onProgress({ cur: idx + 1, total: segments.length, ratio: idx / segments.length });

      canvas.width  = vid.videoWidth  || 1280;
      canvas.height = vid.videoHeight || 720;

      vid.currentTime = segments[idx].start;
      vid.addEventListener('seeked', onSeeked, { once: true });
    }

    function onSeeked() {
      const seg = segments[idx];

      // Stream do canvas
      const stream = canvas.captureStream(30);

      // Tenta adicionar áudio
      const audioTrack = getAudioTrack();
      if (audioTrack) stream.addTrack(audioTrack);

      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 4_000_000,
      });
      const chunks = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        blobs.push(new Blob(chunks, { type: mime }));
        idx++;
        processNext();
      };

      recorder.start(100); // coleta dados a cada 100ms
      vid.play();

      // Loop de renderização de frames
      let raf;
      function drawFrame() {
        if (!vid.paused && !vid.ended) {
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          raf = requestAnimationFrame(drawFrame);
        }
      }
      drawFrame();

      // Para quando chegar ao fim do segmento
      function watchEnd() {
        if (vid.currentTime >= seg.end - 0.04 || vid.ended) {
          cancelAnimationFrame(raf);
          vid.pause();
          recorder.stop();
        } else {
          requestAnimationFrame(watchEnd);
        }
      }
      watchEnd();
    }
  });
}

// ── Visualizador de segmentos ────────────────────────────────────────────────
function drawSegmentMap(segments, totalDur) {
  segViz.style.display = 'block';

  const W = (segCanvas.offsetWidth || 600) * devicePixelRatio;
  const H = 24 * devicePixelRatio;
  segCanvas.width  = W;
  segCanvas.height = H;

  const c = segCanvas.getContext('2d');

  // Fundo vermelho = trechos cortados
  c.fillStyle = 'rgba(255,61,113,0.45)';
  c.fillRect(0, 0, W, H);

  // Verde = trechos mantidos
  c.fillStyle = 'rgba(0,224,150,0.7)';
  for (const seg of segments) {
    const x = (seg.start / totalDur) * W;
    const w = ((seg.end - seg.start) / totalDur) * W;
    c.fillRect(x, 0, Math.max(w, 1), H);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * @param {string} msg
 * @param {'active'|'success'|'error'|''} state
 * @param {number} pct  0–100
 */
function setStatus(msg, state = '', pct = null) {
  statusText.textContent = msg;
  statusText.className   = 'status-box__text' + (state ? ' ' + state : '');
  if (pct !== null) progBar.style.width = pct + '%';
}

function resetBtn() {
  runBtn.disabled = false;
  runBtn.classList.remove('running');
  btnLabel.textContent = 'Processar Novamente';
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
