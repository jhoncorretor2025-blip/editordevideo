let videoFile = null;
let audioContext = null;
let audioBuffer = null;
let silenceRanges = [];
let videoDuration = 0;

// Elementos do DOM
const videoInput = document.getElementById("videoInput");
const dropArea = document.getElementById("dropArea");
const originalPreview = document.getElementById("originalPreview");
const finalPreview = document.getElementById("finalPreview");
const previewContainer = document.getElementById("previewContainer");
const processBtn = document.getElementById("processBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusText = document.getElementById("statusText");
const progressBar = document.getElementById("progress");
const downloadBtn = document.getElementById("downloadBtn");
const resultSection = document.getElementById("resultSection");
const waveformContainer = document.getElementById("waveform");

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
    processBtn.disabled = true;
    analyzeBtn.disabled = false;
    updateStatus("Vídeo carregado. Clique em 'Analisar Áudio'.");
    progressBar.style.width = "0%";
    
    // Carrega duração do vídeo
    originalPreview.onloadedmetadata = () => {
        videoDuration = originalPreview.duration;
        updateStatus(`Vídeo carregado (${videoDuration.toFixed(1)}s). Clique em 'Analisar Áudio'.`);
    };
}

analyzeBtn.addEventListener("click", async () => {
    if (!videoFile) {
        alert("Selecione um vídeo primeiro.");
        return;
    }
    
    analyzeBtn.disabled = true;
    updateStatus("Analisando áudio...", true);
    
    try {
        // Cria AudioContext
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Extrai áudio do vídeo
        const arrayBuffer = await videoFile.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Detecta silêncios
        detectSilence();
        
        // Desenha waveform
        drawWaveform();
        
        analyzeBtn.disabled = false;
        processBtn.disabled = silenceRanges.length === 0;
        updateStatus(`Análise concluída! ${silenceRanges.length} períodos de silêncio detectados.`);
        
    } catch (error) {
        console.error("Erro na análise:", error);
        updateStatus("❌ Erro na análise: " + error.message);
        analyzeBtn.disabled = false;
    }
});

function detectSilence() {
    const minSilence = parseFloat(document.getElementById("minSilence").value) || 0.5;
    const threshold = parseFloat(document.getElementById("threshold").value) || -50;
    
    silenceRanges = [];
    const channelData = audioBuffer.getChannelData(0); // Canal esquerdo
    const sampleRate = audioBuffer.sampleRate;
    
    // Converte threshold dB para amplitude
    const amplitudeThreshold = Math.pow(10, threshold / 20);
    
    let silenceStart = -1;
    let samplesPerCheck = Math.floor(sampleRate / 10); // Check a cada 100ms
    
    for (let i = 0; i < channelData.length; i += samplesPerCheck) {
        // Calcula RMS (Root Mean Square) para este bloco
        let sum = 0;
        const blockSize = Math.min(samplesPerCheck, channelData.length - i);
        
        for (let j = 0; j < blockSize; j++) {
            sum += channelData[i + j] * channelData[i + j];
        }
        
        const rms = Math.sqrt(sum / blockSize);
        const time = i / sampleRate;
        
        if (rms < amplitudeThreshold) {
            if (silenceStart === -1) {
                silenceStart = time;
            }
        } else {
            if (silenceStart !== -1) {
                const silenceDuration = time - silenceStart;
                if (silenceDuration >= minSilence) {
                    silenceRanges.push({
                        start: silenceStart,
                        end: time,
                        duration: silenceDuration
                    });
                }
                silenceStart = -1;
            }
        }
    }
    
    // Verifica se terminou em silêncio
    if (silenceStart !== -1) {
        const silenceDuration = (channelData.length / sampleRate) - silenceStart;
        if (silenceDuration >= minSilence) {
            silenceRanges.push({
                start: silenceStart,
                end: channelData.length / sampleRate,
                duration: silenceDuration
            });
        }
    }
    
    console.log("Silêncios detectados:", silenceRanges);
}

