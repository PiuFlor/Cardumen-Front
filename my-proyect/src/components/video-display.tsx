"use client"
import { useEffect, useRef, useState } from "react"

interface VideoDisplayProps {
  videoSource: "file" | "webcam"
  videoFile: File | null
  isAnalyzing: boolean
  framework: "yolo" | "mediapipe"
  model: string
  onProcessingComplete?: (url: string) => void
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
  const processedImageRef = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState("Presiona 'Iniciar Análisis'")
  const [isProcessing, setIsProcessing] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startWebcam = async () => {
    try {
      setStatus("Iniciando cámara...")
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve
          }
        })
        videoRef.current.play()
        setStatus("Cámara lista")
      }
    } catch (error) {
      console.error("Error al acceder a la cámara:", error)
      setStatus("Error: No se pudo acceder a la cámara")
    }
  }

  const connectWebSocket = () => {
    setStatus("Conectando al servidor...")
    const ws = new WebSocket(
      `ws://localhost:8000/ws/image?tecnologia=${framework}&modelo=${model}`
    )
    wsRef.current = ws

    ws.onopen = () => {
      setStatus("Analizando en tiempo real...")
      startFrameProcessing()
    }

    ws.onmessage = (event) => {
      if (processedImageRef.current) {
        processedImageRef.current.src = `data:image/jpeg;base64,${event.data}`
      }
    }

    ws.onclose = () => {
      setStatus("Conexión cerrada")
      stopFrameProcessing()
    }

    ws.onerror = (error) => {
      console.error("Error en WebSocket:", error)
      setStatus("Error en la conexión")
    }
  }

  const startFrameProcessing = () => {
    if (!frameIntervalRef.current) {
      frameIntervalRef.current = setInterval(sendFrame, 100)
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
              wsRef.current.send(base64Data)
            }
          }
          reader.readAsDataURL(blob)
        }, 'image/jpeg')
      }
    }
  }

  const processFile = async () => {
    setIsProcessing(true);
    setStatus("Procesando archivo...");
    
    const formData = new FormData();
    formData.append('file', videoFile!);
    formData.append('tecnologia', framework);
    formData.append('modelo', model);

    try {
        const response = await fetch('http://localhost:8000/upload/video', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Error al procesar el archivo');

        // Crear URL del blob directamente desde la respuesta
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        
        if (onProcessingComplete) {
            onProcessingComplete(videoUrl);
        }
        
        setStatus("Procesamiento completado");
    } catch (error) {
        console.error('Error procesando archivo:', error);
        setStatus('Error al procesar el archivo');
    } finally {
        setIsProcessing(false);
    }
};

  const stopAnalysis = () => {
    if (videoSource === "webcam") {
      stopFrameProcessing()
      if (wsRef.current) {
        wsRef.current.close()
      }
      setStatus("Análisis detenido")
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
              isAnalyzing && videoSource === "webcam" ? 'hidden' : 'block'
            }`}
          />
          <img
            ref={processedImageRef}
            alt="Procesado"
            className={`w-full h-full object-contain ${
              isAnalyzing && videoSource === "webcam" ? 'block' : 'hidden'
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