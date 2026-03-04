const { createFFmpeg, fetchFile } = FFmpeg;

// Inicializa o FFmpeg com log ativado para debug
const ffmpeg = createFFmpeg({ log: true });

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

let videoFile = null;

// Função para atualizar o status com animação de loading
function updateStatus(message, isLoading = false) {
    statusText.innerText = message;
    if (isLoading) {
        statusText.classList.add("loading-dots");
    } else {
        statusText.classList.remove("loading-dots");
    }
}

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

// Clique na área de drop abre o input
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
    resultSection.style.display = "none"; // Esconde resultado anterior
    downloadBtn.style.display = "none";
    updateStatus("Vídeo carregado. Pronto para processar.");
    progressBar.style.width = "0%";
}

processBtn.addEventListener("click", async () => {
    if (!videoFile) {
        alert("Selecione um vídeo primeiro.");
        return;
    }

    // Bloqueia botão durante processo
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

    try {
        // 1. Carregar FFmpeg se não estiver carregado
        if (!ffmpeg.isLoaded()) {
            updateStatus("Carregando motor FFmpeg...", true);
            await ffmpeg.load();
        }

        // 2. Escrever arquivo no sistema virtual do FFmpeg
        updateStatus("Preparando arquivos...", true);
        ffmpeg.FS("writeFile", "input.mp4", await fetchFile(videoFile));

        // 3. Pegar valores dos inputs
        const minSilence = document.getElementById("minSilence").value || "0.5";
        const threshold = document.getElementById("threshold").value || "-50";

        // 4. Configurar filtro de silêncio
        // Nota: A sintaxe do silenceremove pode variar, esta é a padrão do ffmpeg
        const silenceFilter = `silenceremove=start_periods=1:start_duration=${minSilence}:start_threshold=${threshold}dB`;

        updateStatus("Aplicando cortes de silêncio...", true);

        // 5. Executar FFmpeg
        // CORREÇÃO CRÍTICA: Removidos os espaços dentro das strings dos argumentos
        await ffmpeg.run(
            "-i", "input.mp4",
            "-af", silenceFilter,
            "-c:v", "libx264",
            "-preset", "medium", // 'slow' é muito pesado para navegador, 'medium' é melhor
            "-crf", "23",        // Balanceado entre qualidade e tamanho
            "-pix_fmt", "yuv420p",
            "output.mp4"
        );

        // 6. Ler o resultado
        updateStatus("Finalizando...", true);
        const data = ffmpeg.FS("readFile", "output.mp4");

        // 7. Criar URL para download e preview
        const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
        
        finalPreview.src = url;
        downloadBtn.href = url;
        
        // 8. Atualizar UI
        resultSection.style.display = "block";
        downloadBtn.style.display = "flex";
        progressBar.style.width = "100%";
        updateStatus("Processamento concluído com sucesso!");
        
        // Limpar memória do FFmpeg (opcional, mas recomendado)
        ffmpeg.FS("unlink", "input.mp4");
        ffmpeg.FS("unlink", "output.mp4");

    } catch (error) {
        console.error(error);
        updateStatus("Erro no processamento: " + error.message);
        alert("Ocorreu um erro ao processar o vídeo. Verifique o console (F12) para detalhes.");
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-play"></i> Processar Vídeo';
    }
});

// Listener de progresso do FFmpeg
ffmpeg.setProgress(({ ratio }) => {
    const percentage = Math.round(ratio * 100);
    progressBar.style.width = `${percentage}%`;
    statusText.innerText = `Processando: ${percentage}%`;
});
