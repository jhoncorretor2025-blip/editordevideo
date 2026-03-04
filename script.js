// ════════════════════════════════════════════════════════
//  JumpCut — script.js
//  Exporta MP4 real via WebCodecs API + mp4-muxer
//  Funciona no Chrome/Edge 94+. GitHub Pages compatível.
// ════════════════════════════════════════════════════════

'use strict';

// ── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = {
  auto:      { threshold: 0.02,  minSilence: 500, padding: 80  },
  suave:     { threshold: 0.01,  minSilence: 800, padding: 150 },
  agressivo: { threshold: 0.04,  minSilence: 250, padding: 40  },
};

// ── DOM ───────────────────────────────────────────────────────────────────────
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
const statusText    = document.getElementById('statusText');
const progBar       = document.getElementById('progBar');
const progPct       = document.getElementById('progPct');
const step1El       = document.getElementById('step1');
const step2El       = document.getElementById('step2');
const step3El       = document.getElementById('step3');
const step3Detail   = document.getElementById('step3Detail');
const step4El       = document.getElementById('step4');
const segViz        = document.getElementById('segViz');
const segCanvas     = document.getElementById('segCanvas');
const resultSection = document.getElementById('resultSection');
const vidResult     = document.getElementById('vidResult');
const dlBtn         = document.getElementById('dlBtn');
const statSegs      = document.getElementById('statSegs');
const statRemoved   = document.getElementById('statRemoved');
const statDuration  = document.getElementById('statDuration');

// ── Estado ────────────────────────────────────────────────────────────────────
let videoFile = null;

// ── Presets ───────────────────────────────────────────────────────────────────
function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  thresholdInput.value  = p.threshold;
  minSilenceInput.value = p.minSilence;
  paddingInput.value    = p.padding;
  updateSliderDisplays();
  presetBtns.forEach(btn =>
    btn.classList.toggle('preset-btn--active', btn.dataset.preset === name)
  );
}
presetBtns.forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));
applyPreset('auto');

// ── Painel avançado ───────────────────────────────────────────────────────────
advToggle.addEventListener('click', () => {
  const open = advPanel.classList.toggle('open');
  advToggle.setAttribute('aria-expanded', open);
});

// ── Sliders ───────────────────────────────────────────────────────────────────
function updateSliderDisplays() {
  thresholdVal.textContent  = parseFloat(thresholdInput.value).toFixed(3);
  minSilenceVal.textContent = minSilenceInput.value + 'ms';
  paddingVal.textContent    = paddingInput.value + 'ms';
}
thresholdInput.addEventListener('input',  updateSliderDisplays);
minSilenceInput.addEventListener('input', updateSliderDisplays);
paddingInput.addEventListener('input',    updateSliderDisplays);

// ── Upload ────────────────────────────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') fileInput.click(); });
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('over');
  handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

function handleFile(file) {
  if (!file || !file.type.startsWith('video/')) {
    alert('Selecione um arquivo de vídeo válido (MP4, WebM, MOV).'); return;
  }
  videoFile = file;
  vidOriginal.src = URL.createObjectURL(file);
  previewBlock.style.display = 'block';
  resultSection.style.display = 'none';
  segViz.style.display = 'none';
  fileInfoEl.textContent = `${file.name}  ·  ${(file.size/1024/1024).toFixed(1)} MB`;
  setStatus('✓ Vídeo carregado. Pronto para processar.', 'active', 0);
  runBtn.disabled = false;
  btnLabel.textContent = 'Processar Vídeo';
  vidOriginal.addEventListener('loadedmetadata', () => drawWaveform(file), { once: true });
}

// ── Waveform ──────────────────────────────────────────────────────────────────
async function drawWaveform(file) {
  try {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const buf  = await file.arrayBuffer();
    const dec  = await actx.decodeAudioData(buf);
    actx.close();
    const ch = dec.getChannelData(0);
    const W  = (waveCanvas.offsetWidth || 400) * devicePixelRatio;
    const H  = 52 * devicePixelRatio;
    waveCanvas.width = W; waveCanvas.height = H;
    const c    = waveCanvas.getContext('2d');
    const step = Math.max(1, Math.floor(ch.length / W));
    c.strokeStyle = 'rgba(0,229,255,0.5)';
    c.lineWidth = 1;
    for (let x = 0; x < W; x++) {
      let peak = 0;
      for (let i = 0; i < step; i++) peak = Math.max(peak, Math.abs(ch[x*step+i]||0));
      const h = peak * H * 0.9;
      c.beginPath(); c.moveTo(x,(H-h)/2); c.lineTo(x,(H+h)/2); c.stroke();
    }
  } catch(_) {}
}

