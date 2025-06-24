"use client"
import { Button } from "./ui/button"
import { useState } from "react"
import { Play, Pause } from "lucide-react";

interface VideoControlsProps {
  currentTime: number
  duration: number
  isPlaying: boolean
  onPlayPause: () => void
  onSeek: (time: number) => void
  onForward: (seconds: number) => void
  onBackward: (seconds: number) => void
  onRestart: () => void
}

export function VideoControls({
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
  onForward,
  onBackward,
  onRestart,
}: VideoControlsProps) {
  const [jumpSeconds, setJumpSeconds] = useState(5)
  const [showJumpSelect, setShowJumpSelect] = useState(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 pt-4 h-[60px] flex items-center">
      {/* Barra de progreso personalizada */}
      <div className="relative mb-3 h-1.5 w-full">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.001}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          // Aquí están los cambios clave en las clases de Tailwind CSS
          className="w-full h-full cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-runnable-track]:bg-gray-700/50
          [&::-webkit-slider-runnable-track]:h-1.5
          [&::-webkit-slider-runnable-track]:rounded-full
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-blue-500
          [&::-webkit-slider-thumb]:-mt-[6px] /* Ajusta este valor para centrar la bolita */
          [&::-moz-range-track]:bg-gray-700/50
          [&::-moz-range-track]:h-1.5
          [&::-moz-range-track]:rounded-full
          [&::-moz-range-thumb]:h-4
          [&::-moz-moz-range-thumb]:w-4
          [&::-moz-moz-range-thumb]:rounded-full
          [&::-moz-moz-range-thumb]:bg-blue-500"
          // La propiedad style={{ '--progress': ... }} ya no es necesaria aquí
          // puesto que el estilo del progreso lo maneja el propio input con los pseudo-elementos.
        />
      </div>

      {/* Controles principales (sin cambios aquí) */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-white/90">
          {formatTime(currentTime)}
        </span>

        <div className="flex items-center space-x-2">
          {/* Botón de retroceso */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBackward(jumpSeconds)}
            className="h-8 w-12 text-xs font-medium text-white/90 hover:bg-white/10 rounded-lg"
          >
            -{jumpSeconds}s
          </Button>

          {/* Botón de reinicio */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRestart}
            className="h-8 w-8 text-white/90 hover:bg-white/10 rounded-full"
          >
            <span className="text-lg">↻</span>
          </Button>

          {/* Botón principal play/pause */}
          <Button
            variant="default"
            size="icon"
            onClick={onPlayPause}
            className="h-10 w-10 bg-blue-600 hover:bg-blue-700 rounded-full shadow-md"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-white" /> // Icono de pausa
            ) : (
              <Play className="h-6 w-6 text-white" />   // Icono de play
            )}
          </Button>

          {/* Botón de avance */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onForward(jumpSeconds)}
            className="h-8 w-12 text-xs font-medium text-white/90 hover:bg-white/10 rounded-lg"
          >
            +{jumpSeconds}s
          </Button>
        </div>

        {/* Selector de salto personalizado */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowJumpSelect(!showJumpSelect)}
            className="h-8 px-2 text-xs font-medium text-white/90 hover:bg-white/10 rounded-lg"
          >
            Salto: {jumpSeconds}s
          </Button>

          {showJumpSelect && (
            <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl z-10">
              <div className="text-xs text-white/80 mb-2">Seleccionar salto (segundos)</div>
              <div className="flex space-x-2">
                {[1, 2, 5, 10].map((sec) => (
                  <Button
                    key={sec}
                    variant={jumpSeconds === sec ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setJumpSeconds(sec)
                      setShowJumpSelect(false)
                    }}
                    className={`h-8 min-w-8 text-xs ${
                      jumpSeconds === sec
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    {sec}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}