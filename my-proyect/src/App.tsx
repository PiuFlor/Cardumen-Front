import { useState, useRef } from "react"
import VideoSource from "./components/video-source"
import ModelSelector from "./components/model-selector"
import VideoDisplay from "./components/video-display"
import { Button } from "./components/ui/button"
import { Card, CardContent } from "./components/ui/card"
import { Camera, Film, Play, Square } from "lucide-react"

export default function App() {
  const [videoSource, setVideoSource] = useState<"file" | "webcam">("webcam")
  const [videoFile, setVideoFile] = useState<File | null>(null)

  const [framework, setFramework] = useState<"yolo" | "mediapipe">("yolo")
  const [model, setModel] = useState<string>("yolov8")

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const uploadVideoForProcessing = async () => {
    if (!videoFile) return

    const formData = new FormData()
    formData.append("file", videoFile)
    formData.append("tecnologia", framework)
   
    try {
      const response = await fetch("http://localhost:8000/upload/", {
        method: "POST",
        body: formData,
      })


      if (!response.ok) throw new Error("Error al procesar el video")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setProcessedVideoUrl(url)

      // reproducir automáticamente
      if (videoRef.current) {
        videoRef.current.src = url
        videoRef.current.play()
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const toggleAnalysis = () => {
    if (!isAnalyzing && videoSource === "file") {
      uploadVideoForProcessing()
    }
    setIsAnalyzing(!isAnalyzing)
  }

  const handleAnalysisComplete = (isAnalyzing: boolean) => {
    setIsAnalyzing(isAnalyzing)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-transparent bg-clip-text">
            Analizador de Video con IA
          </h1>
          <p className="text-gray-600 mt-2">Analiza videos o transmisiones de webcam con modelos de IA avanzados</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="overflow-hidden border-none shadow-lg bg-white">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 py-3 px-4">
                <h2 className="text-white font-semibold flex items-center">
                  <Camera className="mr-2 h-5 w-5" />
                  Fuente de Video
                </h2>
              </div>
              <CardContent className="pt-6">
                <VideoSource videoSource={videoSource} setVideoSource={setVideoSource} setVideoFile={setVideoFile} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-lg bg-white">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 py-3 px-4">
                <h2 className="text-white font-semibold flex items-center">
                  <Film className="mr-2 h-5 w-5" />
                  Selección de la tecnología
                </h2>
              </div>
              <CardContent className="pt-6">
                <ModelSelector framework={framework} setFramework={setFramework} model={model} setModel={setModel} />
              </CardContent>
            </Card>

            <Button
              className="w-full py-6 text-lg shadow-lg transition-all duration-300 hover:scale-105"
              size="lg"
              onClick={toggleAnalysis}
              variant={isAnalyzing ? "destructive" : "default"}
              style={{
                background: isAnalyzing
                  ? "linear-gradient(to right, #f43f5e, #ef4444)"
                  : "linear-gradient(to right, #8b5cf6, #3b82f6)",
              }}
            >
              {isAnalyzing ? (
                <>
                  <Square className="mr-2 h-5 w-5" /> Detener Análisis
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" /> Iniciar Análisis
                </>
              )}
            </Button>
          </div>

          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-none shadow-xl bg-white">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 py-3 px-4">
                <h2 className="text-white font-semibold">Vista Previa del Análisis</h2>
              </div>
              <CardContent className="p-0">
                <VideoDisplay
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  videoSource={videoSource}
                  videoFile={videoFile}
                  isAnalyzing={isAnalyzing}
                  framework={framework}
                  model={model}
                  fps={30}
                  resolution={"720p"}
                  onAnalysisComplete={handleAnalysisComplete}
                  videoUrl={processedVideoUrl} // NUEVO
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
