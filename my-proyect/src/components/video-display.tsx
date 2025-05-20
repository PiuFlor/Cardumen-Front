"use client"
import { useEffect, useRef, useState, useCallback } from "react"

interface VideoDisplayProps {
  videoSource: "file" | "webcam"
  videoFile: File | null
  isAnalyzing: boolean
  framework: "yolo" | "mediapipe"
  model: string
  onProcessingComplete?: (url: string, taskId: string) => void
  processedUrl?: string | null
}

export default function VideoDisplay({
  videoSource,
  videoFile,
  isAnalyzing,
  framework,
  model,
  onProcessingComplete,
  processedUrl
}: VideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const processedCanvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState("Presiona 'Iniciar Análisis'")
  const [isProcessing, setIsProcessing] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const wsFileRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  
  // Buffer para almacenar frames procesados
  const frameBufferRef = useRef<{timestamp: number, image: string}[]>([])
  const lastRenderTimeRef = useRef<number>(0)
  const renderRequestRef = useRef<number | null>(null)

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
    const maxLatency = 500
    const ws = new WebSocket(
      `ws://localhost:8000/ws/image?tecnologia=${framework}&modelo=${model}&max_latency=${maxLatency}`
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
          setCurrentTaskId(null)
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

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {processedUrl ? (
        <video
          key={processedUrl}
          src={processedUrl}
          className="w-full h-full object-contain"
          controls
          muted
          playsInline
          autoPlay
          onError={() => setStatus("Error al cargar video")}
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
      
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-md text-sm">
        {status}
      </div>
      
      {isAnalyzing && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-md text-sm">
          {framework} - {model}
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}