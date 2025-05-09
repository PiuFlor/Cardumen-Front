"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useYolo } from "../hooks/use-yolo"
import { useMediaPipe } from "../hooks/use-mediapipe"

interface VideoDisplayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  videoSource: "file" | "webcam"
  videoFile: File | null
  isAnalyzing: boolean
  framework: "yolo" | "mediapipe"
  model: string
  fps?: number
  resolution?: string
  onAnalysisComplete?: (isAnalyzing: boolean) => void
  videoUrl?: string | null
}

export default function VideoDisplay({
  videoRef,
  canvasRef,
  videoSource,
  videoFile,
  isAnalyzing,
  framework,
  model,
  fps = 30,
  resolution = "720p",
}: VideoDisplayProps) {
  const { processFrameYolo, loadYoloModel } = useYolo()
  const { processFrameMediaPipe, loadMediaPipeModel } = useMediaPipe()
  const requestIdRef = useRef<number | null>(null)

  const getResolutionDimensions = () => {
    switch (resolution) {
      case "480p":
        return { width: 640, height: 480 }
      case "720p":
        return { width: 1280, height: 720 }
      case "1080p":
        return { width: 1920, height: 1080 }
      default:
        return { width: 1280, height: 720 }
    }
  }

  const { width, height } = getResolutionDimensions()

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (video.srcObject) {
      const stream = video.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }

    if (videoSource === "webcam") {
      navigator.mediaDevices
        .getUserMedia({
          video: { width: { ideal: width }, height: { ideal: height } },
        })
        .then((stream) => {
          video.srcObject = stream
          video.play()
        })
        .catch((err) => console.error("Error accediendo a la cámara web:", err))
    } else if (videoSource === "file" && videoFile) {
      video.src = URL.createObjectURL(videoFile)
      video.play()
    }

    return () => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [videoSource, videoFile, width, height])

  useEffect(() => {
    if (framework === "yolo") {
      loadYoloModel(model)
    } else {
      loadMediaPipeModel(model)
    }
  }, [framework, model, loadYoloModel, loadMediaPipeModel])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !isAnalyzing) {
      if (requestIdRef.current !== null) {
        cancelAnimationFrame(requestIdRef.current)
        requestIdRef.current = null
      }
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = width
    canvas.height = height

    let lastFrameTime = 0
    const frameInterval = 1000 / fps

    const processFrame = (timestamp: number) => {
      if (!video || !canvas || !ctx || !isAnalyzing) return

      if (timestamp - lastFrameTime >= frameInterval) {
        lastFrameTime = timestamp

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        if (framework === "yolo") {
          processFrameYolo(video, canvas, model)
        } else {
          processFrameMediaPipe(video, canvas, model)
        }
      }

      requestIdRef.current = requestAnimationFrame(processFrame)
    }

    requestIdRef.current = requestAnimationFrame(processFrame)

    return () => {
      if (requestIdRef.current !== null) {
        cancelAnimationFrame(requestIdRef.current)
        requestIdRef.current = null
      }
    }
  }, [
    isAnalyzing,
    videoRef,
    canvasRef,
    framework,
    model,
    fps,
    width,
    height,
    processFrameYolo,
    processFrameMediaPipe,
  ])

  return (
    <div className="relative overflow-hidden aspect-video w-full rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 p-2">
      <div className="relative w-full h-full rounded-lg overflow-hidden">
        <video ref={videoRef} className="hidden" muted playsInline />
        <canvas ref={canvasRef} className="w-full h-full object-contain rounded-lg" />

        {!isAnalyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white rounded-lg backdrop-blur-sm">
            <div className="animate-pulse mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
            </div>
            <p className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Presiona "Iniciar Análisis" para comenzar
            </p>
            <p className="text-gray-300 mt-2 text-sm max-w-md text-center">
              Selecciona tus opciones de configuración y haz clic en el botón para iniciar el análisis en tiempo real
            </p>
          </div>
        )}

        {isAnalyzing && (
          <div className="absolute top-3 right-3 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm flex items-center">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            Analizando
          </div>
        )}
      </div>
    </div>
  )
}
