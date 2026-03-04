const { createFFmpeg, fetchFile } = FFmpeg;

// Inicializa FFmpeg com configuração correta
const ffmpeg = createFFmpeg({ 
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js'
});

let videoFile = null;
let ffmpegLoaded = false;

// Elementos do DOM (CORREÇÃO: removidos espaços dos IDs)
const videoInput = document.getElementById("videoInput");
const dropArea = document.getElementById("dropArea");
const originalPreview = document.getElementById("originalPreview");
const finalPreview = document.getElementById("finalPreview");
const processBtn = document.getElementById("processBtn");
const statusText = document.getElementById("statusText");
const progressBar = document.getElementById("progress");
const downloadBtn = document.getElementById("downloadBtn");

// Carrega FFmpeg ao iniciar
async function initFFmpeg() {
    try {
        statusText.innerText = "Carregando FFmpeg...";
        statusText.style.color = "#ffcc00";
        
        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
        }
        
        ffmpegLoaded = true;
        statusText.innerText = "FFmpeg pronto! Aguardando vídeo...";
        statusText.style.color = "#00ffcc";
        console.log("✅ FFmpeg carregado com sucesso!");
    } catch (error) {
        console.error("❌ Erro ao carregar FFmpeg:", error);
        statusText.innerText = "❌ Erro ao carregar FFmpeg. Recarregue a página.";
        statusText.style.color = "#ff4444";
    }
}

// Inicializa ao carregar página
window.addEventListener('load', initFFmpeg);

// Upload
videoInput.addEventListener("change", (e) => {
    handleFile(e.target.files[0]);
});

// Drag and Drop
dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.style.borderColor = "#00ffcc";
});

dropArea.addEventListener("dragleave", () => {
    dropArea.style.borderColor = "#555";
});

dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.style.borderColor = "#555";
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
    originalPreview.style.display = "block";
    statusText.innerText = `✓ Vídeo carregado: ${file.name}`;
    statusText.style.color = "#00ffcc";
}

processBtn.addEventListener("click", async () => {
    if (!videoFile) {
        alert("Selecione um vídeo primeiro!");
        return;
    }

    if (!ffmpegLoaded) {
        alert("FFmpeg ainda não carregou. Aguarde...");
        return;
    }

    processBtn.disabled = true;
    processBtn.innerHTML = '⏳ Processando...';
    processBtn.style.background = "#666";

    try {
        statusText.innerText = "Processando vídeo...";
        statusText.style.color = "#00ccff";
        progressBar.style.width = "0%";

        // Escreve arquivo
        ffmpeg.FS("writeFile", "input.mp4", await fetchFile(videoFile));

        // Pega valores
        const minSilence = document.getElementById("minSilence").value || "0.5";
        const threshold = document.getElementById("threshold").value || "-50";

        console.log(`Configurações: minSilence=${minSilence}s, threshold=${threshold}dB`);

        // CORREÇÃO: removidos espaços das strings
        await ffmpeg.run(
            "-i", "input.mp4",
            "-af", `silenceremove=start_periods=1:start_duration=${minSilence}:start_threshold=${threshold}dB`,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "output.mp4"
        );

        // Lê resultado
        const data = ffmpeg.FS("readFile", "output.mp4");
        
        // Cria URL
        const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
        
        finalPreview.src = url;
        finalPreview.style.display = "block";
        downloadBtn.href = url;
        downloadBtn.style.display = "block";
        
        progressBar.style.width = "100%";
        statusText.innerText = "✓ Finalizado! Vídeo pronto para download.";
        statusText.style.color = "#00ff88";

        // Limpa arquivos
        ffmpeg.FS("unlink", "input.mp4");
        ffmpeg.FS("unlink", "output.mp4");

    } catch (error) {
        console.error("❌ Erro:", error);
        statusText.innerText = `❌ Erro: ${error.message}`;
        statusText.style.color = "#ff4444";
        alert("Erro ao processar: " + error.message);
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = '▶ Processar Vídeo';
        processBtn.style.background = "#00cc88";
    }
});

// Progresso
ffmpeg.setProgress(({ ratio }) => {
    const percent = Math.round(ratio * 100);
    progressBar.style.width = `${percent}%`;
    statusText.innerText = `Processando: ${percent}%`;
});
