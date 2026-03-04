const { createFFmpeg, fetchFile } = FFmpeg;

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

let videoFile;

// Upload tradicional
videoInput.addEventListener("change", (e) => {
  videoFile = e.target.files[0];
  originalPreview.src = URL.createObjectURL(videoFile);
});

// Drag and Drop
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  videoFile = e.dataTransfer.files[0];
  originalPreview.src = URL.createObjectURL(videoFile);
});

processBtn.addEventListener("click", async () => {

  if (!videoFile) return alert("Selecione um vídeo primeiro.");

  statusText.innerText = "Carregando FFmpeg...";
  
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  statusText.innerText = "Processando vídeo...";

  ffmpeg.setProgress(({ ratio }) => {
    progressBar.style.width = `${ratio * 100}%`;
  });

  ffmpeg.FS("writeFile", "input.mp4", await fetchFile(videoFile));

  const minSilence = document.getElementById("minSilence").value;
  const threshold = document.getElementById("threshold").value;

  /*
    Aqui configuramos o silenceremove.
    Parâmetros dinâmicos vindos do painel.
  */
  const silenceFilter = 
    `silenceremove=start_periods=1:start_duration=${minSilence}:start_threshold=${threshold}dB`;

  await ffmpeg.run(
    "-i", "input.mp4",
    "-af", silenceFilter,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "18",     // CRF baixo = alta qualidade
    "-pix_fmt", "yuv420p",
    "output.mp4"
  );

  const data = ffmpeg.FS("readFile", "output.mp4");
  const url = URL.createObjectURL(
    new Blob([data.buffer], { type: "video/mp4" })
  );

  finalPreview.src = url;
  downloadBtn.href = url;
  downloadBtn.style.display = "block";

  statusText.innerText = "Finalizado!";
});