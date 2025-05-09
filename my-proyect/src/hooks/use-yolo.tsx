"use client"

import { useState, useCallback } from "react"

export function useYolo() {
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [currentModel, setCurrentModel] = useState<string | null>(null)

  // Función para cargar el modelo YOLO
  const loadYoloModel = useCallback(async (modelName: string) => {
    try {
      // Aquí iría la lógica real para cargar el modelo YOLO
      // Por ejemplo, usando ONNX.js o TensorFlow.js
      console.log(`Cargando modelo YOLO: ${modelName}`)

      // Simulamos la carga del modelo
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setIsModelLoaded(true)
      setCurrentModel(modelName)
      console.log(`Modelo ${modelName} cargado correctamente`)
    } catch (error) {
      console.error("Error al cargar el modelo YOLO:", error)
      setIsModelLoaded(false)
    }
  }, [])

  // Función para procesar un frame con YOLO
  const processFrameYolo = useCallback(
    (video: HTMLVideoElement, canvas: HTMLCanvasElement, modelName: string) => {
      if (!isModelLoaded || currentModel !== modelName) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Aquí iría la lógica real para procesar el frame con YOLO
      // Por ahora, simplemente dibujamos rectángulos de ejemplo con colores más vistosos

      // Generar entre 1 y 4 detecciones aleatorias
      const numDetections = 1 + Math.floor(Math.random() * 4)

      // Clases posibles con colores asociados
      const classes = [
        { name: "Persona", color: "#4ade80" }, // verde
        { name: "Coche", color: "#f472b6" }, // rosa
        { name: "Bicicleta", color: "#60a5fa" }, // azul
        { name: "Perro", color: "#fb923c" }, // naranja
        { name: "Gato", color: "#a78bfa" }, // púrpura
      ]

      for (let i = 0; i < numDetections; i++) {
        const x = Math.random() * (canvas.width - 150)
        const y = Math.random() * (canvas.height - 150)
        const width = 100 + Math.random() * 150
        const height = 100 + Math.random() * 150

        // Seleccionar una clase aleatoria
        const classIndex = Math.floor(Math.random() * classes.length)
        const detectedClass = classes[classIndex]

        // Dibujar rectángulo con borde más grueso y estilo moderno
        ctx.lineWidth = 3
        ctx.strokeStyle = detectedClass.color
        ctx.strokeRect(x, y, width, height)

        // Añadir un fondo semitransparente al rectángulo
        ctx.fillStyle = `${detectedClass.color}33` // 20% de opacidad
        ctx.fillRect(x, y, width, height)

        // Dibujar etiqueta con fondo
        const confidence = (70 + Math.random() * 30).toFixed(1)
        const label = `${detectedClass.name} ${confidence}%`
        const textWidth = ctx.measureText(label).width + 10

        // Fondo de la etiqueta
        ctx.fillStyle = detectedClass.color
        ctx.fillRect(x, y - 30, textWidth, 30)

        // Texto de la etiqueta
        ctx.fillStyle = "white"
        ctx.font = "bold 16px Arial"
        ctx.fillText(label, x + 5, y - 10)
      }
    },
    [isModelLoaded, currentModel],
  )

  return {
    loadYoloModel,
    processFrameYolo,
    isModelLoaded,
  }
}
