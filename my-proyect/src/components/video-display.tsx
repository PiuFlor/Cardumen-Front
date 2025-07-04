"use client"
import { useEffect, useRef, useState, useCallback } from "react"

interface VideoDisplayProps {
  videoSource: "file" | "webcam" | "stream"
  streamUrl?: string  // para fuente YouTube
  videoFile: File | null
  isAnalyzing: boolean
  framework: "yolo" | "mediapipe"
  model: string
  max_latency: number | null
  onProcessingComplete?: (url: string, taskId: string) => void
  processedUrl?: string | null
  fps: string
  res: string
}

export default function VideoDisplay({
  videoSource,
  streamUrl,
  videoFile,
  isAnalyzing,
  framework,
  model,
  max_latency,
  onProcessingComplete,
  processedUrl,
  fps,
  res
}: VideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const processedCanvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState("Presiona 'Iniciar Análisis'")
  const [isProcessing, setIsProcessing] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const wsFileRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  /* const [youtubeStreamUrl, setYoutubeStreamUrl] = useState<string | null>(null) */
  const [boxIds, setBoxIds] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [processedVideoId, setProcessedVideoId] = useState<string | null>(null)
  const [filteredVideoUrl, setFilteredVideoUrl] = useState<string | null>(null)

  
  // Buffer para almacenar frames procesados
  const frameBufferRef = useRef<{timestamp: number, image: string}[]>([])
  const lastRenderTimeRef = useRef<number>(0)
  const renderRequestRef = useRef<number | null>(null)


  const isMjpegUrl = (url: string | null): boolean => {
    if (!url) return false;
    
    const lowered = url.toLowerCase();

    return (
      lowered.startsWith("http") &&
      (
        lowered.includes(".mjpg") ||
        lowered.includes(".cgi") ||
        lowered.includes("faststream") ||
        lowered.includes("video") ||
        lowered.includes(".jpg") ||
        lowered.includes("getoneshot")
      )
    );
  };


  const startWebcam = async () => {
  try {
    setStatus("Iniciando cámara...");
    
    // 1. Detener cualquier stream existente primero
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // 2. Intentar con constraints más flexibles
    const constraints = {
      video: {
        width: { min: 320, ideal: 640, max: 1280 },
        height: { min: 240, ideal: 480, max: 720 },
        frameRate: { min: 15, ideal: 30 }
      } 
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
      .catch(async (err) => {
        // Fallback: intentar sin restricciones si falla
        console.warn("Intento con restricciones falló, probando sin restricciones...", err);
        return await navigator.mediaDevices.getUserMedia({ video: true });
      });

    streamRef.current = stream;

    // 3. Configurar el video
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Esperar a que el video esté listo
      await new Promise((resolve, reject) => {
        if (!videoRef.current) return reject();
        
        videoRef.current.onloadedmetadata = resolve;
        videoRef.current.onerror = () => reject(new Error("Error al cargar video"));
      });

      // Intentar reproducir
      await videoRef.current.play().catch(e => {
        throw new Error(`No se pudo reproducir: ${e.message}`);
      });

      setStatus("Cámara lista");
      
      // 4. Iniciar análisis automáticamente si está habilitado
      if (isAnalyzing) {
        connectWebSocket();
      }
    }
  } catch (error) {
    console.error("Error detallado:", error);
    setStatus(`Error: ${error instanceof Error ? error.message : "Falló la cámara"}`);
    
    // Limpiar en caso de error
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }
};

  const renderProcessedFrames = useCallback(() => {
    const now = performance.now()
    const canvas = processedCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    if (frameBufferRef.current.length > 0 && now - lastRenderTimeRef.current >= 16) {
      const nextFrame = frameBufferRef.current.shift()
      if (nextFrame) {
        const img = new Image()
        img.onload = () => {
          if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width
            canvas.height = img.height
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
        }
        img.src = `data:image/jpeg;base64,${nextFrame.image}`
        lastRenderTimeRef.current = now
      }
    }
    
    renderRequestRef.current = requestAnimationFrame(renderProcessedFrames)
  }, [])

  const connectWebSocket = () => {
    setStatus("Conectando al servidor...")
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }
    const ws = new WebSocket(
      `ws://localhost:8000/ws/image?tecnologia=${framework}&modelo=${model}&max_latency=${max_latency}`
    )
    wsRef.current = ws

    ws.onopen = () => {
      setStatus("Analizando en tiempo real...")
      frameBufferRef.current = []
      startFrameProcessing()
      renderRequestRef.current = requestAnimationFrame(renderProcessedFrames)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setStatus(`Analizando en tiempo real... ${data.fps}fps`)
      frameBufferRef.current.push({
        timestamp: performance.now(),
        image: data.frame
      })
      
      if (frameBufferRef.current.length > 30) {
        frameBufferRef.current = frameBufferRef.current.slice(-20)
      }
    }

    ws.onclose = () => {
      setStatus("Conexión cerrada")
      stopFrameProcessing()
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current)
        renderRequestRef.current = null
      }
    }

    ws.onerror = (error) => {
      console.error("Error en WebSocket:", error)
      setStatus("Error en la conexión")
    }
  }

  const startFrameProcessing = () => {
    if (!frameIntervalRef.current) {
      frameIntervalRef.current = setInterval(sendFrame, 33)
    }
  }

  const stopFrameProcessing = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
  }

  const sendFrame = () => {
    if (videoRef.current && canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (ctx && video.videoWidth > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          if (!blob) return
          const reader = new FileReader()
          reader.onload = () => {
            const base64Data = reader.result?.toString().split(',')[1]
            if (base64Data && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                timestamp: Date.now() / 1000,
                frame: base64Data
              }))
            }
          }
          reader.readAsDataURL(blob)
        }, 'image/jpeg', 0.85)
      }
    }
  }

  const connectFileWebSocket = (taskId: string) => {
    setCurrentTaskId(taskId)
    setStatus("Conectando para procesar archivo...")
    
    const ws = new WebSocket(`ws://localhost:8000/ws/progress/${taskId}`)
    wsFileRef.current = ws

    ws.onopen = () => {
      setStatus("Procesando archivo...")
      frameBufferRef.current = []
      renderRequestRef.current = requestAnimationFrame(renderProcessedFrames)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'frame') {
          frameBufferRef.current.push({
            timestamp: performance.now(),
            image: data.frame
          })
          
          if (frameBufferRef.current.length > 30) {
            frameBufferRef.current = frameBufferRef.current.slice(-20)
          }
          
          setStatus(`Procesando: ${Math.round(data.progress)}%`)
        }
        
        if (data.type === 'complete' && onProcessingComplete) {
          const videoUrl = `http://localhost:8000/${data.output_path}`
          onProcessingComplete(videoUrl, data.task_id)
          setStatus("Procesamiento completado")
          setProcessedVideoId(data.task_id)
          if (renderRequestRef.current) {
            cancelAnimationFrame(renderRequestRef.current)
            renderRequestRef.current = null
          }
        }
        
        if (data.type === 'error') {
          setStatus(`Error: ${data.message}`)
          setCurrentTaskId(null)
          if (renderRequestRef.current) {
            cancelAnimationFrame(renderRequestRef.current)
            renderRequestRef.current = null
          }
        }
        
        if (data.type === 'cancelled') {
          setStatus("Procesamiento cancelado")
          setCurrentTaskId(null)
          if (renderRequestRef.current) {
            cancelAnimationFrame(renderRequestRef.current)
            renderRequestRef.current = null
          }
        }
      } catch (e) {
        console.error("Error procesando mensaje WebSocket:", e)
      }
    }

    ws.onclose = () => {
      if (status !== "Procesamiento completado" && status !== "Procesamiento cancelado") {
        setStatus("Conexión cerrada")
      }
      setCurrentTaskId(null)
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current)
        renderRequestRef.current = null
      }
    }

    ws.onerror = (error) => {
      console.error("Error en WebSocket:", error)
      setStatus("Error en la conexión")
      setCurrentTaskId(null)
    }
  }

  const processFile = async () => {
    setIsProcessing(true)
    setStatus("Preparando archivo...")
    
    abortControllerRef.current = new AbortController()
    
    const formData = new FormData()
    formData.append('file', videoFile!)
    formData.append('tecnologia', framework)
    formData.append('modelo', model)
    formData.append('fps', fps)
    formData.append('res', res)

    try {
      const uploadResponse = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al subir el archivo')
      }

      const { task_id } = await uploadResponse.json()
      setCurrentTaskId(task_id)
      connectFileWebSocket(task_id)

    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error procesando archivo:', error)
        setStatus(error.message || 'Error al procesar el archivo')
      } else {
        setStatus("Procesamiento cancelado")
      }
      setCurrentTaskId(null)
    } finally {
      setIsProcessing(false)
      abortControllerRef.current = null
    }
  }

  const stopAnalysis = async () => {
    if (videoSource === "webcam") {
      stopFrameProcessing()
      if (wsRef.current) {
        wsRef.current.close()
      }
      setStatus("Análisis detenido")
    } else if (videoSource === "file") {
      if (wsFileRef.current) {
        wsFileRef.current.close()
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      if (currentTaskId) {
        try {
          await fetch(`http://localhost:8000/cancel/${currentTaskId}`, {
            method: 'POST'
          })
        } catch (e) {
          console.error("Error cancelando tarea en backend:", e)
        }
      }

      setIsProcessing(false)
      setStatus("Procesamiento cancelado")
      setCurrentTaskId(null)
    } else if (videoSource === "stream") {
        if (wsRef.current) {
          wsRef.current.close();
        }
        
        if (currentTaskId) {
          try {
            await fetch(`http://localhost:8000/cancel/${currentTaskId}`, {
              method: 'POST'
            })
          } catch (e) {
            console.error("Error cancelando tarea en backend:", e)
          }
        }

        setStatus("Análisis detenido");
        /* setYoutubeStreamUrl(null); */
    }
    
    frameBufferRef.current = []
    if (renderRequestRef.current) {
      cancelAnimationFrame(renderRequestRef.current)
      renderRequestRef.current = null
    }
  }

  useEffect(() => {
    if (videoSource === "webcam" && !processedUrl) {
      startWebcam()
    }

    return () => {
      stopAnalysis()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      setCurrentTaskId(null)
    }
  }, [videoSource, processedUrl])

  useEffect(() => {
    if (isAnalyzing && videoSource === "webcam") {
      connectWebSocket()
    } else {
      stopAnalysis()
    }
  }, [isAnalyzing, framework, model])

  useEffect(() => {
    if (isAnalyzing && videoSource === "file" && videoFile && !processedUrl) {
      processFile()
    }
  }, [isAnalyzing, videoFile, processedUrl])


  useEffect(() => {
    const setupStream = async () => {
      if (videoSource === "stream" && streamUrl && isAnalyzing && !isMjpegUrl(streamUrl)) {
        try {
          console.log("ENTRO ACA")
          setStatus("Obteniendo URL del stream de YouTube...");
          const endpoint = `http://localhost:8000/get_youtube_stream_url?youtube_url=${encodeURIComponent(streamUrl)}`;
          const res = await fetch(endpoint);
          if (!res.ok) throw new Error("Error al obtener URL de stream");

          const data = await res.json();
          if (!data.stream_url) throw new Error("URL del stream vacía");

          /* setYoutubeStreamUrl(data.stream_url); */
        } catch (error) {
          console.error("❌ Error obteniendo stream URL:", error);
          setStatus("Error obteniendo stream de YouTube");
        }
      }
    };
    setupStream();

  }, [videoSource, streamUrl, isAnalyzing]);
  

useEffect(() => {
  const setupMjpegStream = async () => {
    if (videoSource === "stream" && streamUrl && isAnalyzing && isMjpegUrl(streamUrl)) {
      try {
        setStatus("Iniciando análisis de stream MJPEG...");

        const formData = new FormData();
        formData.append("stream_url", streamUrl);
        formData.append("tecnologia", framework);
        formData.append("modelo", model);

        const res = await fetch("http://localhost:8000/upload/stream", {
          method: "POST",
          body: formData
        });

        if (!res.ok) throw new Error("Error enviando stream MJPEG");

        const { task_id } = await res.json();
        connectFileWebSocket(task_id);  // Usa mismo mecanismo que para archivos
        setStatus("Stream MJPEG conectado");
      } catch (e) {
        console.error("❌ Error MJPEG:", e);
        setStatus("Error iniciando stream MJPEG");
      }
    }
  };

  setupMjpegStream();
}, [videoSource, streamUrl, isAnalyzing]);

useEffect(() => {
  if (!isAnalyzing) return;

    stopAnalysis();
    setStatus("Cambio de URL detectado. Análisis detenido.");

}, [streamUrl]);

  const fetchBoxIds = async (taskId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/videos/${taskId}/box_ids`)
      if (!response.ok) throw new Error("Error al cargar IDs")
      const data = await response.json()
      console.log("data", data)
      setBoxIds(data.box_ids || [])
    } catch (error) {
      console.error("Error fetching box IDs:", error)
      setBoxIds([])
    }
  }

  const toggleIdSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
    setFilteredVideoUrl(null)  // Clear filtered video when selection changes
  }

  const fetchFilteredVideo = async () => {
    if (!processedVideoId || selectedIds.size === 0) return

    try {
      const response = await fetch(`http://localhost:8000/videos/${processedVideoId}/boxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Array.from(selectedIds).map(id => parseInt(id)))
      })

      if (!response.ok) throw new Error("Error al obtener video filtrado")
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setFilteredVideoUrl(url)
    } catch (error) {
      console.error("Error fetching filtered video:", error)
      setStatus("Error al obtener video filtrado")
    }
  }
  useEffect(() => {
  // Limpia el video filtrado cuando cambie de fuente o se detenga/analyse
  setFilteredVideoUrl(null)
  }, [videoSource, isAnalyzing])

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex">
      <div className="flex-1 relative">
        {filteredVideoUrl && selectedIds.size > 0 ? (
          <video
            key={filteredVideoUrl}
            src={filteredVideoUrl}
            className="w-full h-full object-contain"
            controls
            muted
            playsInline
            autoPlay
            preload="auto"
            crossOrigin="anonymous"
            onError={() => setStatus("Error al cargar video")}
            onLoadedData={() => setStatus("Video filtrado cargado")}
          />
        ) : processedUrl ? (
          <video
            key={`processed-${processedUrl}`}
            src={processedUrl}
            className="w-full h-full object-contain"
            controls
            muted
            playsInline
            autoPlay
            preload="auto"
            crossOrigin="anonymous"
            onError={() => setStatus("Error al cargar video")}
            onLoadedData={() => {
              setStatus("Video procesado")
              console.log("processedVideoId", processedVideoId)
              if (processedVideoId) {
                fetchBoxIds(processedVideoId)
              }
            }}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${
                isAnalyzing ? 'hidden' : 'block'
              }`}
            />
            <canvas
              ref={processedCanvasRef}
              className={`w-full h-full object-contain ${
                isAnalyzing ? 'block' : 'hidden'
              }`}
            />
          </>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <div className="text-white text-center p-4 rounded-lg">
              <div className="animate-pulse text-xl mb-2">Procesando...</div>
              <div className="text-sm">{status}</div>
            </div>
          </div>
        )}

        {(!processedUrl) && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-md text-sm">
            {status}
          </div>
        )}

        {isAnalyzing && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-md text-sm">
            {framework} - {model}
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {processedUrl && framework === "yolo" && (
        <div className="w-64 bg-white flex flex-col h-full">
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">IDs Detectados</h3>
            <div className="space-y-2">
              {boxIds.map((id) => (
                <div
                  key={id}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedIds.has(id)
                      ? 'bg-blue-100 border border-blue-300'
                      : 'hover:bg-gray-100 border border-gray-200'
                  }`}
                  onClick={() => toggleIdSelection(id)}
                >
                  ID: {id}
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={fetchFilteredVideo}
              disabled={selectedIds.size === 0}
              className={`w-full text-sm py-2 px-4 rounded-md transition-colors ${
                selectedIds.size === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Mostrar IDs seleccionados ({selectedIds.size})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}