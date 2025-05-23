"use client"

import type React from "react"
import { Label } from "./ui/label"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Input } from "./ui/input"
import { Camera, Upload, Link } from "lucide-react"

interface VideoSourceProps {
  videoSource: "file" | "webcam" | "stream"
  setVideoSource: (source: "file" | "webcam" | "stream") => void
  setVideoFile: (file: File | null) => void
  streamUrl?: string
  setStreamUrl?: (url: string) => void
}

export default function VideoSource({ videoSource, setVideoSource, setVideoFile, streamUrl, setStreamUrl }: VideoSourceProps) {
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
