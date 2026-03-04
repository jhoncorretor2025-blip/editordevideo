// script.js (COLE TODO ESTE ARQUIVO, substituindo o anterior)
// Versão: correção robusta para feedback, carregamento e processamento com FFmpeg.wasm
// Observações: precisa do <script src="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.6/dist/ffmpeg.min.js"></script> no index.html

const { createFFmpeg, fetchFile } = FFmpeg; // import do bundle carregado via CDN

// Inicializa o FFmpeg (não carrega ainda para não travar imediatamente)
const ffmpeg = createFFmpeg({ log: true });

// Elementos do DOM
let videoInput, dropArea, originalPreview, finalPreview, processBtn, statusText, progressBar, downloadBtn;
let minSilenceInput, thresholdInput, fileInfoEl;

let videoFile = null;
let isProcessing = false;

/* -------------------------
   Inicialização ao carregar
   ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // Referências
  videoInput = document.getElementById("videoInput");
  dropArea = document.getElementById("dropArea");
  originalPreview = document.getElementById("originalPreview");
  finalPreview = document.getElementById("finalPreview");
  processBtn = document.getElementById("processBtn");
  statusText = document.getElementById("statusText");
  progressBar = document.getElementById("progress");
  downloadBtn = document.getElementById("downloadBtn");

  minSilenceInput = document.getElementById("minSilence");
  thresholdInput = document.getElementById("threshold");

  // extra: elemento para mostrar nome/tamanho/duração (se existir)
  fileInfoEl = document.getElementById("fileInfo");

  // Listeners
  videoInput.addEventListener("change", onFileSelected);
  dropArea.addEventListener("dragover", (e) => e.preventDefault());
  dropArea.addEventListener("drop", onDrop);
  processBtn.addEventListener("click", onProcessClicked);

  // Carrega FFmpeg em segundo plano (não obrigatório, mas melhora UX)
  scheduleBackgroundFFmpegLoad();

  // Mostra mensagem inicial
  setStatus("Aguardando vídeo... ⚠️ Processamento pesado — pode demorar.", 0);
});

/* -------------------------
   Helpers de UI / status
   ------------------------- */
function setStatus(text, percent = null) {
  statusText.innerText = text;
  if (percent !== null) {
    progressBar.style.width = `${percent}%`;
  }
}

function showError(msg, err = null) {
  console.error(msg, err);
  setStatus("❌ Erro: " + msg, 0);
  alert(msg);
}

/* -------------------------
   Carregamento do FFmpeg
   ------------------------- */
async function loadFFmpegWithRetry(retries = 2) {
  // Evita carregar várias vezes
  if (ffmpeg.isLoaded && ffmpeg.isLoaded()) return true;

  try {
    setStatus("🔧 Carregando motor FFmpeg (pode demorar alguns segundos)...", 5);
    await ffmpeg.load();
    setStatus("⚙️ Motor FFmpeg pronto.", 0);
    return true;
  } catch (err) {
    console.warn("Erro ao carregar FFmpeg:", err);
    if (retries > 0) {
      setStatus("Tentando recarregar FFmpeg...", 5);
      await new Promise(r => setTimeout(r, 2000));
      return loadFFmpegWithRetry(retries - 1);
    } else {
      showError("Falha ao carregar FFmpeg. Cheque a conexão ou tente recarregar a página.");
      return false;
    }
  }
}

function scheduleBackgroundFFmpegLoad() {
  // Carrega quando o navegador estiver ocioso (se suportado)
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => { loadFFmpegWithRetry(); });
  } else {
    // fallback
    setTimeout(() => { loadFFmpegWithRetry(); }, 1500);
  }
}

/* -------------------------
   Evento: arquivo selecionado
   ------------------------- */
async function onFileSelected(e) {
  const f = e.target.files && e.target.files[0];
  await handleNewFile(f);
}

async function onDrop(e) {
  e.preventDefault();
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  await handleNewFile(f);
}

