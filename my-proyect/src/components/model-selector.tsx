"use client"

import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Box, Layers, Loader2 } from "lucide-react";

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
  const currentModels = modelOptions[framework] || [];

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

      <div className="pt-2">
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