// ── Processamento principal ───────────────────────────────────────────────────
runBtn.addEventListener('click', processVideo);

async function processVideo() {
  if (!videoFile) return;

  const threshold = parseFloat(thresholdInput.value);
  const minSilMs  = parseInt(minSilenceInput.value);
  const padMs     = parseInt(paddingInput.value);

  runBtn.disabled = true;
  runBtn.classList.add('running');
  btnLabel.textContent = 'Processando...';
  resultSection.style.display = 'none';
  segViz.style.display = 'none';
  resetSteps();
  setProgress(0);

  try {
    // 1 — Decodifica áudio para análise
    setStep(1, 'active');
    setStatus('Lendo e decodificando o arquivo de áudio...', 'active', 5);
    const actx    = new (window.AudioContext || window.webkitAudioContext)();
    const arrBuf  = await videoFile.arrayBuffer();
    const audioBuf = await actx.decodeAudioData(arrBuf.slice(0));
    actx.close();
    setStep(1, 'done', formatTime(audioBuf.duration));

    // 2 — Detecta segmentos de fala
    setStep(2, 'active');
    setStatus('Analisando frames de áudio em busca de silêncios...', 'active', 18);
    const segments = detectSpeechSegments(audioBuf, threshold, minSilMs, padMs);

    if (segments.length === 0) {
      setStep(2, 'error');
      setStatus('Nenhum segmento encontrado. Reduza o threshold.', 'error', 0);
      resetBtn(); return;
    }

    drawSegmentMap(segments, audioBuf.duration);
    setStep(2, 'done', `${segments.length} segs`);
    setProgress(25);

    // 3 — Codifica MP4 via WebCodecs (Chrome/Edge) ou fallback WebM
    setStep(3, 'active');
    let finalBlob;
    if (typeof VideoEncoder !== 'undefined' && typeof Mp4Muxer !== 'undefined') {
      setStatus('Codificando vídeo em H.264 + AAC (MP4)...', 'active', 25);
      finalBlob = await encodeMP4(videoFile, segments, audioBuf, (p) => {
        step3Detail.textContent = `${p.cur}/${p.total}`;
        setStatus(`Renderizando frame ${p.cur} de ${p.total}...`, 'active');
        setProgress(25 + Math.round(p.ratio * 60));
      });
    } else {
      setStatus('WebCodecs indisponível — usando WebM (Firefox/Safari)...', 'active', 25);
      finalBlob = await encodeWebM(videoFile, segments, (p) => {
        step3Detail.textContent = `${p.cur}/${p.total}`;
        setStatus(`Capturando segmento ${p.cur} de ${p.total}...`, 'active');
        setProgress(25 + Math.round(p.ratio * 60));
      });
    }
    setStep(3, 'done');

    // 4 — Exibe resultado
    setStep(4, 'active');
    setStatus('Montando e finalizando arquivo...', 'active', 92);
    const url = URL.createObjectURL(finalBlob);

    const origDur    = audioBuf.duration;
    // newDur: soma das durações reais dos segmentos mesclados (sem sobreposição)
    const newDur     = segments.reduce((s, g) => s + (g.end - g.start), 0);
    const pctRemoved = Math.max(0, ((1 - newDur / origDur) * 100)).toFixed(1);

    statSegs.textContent     = segments.length;
    statRemoved.textContent  = pctRemoved + '%';
    statDuration.textContent = formatTime(newDur);

    // Define extensão correta
    const ext = finalBlob.type.includes('mp4') ? 'mp4' : 'webm';
    dlBtn.download = `jumpcut.${ext}`;

    vidResult.src = url;
    dlBtn.href    = url;

    // Após carregar o vídeo resultado, atualiza duração com valor real do arquivo
    vidResult.addEventListener('loadedmetadata', () => {
      if (vidResult.duration && isFinite(vidResult.duration)) {
        statDuration.textContent = formatTime(vidResult.duration);
      }
    }, { once: true });

    setStep(4, 'done');
    setProgress(100);
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setStatus(`✅ Pronto! ${pctRemoved}% do vídeo removido. Formato: ${ext.toUpperCase()}`, 'success');

  } catch(err) {
    console.error('[JumpCut]', err);
    // Marca como erro a etapa que estava ativa
    document.querySelectorAll('.step.active').forEach(s => s.classList.replace('active','error'));
    setStatus('Erro: ' + err.message, 'error', 0);
  }
  resetBtn();
}

