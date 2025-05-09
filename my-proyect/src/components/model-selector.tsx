"use client"

import { useEffect } from "react"

import { Label } from "./ui/label"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Box, Layers } from "lucide-react"

interface ModelSelectorProps {
  framework: "yolo" | "mediapipe"
  setFramework: (framework: "yolo" | "mediapipe") => void
  model: string
  setModel: (model: string) => void
}

export default function ModelSelector({ framework, setFramework, model, setModel }: ModelSelectorProps) {
  const yoloModels = [
    { value: "yolov8", label: "YOLOv8" },
    { value: "yolo-nas", label: "YOLO-NAS" },
    { value: "yolov7", label: "YOLOv7" },
  ]

  const mediapipeModels = [
    { value: "pose", label: "Pose" },
    { value: "face", label: "Face" },
    { value: "hands", label: "Hands" },
    { value: "holistic", label: "Holistic" },
  ]

  const currentModels = framework === "yolo" ? yoloModels : mediapipeModels

  // Asegurarse de que el modelo seleccionado sea válido para el framework actual
  useEffect(() => {
    if (!currentModels.some((m) => m.value === model)) {
      setModel(currentModels[0].value)
    }
  }, [framework, model, setModel])

  return (
    <div className="space-y-4">
      <RadioGroup
        value={framework}
        onValueChange={(value: "yolo" | "mediapipe") => setFramework(value)}

        className="space-y-3"
      >
        <div
          className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${framework === "yolo" ? "bg-pink-100" : ""}`}
        >
          <RadioGroupItem value="yolo" id="yolo" className="text-pink-600" />
          <Label htmlFor="yolo" className="flex items-center cursor-pointer">
            <Box className="mr-2 h-4 w-4 text-pink-600" />
            <span>YOLO</span>
          </Label>
        </div>
        <div
          className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${framework === "mediapipe" ? "bg-pink-100" : ""}`}
        >
          <RadioGroupItem value="mediapipe" id="mediapipe" className="text-pink-600" />
          <Label htmlFor="mediapipe" className="flex items-center cursor-pointer">
            <Layers className="mr-2 h-4 w-4 text-pink-600" />
            <span>MediaPipe</span>
          </Label>
        </div>
      </RadioGroup>

      <div className="pt-2">
        <Label htmlFor="model-select" className="block mb-2 text-gray-700">
          Modelo Específico
        </Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger id="model-select" className="border-2 border-pink-200 focus:border-pink-500">
            <SelectValue placeholder="Selecciona un modelo" />
          </SelectTrigger>
          <SelectContent>
            {currentModels.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
