"use client";

import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const resInfo = [
  { name: "640x480" },
  { name: "1280x720" },
  { name: "1366x768" },
  { name: "1600x900" },
  { name: "1920x1080" },
];

interface ParametersSelectorProps {
  fps: string;
  setFps: (value: string) => void;
  resolution: string;
  setResolution: (value: string) => void;
}

export default function ParametersSelector({
  fps,
  setFps,
  resolution,
  setResolution,
}: ParametersSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="fps-slider" className="block mb-2 text-gray-700">
          FPS ({fps})
        </Label>
        <input
          id="fps-slider"
          type="range"
          min="10"
          max="60"
          step="10"
          value={fps}
          onChange={(e) => setFps(e.target.value)}
          className="w-full accent-pink-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          {[10, 20, 30, 40, 50, 60].map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      </div>


      <div>
        <Label htmlFor="res-select" className="block mb-2 text-gray-700">
          Resolución
        </Label>
        <Select value={resolution} onValueChange={setResolution}>
          <SelectTrigger id="res-select" className="border-2 border-pink-200 bg-white">
            <SelectValue placeholder="Selecciona Resolución" />
          </SelectTrigger>
          <SelectContent className="bg-white border-pink-200">
            {resInfo.map((item) => (
              <SelectItem
                key={item.name}
                value={item.name}
                className="hover:bg-pink-50 hover:text-pink-600 transition-colors"
              >
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
