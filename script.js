// Verifica se o FFmpeg está disponível
if (typeof FFmpeg === 'undefined') {
    alert("Erro: Biblioteca FFmpeg não carregada. Verifique sua conexão com a internet.");
}

const { createFFmpeg, fetchFile } = FFmpeg;
let ffmpeg = null;
let videoFile = null;

// Elementos do DOM
const videoInput = document.getElementById("videoInput");
const dropArea = document.getElementById("dropArea");
const originalPreview = document.getElementById("originalPreview");
const previewContainer = document.getElementById("previewContainer");
const finalPreview = document.getElementById("finalPreview");
const processBtn = document.getElementById("processBtn");
const statusText = document.getElementById("statusText");
const progressBar = document.getElementById("progress");
const downloadBtn = document.getElementById("downloadBtn");
const resultSection = document.getElementById("resultSection");

// Inicializa o FFmpeg
async function initFFmpeg() {
    try {
        statusText.innerText = "Inicializando FFmpeg...";
        ffmpeg = createFFmpeg({ 
            log: true,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js'
        });
        
        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
        }
        
        statusText.innerText = "FFmpeg pronto! Aguardando vídeo...";
        return true;
    } catch (error) {
        console.error("Erro ao carregar FFmpeg:", error);
        statusText.innerText = "❌ Erro ao carregar FFmpeg. Recarregue a página.";
        return false;
    }
}

// Inicializa ao carregar a página
window.addEventListener('load', initFFmpeg);

// Upload tradicional
videoInput.addEventListener("change", (e) => {
    handleFileSelect(e.target.files[0]);
});

// Drag and Drop
dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

// Clique na área de drop
dropArea.addEventListener("click", () => {
    videoInput.click();
});

function handleFileSelect(file) {
    if (!file || !file.type.startsWith('video/')) {
        alert("Por favor, selecione um arquivo de vídeo válido.");
        return;
    }
    
    videoFile = file;
    originalPreview.src = URL.createObjectURL(videoFile);
    previewContainer.style.display = "block";
    resultSection.style.display = "none";
    downloadBtn.style.display = "none";
    statusText.innerText = "✓ Vídeo carregado. Pronto para processar!";
    progressBar.style.width = "0%";
}

processBtn.addEventListener("click", async () => {
    if (!videoFile) {
        alert("Selecione um vídeo primeiro.");
        return;
    }

    if (!ffmpeg || !ffmpeg.isLoaded()) {
        const initialized = await initFFmpeg();
        if (!initialized) return;
    }

    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

    try {
        statusText.innerText = "Preparando arquivos...";
        
        // Escreve o arquivo no sistema virtual
        ffmpeg.FS("writeFile", "input.mp4", await fetchFile(videoFile));

        // Pega valores dos inputs
        const minSilence = document.getElementById("minSilence").value || "0.5";
        const threshold = document.getElementById("threshold").value || "-50";

        // Configura filtro de silêncio
        const silenceFilter = `silenceremove=start_periods=1:start_duration=${minSilence}:start_threshold=${threshold}dB`;

        statusText.innerText = "Aplicando cortes de silêncio...";

        // Executa FFmpeg (CORREÇÃO: sem espaços nas strings)
        await ffmpeg.run(
            "-i", "input.mp4",
            "-af", silenceFilter,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "output.mp4"
        );

        statusText.innerText = "Finalizando...";
        
        // Lê o resultado
        const data = ffmpeg.FS("readFile", "output.mp4");
        
        // Cria URL para download
        const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
        
        finalPreview.src = url;
        downloadBtn.href = url;
        
        resultSection.style.display = "block";
        downloadBtn.style.display = "flex";
        progressBar.style.width = "100%";
        statusText.innerText = "✓ Processamento concluído!";
        
        // Limpa arquivos temporários
        ffmpeg.FS("unlink", "input.mp4");
        ffmpeg.FS("unlink", "output.mp4");

    } catch (error) {
        console.error("Erro no processamento:", error);
        statusText.innerText = "❌ Erro: " + error.message;
        alert("Erro ao processar vídeo: " + error.message);
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-play"></i> Processar Vídeo';
    }
});

// Listener de progresso
if (ffmpeg) {
    ffmpeg.setProgress(({ ratio }) => {
        const percentage = Math.round(ratio * 100);
        progressBar.style.width = `${percentage}%`;
        statusText.innerText = `Processando: ${percentage}%`;
    });
}
