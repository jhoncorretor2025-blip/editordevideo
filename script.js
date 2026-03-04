 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/script.js b/script.js
index 1a3b9d82d31ee919e950239d30ed555ca822729d..18251b27d4b5c258c2981ba16799feffc831da36 100644
--- a/script.js
+++ b/script.js
@@ -157,64 +157,66 @@ async function processVideo() {
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
-    if (typeof VideoEncoder !== 'undefined' && typeof Mp4Muxer !== 'undefined') {
+    if (canEncodeMP4()) {
       setStatus('Codificando vídeo em H.264 + AAC (MP4)...', 'active', 25);
       finalBlob = await encodeMP4(videoFile, segments, audioBuf, (p) => {
         step3Detail.textContent = `${p.cur}/${p.total}`;
         setStatus(`Renderizando frame ${p.cur} de ${p.total}...`, 'active');
         setProgress(25 + Math.round(p.ratio * 60));
       });
-    } else {
+    } else if (canEncodeWebM()) {
       setStatus('WebCodecs indisponível — usando WebM (Firefox/Safari)...', 'active', 25);
       finalBlob = await encodeWebM(videoFile, segments, (p) => {
         step3Detail.textContent = `${p.cur}/${p.total}`;
         setStatus(`Capturando segmento ${p.cur} de ${p.total}...`, 'active');
         setProgress(25 + Math.round(p.ratio * 60));
       });
+    } else {
+      throw new Error('Este navegador não suporta os encoders necessários (WebCodecs/MediaRecorder).');
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
@@ -247,51 +249,51 @@ async function encodeMP4(file, segments, audioBuf, onProgress) {
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
-  let totalFrames = segments.reduce((s, g) => s + Math.round((g.end - g.start) * FPS), 0);
+  const totalFrames = Math.max(1, segments.reduce((s, g) => s + Math.round((g.end - g.start) * FPS), 0));
 
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
@@ -432,50 +434,62 @@ function encodeWebM(file, segments, onProgress) {
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
 
+function canEncodeMP4() {
+  return typeof VideoEncoder !== 'undefined'
+    && typeof AudioEncoder !== 'undefined'
+    && typeof VideoFrame !== 'undefined'
+    && typeof AudioData !== 'undefined'
+    && typeof Mp4Muxer !== 'undefined';
+}
+
+function canEncodeWebM() {
+  return typeof MediaRecorder !== 'undefined';
+}
+
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
 
EOF
)