// ════════════════════════════════════════════════════════
//  ENCODER MP4 — WebCodecs API + mp4-muxer
// ════════════════════════════════════════════════════════
async function encodeMP4(file, segments, audioBuf, onProgress) {
  // ── Configura o vídeo via elemento oculto ──
  const vid = await createHiddenVideo(file);
  const W   = vid.videoWidth  || 1280;
  const H   = vid.videoHeight || 720;

  // Canvas de captura
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // ── mp4-muxer ──
  const { Muxer, ArrayBufferTarget } = Mp4Muxer;
  const target = new ArrayBufferTarget();
  const muxer  = new Muxer({
    target,
    video: { codec: 'avc', width: W, height: H },
    audio: { codec: 'aac', sampleRate: audioBuf.sampleRate, numberOfChannels: audioBuf.numberOfChannels },
    fastStart: 'in-memory',
  });

  // ── VideoEncoder ──
  const FPS       = 30;
  const frameUs   = Math.round(1_000_000 / FPS); // microssegundos por frame
  let videoTs     = 0; // timestamp acumulado (µs)
  let frameCount  = 0;
  let totalFrames = segments.reduce((s, g) => s + Math.round((g.end - g.start) * FPS), 0);

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error:  e => { throw e; },
  });
  videoEncoder.configure({
    codec:     'avc1.42001f',  // H.264 Baseline
    width:     W,
    height:    H,
    bitrate:   4_000_000,
    framerate: FPS,
  });

  // ── AudioEncoder ──
  const SR  = audioBuf.sampleRate;
  const NCH = audioBuf.numberOfChannels;
  let audioTs = 0; // microssegundos

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error:  e => { throw e; },
  });
  audioEncoder.configure({
    codec:       'mp4a.40.2',  // AAC-LC
    sampleRate:  SR,
    numberOfChannels: NCH,
    bitrate:     128_000,
  });

  // ── Processa cada segmento ──
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];

    // Codifica áudio do segmento
    const startSample = Math.floor(seg.start * SR);
    const endSample   = Math.min(Math.ceil(seg.end * SR), audioBuf.length);
    const segLen      = endSample - startSample;

    // Cria AudioData em blocos de 1024 samples
    const CHUNK = 1024;
    for (let off = 0; off < segLen; off += CHUNK) {
      const len  = Math.min(CHUNK, segLen - off);
      const data = new Float32Array(len * NCH);
      for (let ch = 0; ch < NCH; ch++) {
        const src = audioBuf.getChannelData(ch).subarray(startSample + off, startSample + off + len);
        for (let i = 0; i < len; i++) data[i * NCH + ch] = src[i];
      }
      const audioData = new AudioData({
        format:        'f32-interleaved',
        sampleRate:    SR,
        numberOfFrames: len,
        numberOfChannels: NCH,
        timestamp:     audioTs,
        data,
      });
      audioEncoder.encode(audioData);
      audioData.close();
      audioTs += Math.round((len / SR) * 1_000_000);
    }

    // Captura frames do vídeo neste segmento
    await seekVideo(vid, seg.start);
    const nFrames = Math.round((seg.end - seg.start) * FPS);

    for (let fi = 0; fi < nFrames; fi++) {
      const t = seg.start + fi / FPS;
      await seekVideo(vid, t);
      ctx.drawImage(vid, 0, 0, W, H);

      const vf = new VideoFrame(canvas, { timestamp: videoTs, duration: frameUs });
      videoEncoder.encode(vf, { keyFrame: fi % 30 === 0 });
      vf.close();

      videoTs += frameUs;
      frameCount++;
      onProgress({ cur: frameCount, total: totalFrames, ratio: frameCount / totalFrames });
    }
  }

  // ── Finaliza encoders ──
  await videoEncoder.flush();
  await audioEncoder.flush();
  muxer.finalize();

  vid.remove();

  const buf = target.buffer;
  return new Blob([buf], { type: 'video/mp4' });
}