async function handleNewFile(f) {
  if (!f) return;
  videoFile = f;

  // Preview imediato
  try {
    originalPreview.src = URL.createObjectURL(videoFile);
  } catch (err) {
    console.warn("Erro ao criar preview:", err);
  }

  // Tamanho e nome
  const sizeMB = (videoFile.size / 1024 / 1024).toFixed(2);
  const name = videoFile.name;
  if (fileInfoEl) {
    fileInfoEl.innerText = `Arquivo: ${name} — ${sizeMB} MB`;
  }

  setStatus(`Arquivo selecionado: ${name} (${sizeMB} MB). Carregando metadados...`, 5);
  progressBar.style.width = "0%";

  // Tenta carregar FFmpeg em background para agilizar (não bloqueante)
  loadFFmpegWithRetry().catch(err => console.warn("FFmpeg load background falhou", err));

  // espera metadados do vídeo para mostrar duração
  originalPreview.onloadedmetadata = () => {
    const dur = originalPreview.duration;
    if (!isNaN(dur)) {
      const sec = Math.round(dur);
      setStatus(`Pronto: ${name} — ${sizeMB} MB — duração ~ ${sec}s. Ajuste parâmetros e clique em Processar.`, 0);
    } else {
      setStatus(`Pronto: ${name} — ${sizeMB} MB. Ajuste parâmetros e clique em Processar.`, 0);
    }
  };
}

/* -------------------------
   Evento: pressionou Processar
   ------------------------- */
async function onProcessClicked() {
  if (isProcessing) {
    alert("Já está processando um arquivo. Aguarde terminar.");
    return;
  }

  if (!videoFile) {
    alert("Selecione um vídeo primeiro.");
    return;
  }

  isProcessing = true;
  processBtn.disabled = true;
  downloadBtn.style.display = "none"; // esconde antes do novo resultado

  try {
    // Garante FFmpeg carregado
    const ok = await loadFFmpegWithRetry();
    if (!ok) throw new Error("FFmpeg não pôde ser carregado.");

    setStatus("✳️ Carregando vídeo para a memória do editor...", 10);

    // Escreve arquivo na FS virtual do ffmpeg
    // Nome fixo "input.mp4" para facilitar
    const inputName = "input.mp4";

    // Limpeza de arquivos antigos (tenta remover se existir)
    try { ffmpeg.FS('unlink', inputName); } catch(e){ /* ignore */ }
    try { ffmpeg.FS('unlink', 'output.mp4'); } catch(e){ /* ignore */ }

    // fetchFile converte File -> Uint8Array
    ffmpeg.FS("writeFile", inputName, await fetchFile(videoFile));

    const minSilence = (minSilenceInput && minSilenceInput.value) ? minSilenceInput.value : "0.5";
    const threshold = (thresholdInput && thresholdInput.value) ? thresholdInput.value : "-35";

    // Monta o filtro silenceremove dinamicamente
    // start_periods=1 -> removesilêncio no início (também aplica ao meio/final por comportamento do filtro)
    const silenceFilter = `silenceremove=start_periods=1:start_duration=${minSilence}:start_threshold=${threshold}dB`;

    setStatus("🔁 Processando vídeo (isso pode demorar — foco em qualidade)...", 20);

    // Logger do FFmpeg: opcional para mostrar mensagens
    ffmpeg.setLogger(({ type, message }) => {
      // escreve logs no console e também atualiza status com linhas relevantes
      // tipos: fferr, info, ffout
      console.log(`[ffmpeg ${type}] ${message}`);

      // extra: se aparecer "time=" na mensagem, atualiza barra de progresso baseada em padrões simples
      // (nem sempre preciso; ratio do setProgress é preferível)
      if (message.includes('time=')) {
        // tenta extrair tempo e mostrar como log curto (não altera porcentagem principal)
        setStatus(`Processando... ${message.split('\n')[0]}`, null);
      }
    });

    // Progresso real (ratio de 0..1)
    ffmpeg.setProgress(({ ratio }) => {
      // ratio pode não refletir reencode perfeitamente, mesmo assim ajuda
      const percent = Math.min(98, Math.round(ratio * 100));
      progressBar.style.width = `${percent}%`;
    });

    // Execução do FFmpeg:
    // - filtro de áudio silenceremove
    // - codec de vídeo libx264 para MP4 (alta qualidade com crf 18 e preset slow)
    // - -movflags +faststart para streaming progressivo (bom para web)
    await ffmpeg.run(
      "-i", inputName,
      "-af", silenceFilter,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "output.mp4"
    );

    setStatus("🧾 Finalizando arquivo e preparando download...", 95);

    // Lê arquivo gerado
    const data = ffmpeg.FS("readFile", "output.mp4");

    // Cria URL para preview e download
    const blob = new Blob([data.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);

    finalPreview.src = url;
    downloadBtn.href = url;
    downloadBtn.download = `jumpcut_result_${Date.now()}.mp4`;
    downloadBtn.style.display = "block";

    // Atualiza status final
    setStatus("✅ Processamento concluído! Assista o resultado e faça o download.", 100);

  } catch (err) {
    console.error("Erro no processamento:", err);
    showError("Erro durante o processamento. Veja o console para mais detalhes.");
  } finally {
    isProcessing = false;
    processBtn.disabled = false;
  }
}