function drawWaveform() {
    const canvas = document.createElement("canvas");
    canvas.width = waveformContainer.offsetWidth;
    canvas.height = waveformContainer.offsetHeight;
    waveformContainer.innerHTML = "";
    waveformContainer.appendChild(canvas);
    
    const ctx = canvas.getContext("2d");
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / canvas.width);
    const amp = canvas.height / 2;
    
    // Desenha waveform completo
    ctx.fillStyle = "#2d313a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    ctx.strokeStyle = "#00dc82";
    ctx.lineWidth = 1;
    
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0;
        let max = -1.0;
        
        for (let j = 0; j < step; j++) {
            const datum = channelData[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        
        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }
    
    ctx.stroke();
    
    // Desenha áreas de silêncio em vermelho
    silenceRanges.forEach(range => {
        const startX = (range.start / videoDuration) * canvas.width;
        const endX = (range.end / videoDuration) * canvas.width;
        
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.fillRect(startX, 0, endX - startX, canvas.height);
    });
}

processBtn.addEventListener("click", async () => {
    if (!videoFile || silenceRanges.length === 0) {
        alert("Nenhum silêncio detectado ou vídeo não carregado.");
        return;
    }
    
    processBtn.disabled = true;
    analyzeBtn.disabled = true;
    updateStatus("Processando vídeo...", true);
    
    try {
        // Cria elementos para processamento
        const video = document.createElement("video");
        video.src = URL.createObjectURL(videoFile);
        video.muted = false;
        await new Promise(resolve => video.onloadeddata = resolve);
        
        // Cria canvas para capturar frames
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        
        // Cria stream de vídeo
        const videoStream = canvas.captureStream(30); // 30 FPS
        
        // Cria stream de áudio
        const audioDest = audioContext.createMediaStreamDestination();
        const source = audioContext.createMediaElementSource(video);
        source.connect(audioDest);
        
        // Combina streams
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioDest.stream.getAudioTracks()
        ]);
        
        // Configura MediaRecorder
        const mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: "video/webm;codecs=vp9,opus"
        });
        
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            
            finalPreview.src = url;
            downloadBtn.href = url;
            downloadBtn.download = "video_editado.webm";
            downloadBtn.style.display = "flex";
            resultSection.style.display = "block";
            
            updateStatus("✓ Processamento concluído!");
            progressBar.style.width = "100%";
            
            processBtn.disabled = false;
            analyzeBtn.disabled = false;
        };
        
        // Calcula segmentos para manter (invertendo silêncios)
        const keepSegments = [];
        let currentTime = 0;
        
        silenceRanges.sort((a, b) => a.start - b.start);
        
        silenceRanges.forEach((silence, index) => {
            if (currentTime < silence.start) {
                keepSegments.push({
                    start: currentTime,
                    end: silence.start
                });
            }
            currentTime = silence.end;
            
            // Último segmento
            if (index === silenceRanges.length - 1 && currentTime < videoDuration) {
                keepSegments.push({
                    start: currentTime,
                    end: videoDuration
                });
            }
        });
        
        // Se não há silêncios, mantém tudo
        if (keepSegments.length === 0) {
            keepSegments.push({ start: 0, end: videoDuration });
        }
        
        console.log("Segmentos para manter:", keepSegments);
        
        // Inicia gravação
        mediaRecorder.start();
        
        // Processa cada segmento
        for (const segment of keepSegments) {
            updateStatus(`Processando: ${segment.start.toFixed(1)}s - ${segment.end.toFixed(1)}s`);
            
            video.currentTime = segment.start;
            await new Promise(resolve => video.onseeked = resolve);
            video.play();
            
            // Grava até o fim do segmento
            await new Promise(resolve => {
                const checkTime = () => {
                    if (video.currentTime >= segment.end) {
                        video.pause();
                        resolve();
                    } else {
                        requestAnimationFrame(checkTime);
                    }
                };
                checkTime();
            });
            
            // Atualiza progresso
            const progress = (segment.end / videoDuration) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        // Para gravação
        mediaRecorder.stop();
        video.pause();
        
    } catch (error) {
        console.error("Erro no processamento:", error);
        updateStatus("❌ Erro: " + error.message);
        processBtn.disabled = false;
        analyzeBtn.disabled = false;
    }
});

function updateStatus(message, isLoading = false) {
    statusText.innerText = message;
    if (isLoading) {
        statusText.classList.add("loading-dots");
    } else {
        statusText.classList.remove("loading-dots");
    }
}
