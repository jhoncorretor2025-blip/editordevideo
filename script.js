const { createFFmpeg, fetchFile } = FFmpeg;

const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js',
    progress: ({ ratio }) => {
        const percent = Math.min(Math.round(ratio * 100), 100);
        progressBar.style.width = `${percent}%`;
        if (percent > 0 && percent < 100) {
            statusText.innerText = `⚙️ Processando: ${percent}%`;
        }
    }
});

let videoFile = null;
let ffmpegLoaded = false;

const videoInput    = document.getElementById("videoInput");
const dropArea      = document.getElementById("dropArea");
const previewContainer = document.getElementById("previewContainer");
const originalPreview  = document.getElementById("originalPreview");
const finalPreview  = document.getElementById("finalPreview");
const processBtn    = document.getElementById("processBtn");
const statusText    = document.getElementById("statusText");
const progressBar   = document.getElementById("progress");
const downloadBtn   = document.getElementById("downloadBtn");
const resultSection = document.getElementById("resultSection");

// ─── Carrega FFmpeg ────────────────────────────────────────────────────────────
async function initFFmpeg() {
    try {
        setStatus("Carregando FFmpeg (pode demorar)...", "#ffcc00");
        await ffmpeg.load();
        ffmpegLoaded = true;
        setStatus("✅ FFmpeg pronto! Selecione um vídeo.", "#00ffcc");
    } catch (err) {
        console.error("Erro ao carregar FFmpeg:", err);
        setStatus("❌ Erro ao carregar FFmpeg. Verifique o console e recarregue.", "#ff4444");
    }
}

window.addEventListener('load', initFFmpeg);

// ─── Upload / Drag-and-Drop ────────────────────────────────────────────────────
videoInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
});
dropArea.addEventListener("dragleave", () => dropArea.classList.remove("dragover"));
dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
    handleFile(e.dataTransfer.files[0]);
});
dropArea.addEventListener("click", () => videoInput.click());

function handleFile(file) {
    if (!file || !file.type.startsWith('video/')) {
        alert("Por favor, selecione um arquivo de vídeo válido.");
        return;
    }
    videoFile = file;
    originalPreview.src = URL.createObjectURL(file);
    previewContainer.style.display = "block";
    resultSection.style.display = "none";
    setStatus(`✅ Vídeo carregado: ${file.name}`, "#00ffcc");
}