// ── Seek preciso num elemento de vídeo ───────────────────────────────────────
function seekVideo(vid, time) {
  return new Promise(resolve => {
    if (Math.abs(vid.currentTime - time) < 0.016) { resolve(); return; }
    vid.currentTime = time;
    vid.addEventListener('seeked', resolve, { once: true });
  });
}

// ── Cria elemento de vídeo oculto e aguarda metadados ────────────────────────
function createHiddenVideo(file) {
  return new Promise((resolve, reject) => {
    const vid = document.createElement('video');
    vid.src   = URL.createObjectURL(file);
    vid.muted = true;
    Object.assign(vid.style, {
      position:'fixed', opacity:'0', pointerEvents:'none',
      top:'-9999px', width:'1px', height:'1px',
    });
    document.body.appendChild(vid);
    vid.addEventListener('loadedmetadata', () => resolve(vid), { once: true });
    vid.addEventListener('error', reject, { once: true });
  });
}

// ════════════════════════════════════════════════════════
//  FALLBACK — MediaRecorder (WebM) para Firefox / Safari
// ════════════════════════════════════════════════════════
function encodeWebM(file, segments, onProgress) {
  return new Promise((resolve, reject) => {
    const blobs = [];
    let idx = 0;

    const vid = document.createElement('video');
    vid.src   = URL.createObjectURL(file);
    vid.muted = false;
    Object.assign(vid.style, { position:'fixed', opacity:'0', pointerEvents:'none', top:'-9999px', width:'1px', height:'1px' });
    document.body.appendChild(vid);

    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    const mime   = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    let audioCtx, audioSrc, audioDest;
    function getAudioTrack() {
      try {
        if (!audioCtx) {
          audioCtx  = new (window.AudioContext||window.webkitAudioContext)();
          audioSrc  = audioCtx.createMediaElementSource(vid);
          audioDest = audioCtx.createMediaStreamDestination();
          audioSrc.connect(audioDest);
          audioSrc.connect(audioCtx.destination);
        }
        return audioDest.stream.getAudioTracks()[0]||null;
      } catch(_) { return null; }
    }

    vid.addEventListener('loadedmetadata', next);

    function next() {
      if (idx >= segments.length) { vid.remove(); resolve(new Blob(blobs,{type:mime})); return; }
      onProgress({ cur:idx+1, total:segments.length, ratio:idx/segments.length });
      canvas.width  = vid.videoWidth||1280;
      canvas.height = vid.videoHeight||720;
      vid.currentTime = segments[idx].start;
      vid.addEventListener('seeked', onSeeked, { once:true });
    }

    function onSeeked() {
      const seg    = segments[idx];
      const stream = canvas.captureStream(30);
      const at     = getAudioTrack();
      if (at) stream.addTrack(at);
      const recorder = new MediaRecorder(stream, { mimeType:mime, videoBitsPerSecond:4_000_000 });
      const chunks   = [];
      recorder.ondataavailable = e => { if(e.data.size>0) chunks.push(e.data); };
      recorder.onstop = () => { blobs.push(new Blob(chunks,{type:mime})); idx++; next(); };
      recorder.start(100);
      vid.play();
      let raf;
      function draw() {
        if(!vid.paused&&!vid.ended){ ctx.drawImage(vid,0,0,canvas.width,canvas.height); raf=requestAnimationFrame(draw); }
      }
      draw();
      function watch() {
        if(vid.currentTime>=seg.end-0.04||vid.ended){ cancelAnimationFrame(raf); vid.pause(); recorder.stop(); }
        else requestAnimationFrame(watch);
      }
      watch();
    }
  });
}

