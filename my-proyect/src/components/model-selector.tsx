"use client";

import { useState } from "react";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Box, Layers, Loader2 } from "lucide-react";

const mediapipeModelInfo = [
  { name: "efficientdet_lite0_int8.tflite", speed: 3, accuracy: 5 },
  { name: "efficientdet_lite0_pf16.tflite", speed: 4, accuracy: 4 },
  { name: "efficientdet_lite0_pf32.tflite", speed: 5, accuracy: 3 },
  { name: "ssd_mobilenet_v2_int8.tflite", speed: 1, accuracy: 7 },
  { name: "ssd_mobilenet_v2_pf32.tflite", speed: 2, accuracy: 6 },
  { name: "efficientdet_lite2_int8.tflite", speed: 6, accuracy: 2 },
  { name: "efficientdet_lite2_pf32.tflite", speed: 7, accuracy: 1 }
];

const yoloModelInfo = [
  { name: "yolo11n.pt", speed: 1, accuracy: 5 },
  { name: "yolo11s.pt", speed: 2, accuracy: 4 },
  { name: "yolo11m.pt", speed: 3, accuracy: 3 },
  { name: "yolo11l.pt", speed: 4, accuracy: 2 },
  { name: "yolo11x.pt", speed: 5, accuracy: 1 }
];

interface ModelSelectorProps {
  framework: "yolo" | "mediapipe";
  setFramework: (framework: "yolo" | "mediapipe") => void;
  model: string;
  setModel: (model: string) => void;
  modelOptions: {
    yolo: string[];
    mediapipe: string[];
  };
  isLoading?: boolean;
}

export default function ModelSelector({
  framework,
  setFramework,
  model,
  setModel,
  modelOptions,
  isLoading = false,
}: ModelSelectorProps) {
  const [orden, setOrden] = useState<"rapidez" | "precision">("rapidez");

  let currentModels = modelOptions[framework] || [];

  if (framework === "yolo") {
    const modelInfoMap = Object.fromEntries(
      yoloModelInfo.map((m) => [m.name, m])
    );

    currentModels = [...currentModels].sort((a, b) => {
      const aInfo = modelInfoMap[a];
      const bInfo = modelInfoMap[b];
      if (!aInfo || !bInfo) return 0;

      return orden === "rapidez"
        ? aInfo.speed - bInfo.speed
        : aInfo.accuracy - bInfo.accuracy;  
    });
  }

  
  if (framework === "mediapipe") {
    const modelInfoMap = Object.fromEntries(
      mediapipeModelInfo.map((m) => [m.name, m])
    );

    currentModels = [...currentModels].sort((a, b) => {
      const aInfo = modelInfoMap[a];
      const bInfo = modelInfoMap[b];
      if (!aInfo || !bInfo) return 0;

      return orden === "rapidez"
        ? aInfo.speed - bInfo.speed
        : aInfo.accuracy - bInfo.accuracy;
    });
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={framework}
        onValueChange={(value: "yolo" | "mediapipe") => setFramework(value)}
        className="space-y-3"
      >
        <div className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${framework === "yolo" ? "bg-pink-100" : ""}`}>
          <RadioGroupItem value="yolo" id="yolo" className="text-pink-600" />
          <Label htmlFor="yolo" className="flex items-center cursor-pointer">
            <Box className="mr-2 h-4 w-4 text-pink-600" />
            <span>YOLO</span>
          </Label>
        </div>

        <div className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${framework === "mediapipe" ? "bg-pink-100" : ""}`}>
          <RadioGroupItem value="mediapipe" id="mediapipe" className="text-pink-600" />
          <Label htmlFor="mediapipe" className="flex items-center cursor-pointer">
            <Layers className="mr-2 h-4 w-4 text-pink-600" />
            <span>MediaPipe</span>
          </Label>
        </div>
      </RadioGroup>

  <div className="pt-2 mb-6 relative z-10">
    <Label htmlFor="order-select" className="block mb-2 text-gray-700">
      Ordenar por
    </Label>
    <Select value={orden} onValueChange={(value) => setOrden(value as "rapidez" | "precision")}>
      <SelectTrigger id="order-select" className="border-2 border-pink-200 bg-white">
        <SelectValue placeholder="Ordenar por..." />
      </SelectTrigger>
      <SelectContent className="bg-white border-pink-200">
        <SelectItem value="rapidez">Rapidez (más rápido primero)</SelectItem>
        <SelectItem value="precision">Precisión (más preciso primero)</SelectItem>
      </SelectContent>
    </Select>
  </div>


<div className="pt-2 relative z-0">
  <Label htmlFor="model-select" className="block mb-2 text-gray-700">
    Modelo Específico
  </Label>
  {isLoading ? (
    <div className="flex items-center justify-center p-4 border-2 border-pink-200 rounded-md bg-white">
      <Loader2 className="mr-2 h-4 w-4 animate-spin text-pink-600" />
      <span>Cargando modelos...</span>
    </div>
  ) : (
    <Select
      value={model}
      onValueChange={setModel}
      disabled={currentModels.length === 0}
    >
      <SelectTrigger
        id="model-select"
        className="border-2 border-pink-200 focus:border-pink-500 bg-white"
      >
        <SelectValue
          placeholder={currentModels.length === 0 ? "No hay modelos disponibles" : "Selecciona un modelo"}
        />
      </SelectTrigger>
      {currentModels.length > 0 && (
        <SelectContent className="bg-white border-pink-200">
          {currentModels.map((modelOption) => (
            <SelectItem
              key={modelOption}
              value={modelOption}
              className="hover:bg-pink-50 focus:bg-pink-50"
            >
              {modelOption}
            </SelectItem>
          ))}
        </SelectContent>
      )}
    </Select>
  )}
    </div>
  </div>
  );
}