// ─── Processamento ─────────────────────────────────────────────────────────────
processBtn.addEventListener("click", async () => {
    if (!videoFile) { alert("Selecione um vídeo primeiro!"); return; }
    if (!ffmpegLoaded) { alert("FFmpeg ainda não terminou de carregar. Aguarde..."); return; }

    setBtn(false);
    progressBar.style.width = "0%";
    resultSection.style.display = "none";

    try {
        const minSilence = parseFloat(document.getElementById("minSilence").value) || 0.5;
        const threshold  = parseFloat(document.getElementById("threshold").value)  || -50;

        // ── Passo 1: Escreve o arquivo de entrada ──
        setStatus("📥 Carregando vídeo na memória...", "#00ccff");
        ffmpeg.FS("writeFile", "input.mp4", await fetchFile(videoFile));

        // ── Passo 2: Extrai áudio para detectar silêncios ──
        setStatus("🔍 Analisando áudio...", "#00ccff");
        await ffmpeg.run(
            "-i", "input.mp4",
            "-vn",                  // sem vídeo
            "-ar", "44100",
            "-ac", "1",
            "-f", "wav",
            "audio.wav"
        );

        // ── Passo 3: Detecta segmentos de silêncio via silencedetect ──
        // silencedetect imprime no log; capturamos via callback de log
        const silenceLog = [];
        const origLog = ffmpeg.setLogger;

        // Registra logger temporário
        ffmpeg.setLogger(({ message }) => {
            silenceLog.push(message);
        });

        await ffmpeg.run(
            "-i", "audio.wav",
            "-af", `silencedetect=noise=${threshold}dB:duration=${minSilence}`,
            "-f", "null",
            "-"
        );

        ffmpeg.setLogger(({ type, message }) => {
            if (type === "fferr") console.log(message);
        });

        // ── Passo 4: Parse dos intervalos de silêncio ──
        const duration = await getVideoDuration();
        const silences = parseSilences(silenceLog.join("\n"));

        console.log("Silences detectados:", silences);

        // ── Passo 5: Converte silences → segmentos a manter ──
        const segments = silencesToKeep(silences, duration, 0.05); // 50ms padding

        if (segments.length === 0) {
            setStatus("⚠️ Nenhum silêncio encontrado com esses parâmetros.", "#ffcc00");
            cleanup();
            setBtn(true);
            return;
        }

        console.log(`Segmentos a manter (${segments.length}):`, segments);

        // ── Passo 6: Corta e concatena segmentos ──
        setStatus(`✂️ Cortando ${segments.length} segmentos...`, "#00ccff");
        progressBar.style.width = "10%";

        // Gera arquivo de lista para concat
        const segFiles = [];
        for (let i = 0; i < segments.length; i++) {
            const { start, end } = segments[i];
            const segName = `seg_${i}.mp4`;
            await ffmpeg.run(
                "-ss", String(start),
                "-to", String(end),
                "-i", "input.mp4",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "23",
                "-c:a", "aac",
                "-avoid_negative_ts", "make_zero",
                "-y",
                segName
            );
            segFiles.push(segName);
            progressBar.style.width = `${10 + Math.round((i / segments.length) * 70)}%`;
        }

        // ── Passo 7: Concatena todos os segmentos ──
        setStatus("🔗 Concatenando segmentos...", "#00ccff");
        progressBar.style.width = "80%";

        const concatList = segFiles.map(f => `file '${f}'`).join("\n");
        ffmpeg.FS("writeFile", "concat.txt", new TextEncoder().encode(concatList));

        await ffmpeg.run(
            "-f", "concat",
            "-safe", "0",
            "-i", "concat.txt",
            "-c", "copy",
            "-y",
            "output.mp4"
        );

        // ── Passo 8: Lê resultado ──
        setStatus("📤 Finalizando...", "#00ccff");
        progressBar.style.width = "95%";

        const data = ffmpeg.FS("readFile", "output.mp4");
        const url  = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));

        finalPreview.src = url;
        downloadBtn.href = url;
        resultSection.style.display = "block";
        progressBar.style.width = "100%";

        const saved = duration > 0
            ? ` (${((1 - segments.reduce((a, s) => a + s.end - s.start, 0) / duration) * 100).toFixed(1)}% removido)`
            : "";
        setStatus(`✅ Concluído! ${segments.length} segmentos mantidos${saved}.`, "#00ff88");

        // Limpa arquivos temporários
        cleanup(["input.mp4", "audio.wav", "concat.txt", ...segFiles, "output.mp4"]);

    } catch (err) {
        console.error("Erro:", err);
        setStatus(`❌ Erro: ${err.message}`, "#ff4444");
    } finally {
        setBtn(true);
    }
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(msg, color = "#a1a1aa") {
    statusText.innerText = msg;
    statusText.style.color = color;
}

function setBtn(enabled) {
    processBtn.disabled = !enabled;
    processBtn.innerHTML = enabled
        ? '<i class="fas fa-play"></i> Processar Vídeo'
        : '⏳ Processando...';
    processBtn.style.background = enabled ? "" : "#666";
}

async function getVideoDuration() {
    return new Promise((resolve) => {
        const tmp = document.createElement("video");
        tmp.src = URL.createObjectURL(videoFile);
        tmp.addEventListener("loadedmetadata", () => resolve(tmp.duration));
        tmp.addEventListener("error", () => resolve(0));
    });
}

/**
 * Faz parse do log do silencedetect e retorna array de { start, end }
 */
function parseSilences(log) {
    const silences = [];
    let current = {};

    for (const line of log.split("\n")) {
        const startMatch = line.match(/silence_start:\s*([\d.]+)/);
        const endMatch   = line.match(/silence_end:\s*([\d.]+)/);

        if (startMatch) {
            current = { start: parseFloat(startMatch[1]) };
        }
        if (endMatch && current.start !== undefined) {
            current.end = parseFloat(endMatch[1]);
            silences.push({ ...current });
            current = {};
        }
    }

    // silêncio que vai até o fim sem silence_end
    if (current.start !== undefined && current.end === undefined) {
        silences.push({ start: current.start, end: Infinity });
    }

    return silences;
}

/**
 * Converte intervalos de silêncio em segmentos a manter
 * padding: segundos extras ao redor de cada corte para evitar clipping
 */
function silencesToKeep(silences, duration, padding = 0.05) {
    if (silences.length === 0) return [{ start: 0, end: duration }];

    const keep = [];
    let cursor = 0;

    for (const { start, end } of silences) {
        const segEnd = Math.max(0, start - padding);
        if (segEnd - cursor > 0.1) {  // ignora segmentos < 100ms
            keep.push({ start: cursor, end: segEnd });
        }
        cursor = Math.min(end + padding, duration);
    }

    // Último segmento após o último silêncio
    if (duration - cursor > 0.1) {
        keep.push({ start: cursor, end: duration });
    }

    return keep;
}

function cleanup(files = []) {
    for (const f of files) {
        try { ffmpeg.FS("unlink", f); } catch (_) {}
    }
}