// ════════════════════════════════════════════════════════
//  DETECÇÃO DE SILÊNCIO
// ════════════════════════════════════════════════════════
function detectSpeechSegments(audioBuf, threshold, minSilMs, padMs) {
  const sr       = audioBuf.sampleRate;
  const data     = audioBuf.getChannelData(0);
  const totalDur = audioBuf.duration;

  const frameSamples = Math.floor(sr * 0.02);
  const minSilFrames = Math.ceil((minSilMs/1000) * sr / frameSamples);
  const padSec       = padMs / 1000;

  const rms = [];
  for (let i = 0; i < data.length; i += frameSamples) {
    const end = Math.min(i+frameSamples, data.length);
    let sum = 0;
    for (let j = i; j < end; j++) sum += data[j]*data[j];
    rms.push(Math.sqrt(sum/(end-i)));
  }

  const isSpeech = rms.map(r => r > threshold);

  let sc = 0;
  for (let i = 0; i <= isSpeech.length; i++) {
    if (i < isSpeech.length && !isSpeech[i]) { sc++; continue; }
    if (sc > 0 && sc < minSilFrames) for (let j=i-sc;j<i;j++) isSpeech[j]=true;
    sc = 0;
  }

  const fd   = frameSamples / sr;
  const raw  = [];
  let inSeg  = false, t0 = 0;
  for (let i = 0; i <= isSpeech.length; i++) {
    const s = i < isSpeech.length ? isSpeech[i] : false;
    if (s && !inSeg)  { t0 = i*fd; inSeg=true; }
    if (!s && inSeg)  { raw.push({start:t0, end:i*fd}); inSeg=false; }
  }

  // Aplica padding
  const padded = raw.map(s => ({
    start: Math.max(0, s.start - padSec),
    end:   Math.min(totalDur, s.end + padSec),
  }));

  // Mescla segmentos sobrepostos após padding
  if (padded.length === 0) return [];
  padded.sort((a, b) => a.start - b.start);
  const merged = [{ ...padded[0] }];
  for (let i = 1; i < padded.length; i++) {
    const last = merged[merged.length - 1];
    if (padded[i].start <= last.end) {
      last.end = Math.max(last.end, padded[i].end);
    } else {
      merged.push({ ...padded[i] });
    }
  }

  return merged.filter(s => s.end - s.start > 0.05);
}

// ════════════════════════════════════════════════════════
//  VISUALIZAÇÃO DE SEGMENTOS
// ════════════════════════════════════════════════════════
function drawSegmentMap(segments, totalDur) {
  segViz.style.display = 'block';
  const W = (segCanvas.offsetWidth||600)*devicePixelRatio;
  const H = 24*devicePixelRatio;
  segCanvas.width=W; segCanvas.height=H;
  const c = segCanvas.getContext('2d');
  c.fillStyle='rgba(255,61,113,0.45)'; c.fillRect(0,0,W,H);
  c.fillStyle='rgba(0,224,150,0.7)';
  for (const seg of segments) {
    c.fillRect((seg.start/totalDur)*W, 0, Math.max(((seg.end-seg.start)/totalDur)*W,1), H);
  }
}

// ════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════
// ── setStatus: atualiza mensagem de texto ────────────────────────────────────
function setStatus(msg, state = '', pct = null) {
  statusText.textContent = msg;
  statusText.className   = 'status-box__text' + (state ? ' ' + state : '');
  if (pct !== null) setProgress(pct);
}

// ── setProgress: barra + percentual ─────────────────────────────────────────
function setProgress(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  progBar.style.width   = clamped + '%';
  progPct.textContent   = clamped + '%';
}

// ── setStep: controla estado visual de cada etapa ────────────────────────────
// state: 'idle' | 'active' | 'done' | 'error'
function setStep(num, state, detail = '') {
  const el = document.getElementById('step' + num);
  if (!el) return;
  el.classList.remove('active', 'done', 'error');
  if (state !== 'idle') el.classList.add(state);
  const statusEl = el.querySelector('.step__status');
  if (statusEl && detail) statusEl.textContent = detail;
}

// ── resetSteps: volta todas as etapas para o estado inicial ──────────────────
function resetSteps() {
  [1, 2, 3, 4].forEach(n => {
    const el = document.getElementById('step' + n);
    if (!el) return;
    el.classList.remove('active', 'done', 'error');
    const statusEl = el.querySelector('.step__status');
    if (statusEl) statusEl.textContent = '';
  });
  if (step3Detail) step3Detail.textContent = '';
  setProgress(0);
}

function resetBtn() {
  runBtn.disabled = false;
  runBtn.classList.remove('running');
  btnLabel.textContent = 'Processar Novamente';
}

function formatTime(s) {
  return Math.floor(s / 60) + ':' + Math.floor(s % 60).toString().padStart(2, '0');
}
