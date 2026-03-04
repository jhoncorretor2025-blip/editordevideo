const { createFFmpeg, fetchFile } = FFmpeg;

// Inicializa o FFmpeg corretamente
const ffmpeg = createFFmpeg({ 
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js'
});

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

let videoFile = null;

// Carrega o FFmpeg ao iniciar
async function initFFmpeg() {
    try {
        if (!ffmpeg.isLoaded()) {
            statusText.innerText = "Carregando FFmpeg...";
            await ffmpeg.load();
            statusText.innerText = "FFmpeg pronto!";
        }
    } catch (error) {
        console.error("Erro ao carregar FFmpeg:", error);
        statusText.innerText = "❌ Erro ao carregar FFmpeg. Recarregue a página.";
    }
}

// Inicializa ao carregar a página
initFFmpeg();

// Upload tradicional
videoInput.addEventListener("change", (e) => {
    handleFile(e.target.files[0]);
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
    handleFile(e.dataTransfer.files[0]);
});

dropArea.addEventListener("click", () => {
    videoInput.click();
});

function handleFile(file) {
    if (!file || !file.type.startsWith('video/')) {
        alert("Por favor, selecione um arquivo de vídeo válido.");
        return;
    }
    
    videoFile = file;
    originalPreview.src = URL.createObjectURL(videoFile);
    if (previewContainer) {
        previewContainer.style.display = "block";
    }
    statusText.innerText = "✓ Vídeo carregado! Pronto para processar.";
}

processBtn.addEventListener("click", async () => {
    if (!videoFile) {
        alert("Selecione um vídeo primeiro!");
        return;
    }

    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

    try {
        // Verifica se FFmpeg está carregado
        if (!ffmpeg.isLoaded()) {
            await initFFmpeg();
        }

        statusText.innerText = "Preparando arquivos...";
        
        // Escreve o arquivo
        ffmpeg.FS("writeFile", "input.mp4", await fetchFile(videoFile));

        // Pega os valores
        const minSilence = document.getElementById("minSilence").value || "0.5";
        const threshold = document.getElementById("threshold").value || "-50";

        statusText.innerText = `Aplicando corte (silêncio > ${minSilence}s, threshold: ${threshold}dB)...`;

        // CORREÇÃO: Remove os espaços das strings!
        await ffmpeg.run(
            "-i", "input.mp4",
            "-af", `silenceremove=start_periods=1:start_duration=${minSilence}:start_threshold=${threshold}dB`,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "output.mp4"
        );

        statusText.innerText = "Finalizando...";
        
        // Lê o arquivo de saída
        const data = ffmpeg.FS("readFile", "output.mp4");
        
        // Cria URL para download
        const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
        
        finalPreview.src = url;
        downloadBtn.href = url;
        downloadBtn.style.display = "block";
        
        if (resultSection) {
            resultSection.style.display = "block";
            resultSection.scrollIntoView({ behavior: "smooth" });
        }
        
        progressBar.style.width = "100%";
        statusText.innerText = "✓ Processamento concluído!";
        
        // Limpa arquivos temporários
        ffmpeg.FS("unlink", "input.mp4");
        ffmpeg.FS("unlink", "output.mp4");

    } catch (error) {
        console.error("Erro:", error);
        statusText.innerText = "❌ Erro: " + error.message;
        alert("Erro ao processar vídeo: " + error.message);
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-play"></i> Processar Vídeo';
    }
});

// Atualiza barra de progresso
ffmpeg.setProgress(({ ratio }) => {
    const percent = Math.round(ratio * 100);
    progressBar.style.width = `${percent}%`;
    statusText.innerText = `Processando: ${percent}%`;
});
