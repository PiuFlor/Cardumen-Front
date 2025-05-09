"use client"

import { DialogFooter } from "./ui/dialog"

import { useState } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { FileDown, FileText } from "lucide-react"
import { jsPDF } from "jspdf"

export interface AnalysisResult {
  videoFile: string
  cpuUsage: number
  cpuTimeUsed: number
  wallTimeElapsed: number
  averageScore: number
  averageInferenceTime: number
  averageProcessingTime: number
  framework: string
  model: string
  resolution: string
  fps: number
}

interface ResultsModalProps {
  isOpen: boolean
  onClose: () => void
  results: AnalysisResult | null
}

export default function ResultsModal({ isOpen, onClose, results }: ResultsModalProps) {
  const [isExporting, setIsExporting] = useState(false)

  if (!results) return null

  const exportToPdf = async () => {
    try {
      setIsExporting(true)

      // Crear un nuevo documento PDF
      const doc = new jsPDF()

      // Añadir título
      doc.setFontSize(20)
      doc.setTextColor(33, 33, 33)
      doc.text("Resultados del Análisis de Video", 20, 20)

      // Añadir línea separadora
      doc.setDrawColor(200, 200, 200)
      doc.line(20, 25, 190, 25)

      // Configurar fuente para el contenido
      doc.setFontSize(12)
      doc.setTextColor(66, 66, 66)

      // Añadir información del análisis
      let y = 35
      const lineHeight = 8

      doc.text(`Video: ${results.videoFile}`, 20, y)
      y += lineHeight * 1.5
      doc.text(`Framework: ${results.framework}`, 20, y)
      y += lineHeight
      doc.text(`Modelo: ${results.model}`, 20, y)
      y += lineHeight
      doc.text(`Resolución: ${results.resolution}`, 20, y)
      y += lineHeight
      doc.text(`FPS: ${results.fps}`, 20, y)
      y += lineHeight * 1.5

      // Añadir resultados de rendimiento
      doc.setFontSize(14)
      doc.text("Métricas de Rendimiento", 20, y)
      y += lineHeight * 1.5
      doc.setFontSize(12)

      doc.text(`Uso de CPU: ${results.cpuUsage.toFixed(4)}%`, 20, y)
      y += lineHeight
      doc.text(`CPU Time Used: ${results.cpuTimeUsed.toFixed(4)} segundos`, 20, y)
      y += lineHeight
      doc.text(`Wall-Clock Time Elapsed: ${results.wallTimeElapsed.toFixed(4)} segundos`, 20, y)
      y += lineHeight
      doc.text(`Confianza promedio (solo de personas): ${results.averageScore.toFixed(4)}`, 20, y)
      y += lineHeight
      doc.text(`Tiempo medio de inferencia: ${results.averageInferenceTime.toFixed(4)} segundos`, 20, y)
      y += lineHeight
      doc.text(`Tiempo medio de procesamiento: ${results.averageProcessingTime.toFixed(4)} segundos`, 20, y)
      y += lineHeight * 1.5

      // Añadir pie de página
      const date = new Date().toLocaleString()
      doc.setFontSize(10)
      doc.setTextColor(120, 120, 120)
      doc.text(`Generado el ${date}`, 20, 280)

      // Guardar el PDF
      doc.save("resultados-analisis-video.pdf")
    } catch (error) {
      console.error("Error al exportar a PDF:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-white to-blue-50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text flex items-center">
            <FileText className="mr-2 h-6 w-6 text-blue-500" />
            Resultados del Análisis
          </DialogTitle>
          <DialogDescription>Resumen del análisis de video completado</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información básica */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Información del Video</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">Video:</div>
              <div className="font-medium">{results.videoFile}</div>

              <div className="text-gray-500">Framework:</div>
              <div className="font-medium">{results.framework}</div>

              <div className="text-gray-500">Modelo:</div>
              <div className="font-medium">{results.model}</div>

              <div className="text-gray-500">Resolución:</div>
              <div className="font-medium">{results.resolution}</div>

              <div className="text-gray-500">FPS:</div>
              <div className="font-medium">{results.fps}</div>
            </div>
          </div>

          {/* Métricas de rendimiento */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Métricas de Rendimiento</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Uso de CPU:</span>
                <span className="font-medium text-purple-700">{results.cpuUsage.toFixed(4)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${Math.min(results.cpuUsage, 100)}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-500">CPU Time Used:</span>
                <span className="font-medium text-blue-700">{results.cpuTimeUsed.toFixed(4)} segundos</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-500">Wall-Clock Time Elapsed:</span>
                <span className="font-medium text-blue-700">{results.wallTimeElapsed.toFixed(4)} segundos</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-500">Confianza promedio (personas):</span>
                <span className="font-medium text-green-700">{results.averageScore.toFixed(4)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${results.averageScore * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-500">Tiempo medio de inferencia:</span>
                <span className="font-medium text-amber-700">{results.averageInferenceTime.toFixed(4)} segundos</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-500">Tiempo medio de procesamiento:</span>
                <span className="font-medium text-amber-700">{results.averageProcessingTime.toFixed(4)} segundos</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cerrar
          </Button>
          <Button
            onClick={exportToPdf}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isExporting}
          >
            {isExporting ? (
              <>Exportando...</>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" /> Exportar a PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
