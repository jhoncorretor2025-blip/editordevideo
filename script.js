const { createFFmpeg, fetchFile } = FFmpeg;

// Inicializa FFmpeg
const ffmpeg = createFFmpeg({
  log: true
});

const videoInput = document.getElementById("videoInput");
const dropArea = document.getElementById("dropArea");
const originalPreview = document.getElementById("originalPreview");
const finalPreview = document.getElementById("finalPreview");
const processBtn = document.getElementById("processBtn");
const statusText = document.getElementById("statusText");
const progressBar = document.getElementById("progress");
const downloadBtn = document.getElementById("downloadBtn");

let videoFile = null;

/* ===============================
   FUNÇÃO PARA MOSTRAR STATUS
================================= */
function setStatus(text, progress = null) {
  statusText.innerText = text;
  if (progress !== null) {
    progressBar.style.width = progress + "%";
  }
}

/* ===============================
   CARREGAR FFMPEG EM BACKGROUND
================================= */
async function loadFFmpegIfNeeded() {
  if (!ffmpeg.isLoaded()) {
    setStatus("Preparando motor de edição...", 5);
    await ffmpeg.load();
  }
}

/* ===============================
   AO SELECIONAR VÍDEO
================================= */
videoInput.addEventListener("change", async (e) => {
  videoFile = e.target.files[0];
  if (!videoFile) return;

  originalPreview.src = URL.createObjectURL(videoFile);

  const sizeMB = (videoFile.size / 1024 / 1024).toFixed(2);
  setStatus(`Vídeo selecionado (${sizeMB} MB). Preparando ambiente...`, 10);

  await loadFFmpegIfNeeded();
  setStatus(`Vídeo pronto para processar (${sizeMB} MB).`, 0);
});

/* ===============================
   DRAG AND DROP
================================= */
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
});

dropArea.addEventListener("drop", async (e) => {
  e.preventDefault();
  videoFile = e.dataTransfer.files[0];
  if (!videoFile) return;

  originalPreview.src = URL.createObjectURL(videoFile);

  const sizeMB = (videoFile.size / 1024 / 1024).toFixed(2);
  setStatus(`Vídeo selecionado (${sizeMB} MB). Preparando ambiente...`, 10);

  await loadFFmpegIfNeeded();
  setStatus(`Vídeo pronto para processar (${sizeMB} MB).`, 0);
});

/* ===============================
   PROCESSAR VÍDEO
================================= */
processBtn.addEventListener("click", async () => {

  if (!videoFile) {
    alert("Selecione um vídeo primeiro.");
    return;
  }

  try {

    setStatus("Carregando vídeo na memória...", 15);

    // Escreve arquivo na memória virtual
    ffmpeg.FS("writeFile", "input.mp4", await fetchFile(videoFile));

    const minSilence = document.getElementById("minSilence").value;
    const threshold = document.getElementById("threshold").value;

    // Configuração dinâmica do silenceremove
    const silenceFilter =
      `silenceremove=start_periods=1:start_duration=${minSilence}:start_threshold=${threshold}dB`;

    setStatus("Processando vídeo (isso pode demorar)...", 20);

    // Atualiza progresso real
    ffmpeg.setProgress(({ ratio }) => {
      const percent = Math.min(100, Math.round(ratio * 100));
      progressBar.style.width = percent + "%";
    });

    await ffmpeg.run(
      "-i", "input.mp4",
      "-af", silenceFilter,
      "-c:v", "libx264",
      "-preset", "slow",     // melhor qualidade
      "-crf", "18",          // CRF baixo = alta qualidade
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "output.mp4"
    );

    setStatus("Finalizando arquivo...", 95);

    const data = ffmpeg.FS("readFile", "output.mp4");

    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: "video/mp4" })
    );

    finalPreview.src = url;
    downloadBtn.href = url;
    downloadBtn.style.display = "block";

    setStatus("Processamento finalizado com sucesso!", 100);

  } catch (error) {
    console.error(error);
    setStatus("Erro durante o processamento.", 0);
    alert("Ocorreu um erro ao processar o vídeo.");
  }
});
