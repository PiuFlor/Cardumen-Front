import { useState, useEffect } from "react";
import VideoSource from "./components/video-source";
import ModelSelector from "./components/model-selector";
import VideoDisplay from "./components/video-display";
import ResultsModal from "./components/results-modal";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Camera, Film, Play, Square, BarChart2 } from "lucide-react";
import ParametersSelector from "./components/parameters-selector";
import Trayectorias from "./components/trayectorias"

export default function App() {
  const [videoSource, setVideoSource] = useState<"file" | "webcam" | "stream">("webcam");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [framework, setFramework] = useState<"yolo" | "mediapipe">("yolo");
  const [model, setModel] = useState<string>("");
  const [max_latency, setMax_latency] = useState<number | null>(500);
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("")
  const [modelOptions, setModelOptions] = useState({
    yolo: ['yolo11n.pt', 'yolo11s.pt', 'yolo11m.pt', 'yolo11l.pt', 'yolo11x.pt'],
    mediapipe: ["efficientdet_lite0_pf32.tflite","efficientdet_lite0_int8.tflite", "efficientdet_lite0_pf16.tflite", "ssd_mobilenet_v2_int8.tflite", "ssd_mobilenet_v2_pf32.tflite"]
  });
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  
  const [fps, setFps] = useState("0");
  const [resolution, setResolution] = useState("0");

  // Cargar modelos disponibles
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const endpoint = framework === "yolo" 
          ? "http://localhost:8000/modelos/yolo" 
          : "http://localhost:8000/modelos/mediapipe";
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("Error al cargar modelos");
        
        const data = await response.json();
        setModelOptions(prev => ({
          ...prev,
          [framework]: data.modelos || []
        }));
        
        if (data.modelos?.length > 0) {
          setModel(data.modelos[0]);
        }
      } catch (error) {
        console.error("Error al cargar modelos:", error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [framework]);

  // Limpiar resultados al cambiar fuente de video
  useEffect(() => {
    setProcessedVideoUrl(null);
    setIsAnalyzing(false);
    setShowResults(false);
  }, [videoSource]);

  // Limpiar resultados al cambiar archivo
  useEffect(() => {
    setProcessedVideoUrl(null);
    setIsAnalyzing(false);
    setShowResults(false);
  }, [videoFile]);


  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(videoInputs);
      if (videoInputs.length > 0) {
        setSelectedCameraId(videoInputs[0].deviceId);
      }
    });
  }, []);

  const toggleAnalysis = () => {
    if (isAnalyzing) {
      setIsAnalyzing(false);
    } else {
      setIsAnalyzing(true);
      setProcessedVideoUrl(null);
      setShowResults(false);
    }
  };

  const handleProcessingComplete = (url: string, taskId: string) => {
    setProcessedVideoUrl(url);
    setIsAnalyzing(false);
    setTaskId(taskId);
    setShowResults(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-transparent bg-clip-text">
            Analizador de Video 
          </h1>
          <p className="text-gray-600 mt-2">
            Analiza videos o transmisiones de webcam con modelos avanzados
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 ">
          {/* Panel de control izquierdo */}
          <div className="lg:col-span-1 space-y-6 overflow-y-auto max-h-full pr-2">
            {/* Selección de fuente de video */}
            <Card className="overflow-hidden border-none shadow-lg bg-white">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 py-3 px-4">
                <h2 className="text-white font-semibold flex items-center">
                  <Camera className="mr-2 h-5 w-5" />
                  Fuente de Video
                </h2>
              </div>
              <CardContent className="pt-6">
                <VideoSource
                  videoSource={videoSource}
                  setVideoSource={setVideoSource}
                  setVideoFile={setVideoFile}
                  streamUrl={streamUrl}
                  setStreamUrl={setStreamUrl}
                  max_latency={max_latency}
                  setMax_latency={setMax_latency}
                  isLoading={false}
                  setSelectedCameraId={setSelectedCameraId}
                  selectedCameraId={selectedCameraId}
                  availableCameras={availableCameras}
                />
              </CardContent>
            </Card>

            {/* Selección de modelo */}
            <Card className="overflow-hidden border-none shadow-lg bg-white">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 py-3 px-4">
                <h2 className="text-white font-semibold flex items-center">
                  <Film className="mr-2 h-5 w-5" />
                  Configuración de Análisis
                </h2>
              </div>
              <CardContent className="pt-6">
                <ModelSelector
                  framework={framework}
                  setFramework={setFramework}
                  model={model}
                  setModel={setModel}
                  modelOptions={modelOptions}
                  isLoading={isLoadingModels}
                />
              </CardContent>
            </Card>
            {/*Parametros */}
            {videoSource === "file" && (
            <Card className="overflow-hidden border-none shadow-lg bg-white">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 py-3 px-4">
                <h2 className="text-white font-semibold flex items-center">
                  <Film className="mr-2 h-5 w-5" />
                  Parametros
                </h2>
              </div>
              <CardContent className="pt-6">
                <ParametersSelector
                    fps={fps}
                    setFps={setFps}
                    resolution={resolution}
                    setResolution={setResolution}
                  />
              </CardContent>
            </Card>
            )}
            {/* Botón de análisis */}
            <Button
              className="w-full py-6 text-lg shadow-lg transition-all duration-300 hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
              onClick={toggleAnalysis}
              disabled={
                isLoadingModels || 
                (videoSource === "file" && !videoFile) || 
                !model
              }
            >
              {isAnalyzing ? (
                <>
                  <Square className="mr-2 h-5 w-5" /> 
                  Detener Análisis
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" /> 
                  Iniciar Análisis
                </>
              )}
            </Button>
          </div>

          {/* Panel de visualización derecha */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-none shadow-xl bg-white">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 py-3 px-4">
                <h2 className="text-white font-semibold">
                  {processedVideoUrl ? "Resultado del Análisis" : 
                  isAnalyzing ? "Análisis en Tiempo Real" : "Vista Previa"}
                </h2>
              </div>
              <CardContent className="p-0 aspect-video">
                <VideoDisplay
                  videoSource={videoSource}
                  videoFile={videoFile}
                  isAnalyzing={isAnalyzing}
                  framework={framework}
                  model={model}
                  max_latency={max_latency}
                  onProcessingComplete={handleProcessingComplete}
                  processedUrl={processedVideoUrl}
                  streamUrl={streamUrl}
                  fps={fps}
                  res={resolution}
                  selectedCameraId={selectedCameraId}
                />
              </CardContent>
            </Card>
            {/* MOSTRAR TRAYECTORIA */}
            { framework === 'yolo' && processedVideoUrl && (<Trayectorias taskId={taskId}/>)}
          </div>
        </div>
      </div>

      {/* Botón flotante para mostrar resultados */}
      {processedVideoUrl && (
        <Button 
          onClick={() => setShowResults(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-full shadow-lg transition-all duration-300 hover:scale-105 flex items-center z-50"
        >
          <BarChart2 className="mr-2 h-5 w-5" />
          Ver Métricas
        </Button>
      )}

      {/* Modal de resultados */}
      <ResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        videoFile={videoFile?.name || null}
        framework={framework}
        model={model}
        taskId={taskId}
      />
    </div>
  );
}