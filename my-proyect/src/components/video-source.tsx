"use client"

import type React from "react"
import { Label } from "./ui/label"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Input } from "./ui/input"
import { Camera, Upload, Link, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface VideoSourceProps {
  videoSource: "file" | "webcam" | "stream"
  setVideoSource: (source: "file" | "webcam" | "stream") => void
  setVideoFile: (file: File | null) => void
  streamUrl?: string
  setStreamUrl?: (url: string) => void
  max_latency: number | null
  setMax_latency: (latency: number | null) => void
  isLoading?: boolean;
}

const publicCameras = [
  { name: "Orlando, US", url: "http://97.68.104.34/mjpg/video.mjpg"},
  { name: "Ivrea, Italia", url: "http://37.182.240.202:82/cgi-bin/faststream.jpg?stream=half&fps=15&rand=COUNTER"},
  { name: "Belgrade, Serbia", url: "http://109.206.96.58:8080/cam_1.cgi" },
];


export default function VideoSource({
  videoSource,
  setVideoSource,
  setVideoFile,
  streamUrl,
  setStreamUrl, max_latency, setMax_latency,
  isLoading = false
}: VideoSourceProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setVideoFile(files[0])
    }
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={videoSource}
        onValueChange={(value) => setVideoSource(value as "file" | "webcam")}
        className="space-y-3"
      >
        <div
          className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${videoSource === "webcam" ? "bg-purple-100" : ""}`}
        >
          <RadioGroupItem value="webcam" id="webcam" className="text-purple-600" />
          <Label htmlFor="webcam" className="flex items-center cursor-pointer">
            <Camera className="mr-2 h-4 w-4 text-purple-600" />
            <span>Cámara Web</span>
          </Label>
        </div>
        <div
          className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${videoSource === "file" ? "bg-purple-100" : ""}`}
        >
          <RadioGroupItem value="file" id="file" className="text-purple-600" />
          <Label htmlFor="file" className="flex items-center cursor-pointer">
            <Upload className="mr-2 h-4 w-4 text-purple-600" />
            <span>Archivo de Video</span>
          </Label>
        </div>

         <div
          className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${videoSource === "stream" ? "bg-purple-100" : ""}`}
        >
          <RadioGroupItem value="stream" id="stream" className="text-purple-600" />
          <Label htmlFor="stream" className="flex items-center cursor-pointer">
            <Link className="mr-2 h-4 w-4 text-purple-600" />
            <span>Stream (URL)</span>
          </Label>
        </div>

        <div className="pt-2 relative z-0">
          <Label htmlFor="camera-select" className="block mb-2 text-gray-700">
            Cámara Pública
          </Label>

          {isLoading ? (
            <div className="flex items-center justify-center p-4 border-2 border-pink-200 rounded-md bg-white">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-pink-600" />
              <span>Cargando cámaras...</span>
            </div>
          ) : (
            <Select
              value={streamUrl}
              onValueChange={setStreamUrl}
              disabled={publicCameras.length === 0}
            >
              <SelectTrigger
                id="camera-select"
                className="border-2 border-pink-200 focus:border-pink-500 bg-white"
              >
                <SelectValue
                  placeholder={
                    publicCameras.length === 0
                      ? "No hay cámaras disponibles"
                      : "Selecciona una cámara pública"
                  }
                />
              </SelectTrigger>
              {publicCameras.length > 0 && (
                <SelectContent className="bg-white border-pink-200">
                  {publicCameras.map((cam) => (
                    <SelectItem
                      key={cam.name}
                      value={cam.url}
                      className="hover:bg-pink-50 focus:bg-pink-50"
                    >
                      {cam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              )}
            </Select>
          )}
        </div>

      </RadioGroup>

      {videoSource === "file" && (
        <div className="pt-2">
          <Input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="border-2 border-dashed border-purple-300 hover:border-purple-500 transition-colors py-8 text-center"
          />
        </div>
      )}
      {videoSource === "webcam" && (
        <div className="pt-2 space-y-1">
          <Label htmlFor="maxLatency">Latencia máxima (ms)</Label>
          <Input
            id="maxLatency"
            type="number"
            placeholder="500"
            value={max_latency || ''}
            onChange={(e) => setMax_latency(e.target.value ? Number(e.target.value) : null)}
            min="0"
            step="50"
          />
        </div>
      )}
      {videoSource === "stream" && (
        <div className="pt-2 space-y-1">
          <Label htmlFor="streamUrl">URL del Stream (YouTube o RTMP)</Label>
          <Input
            id="streamUrl"
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={streamUrl}
            onChange={(e) => setStreamUrl?.(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
