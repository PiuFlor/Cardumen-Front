"use client"

import { DialogFooter } from "./ui/dialog"
import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { FileDown, FileText } from "lucide-react"
import { jsPDF } from "jspdf"

export interface MetricsData {
  cpu_usage: number
  wall_clock_time: number
  confidence: number
  avg_inference_time: number
  avg_processing_time: number
  total_frames: number
  current_fps: number
}

interface ResultsModalProps {
  isOpen: boolean
  onClose: () => void
  videoFile: string | null
  framework: string
  model: string
  taskId: string | null
}

export default function ResultsModal({ isOpen, onClose, videoFile, framework, model, taskId }: ResultsModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Obtener métricas cuando se abre el modal
  useEffect(() => {
    const fetchMetrics = async () => {
      if (isOpen && taskId) {
        setIsLoading(true)
        try {
          const response = await fetch(`http://localhost:8000/videos/${taskId}/metrics`)
          if (!response.ok) throw new Error("Error al cargar métricas")
          const data = await response.json()
          setMetrics(data)
        } catch (error) {
          console.error("Error fetching metrics:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchMetrics()
  }, [isOpen, taskId])

  if (!isOpen) return null

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

      doc.text(`Video: ${videoFile || "N/A"}`, 20, y)
      y += lineHeight * 1.5
      doc.text(`Framework: ${framework}`, 20, y)
      y += lineHeight
      doc.text(`Modelo: ${model}`, 20, y)
      y += lineHeight * 1.5

      // Añadir resultados de rendimiento si hay métricas
      if (metrics) {
        doc.setFontSize(14)
        doc.text("Métricas de Rendimiento", 20, y)
        y += lineHeight * 1.5
        doc.setFontSize(12)

        doc.text(`Uso de CPU: ${metrics.cpu_usage.toFixed(2)}%`, 20, y)
        y += lineHeight
        doc.text(`Tiempo total de procesamiento: ${metrics.wall_clock_time.toFixed(2)} segundos`, 20, y)
        y += lineHeight
        doc.text(`Confianza promedio: ${metrics.confidence.toFixed(4)}`, 20, y)
        y += lineHeight
        doc.text(`Tiempo medio de inferencia: ${metrics.avg_inference_time.toFixed(4)} segundos`, 20, y)
        y += lineHeight
        doc.text(`Tiempo medio de procesamiento: ${metrics.avg_processing_time.toFixed(4)} segundos`, 20, y)
        y += lineHeight
        doc.text(`Total de frames procesados: ${metrics.total_frames}`, 20, y)
        y += lineHeight
        doc.text(`FPS promedio: ${metrics.current_fps.toFixed(2)}`, 20, y)
        y += lineHeight * 1.5
      }

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
              <div className="font-medium">{videoFile || "N/A"}</div>

              <div className="text-gray-500">Framework:</div>
              <div className="font-medium">{framework}</div>

              <div className="text-gray-500">Modelo:</div>
              <div className="font-medium">{model}</div>
            </div>
          </div>

          {/* Métricas de rendimiento */}
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : metrics ? (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Métricas de Rendimiento</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Uso de CPU:</span>
                  <span className="font-medium text-purple-700">{metrics.cpu_usage.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${Math.min(metrics.cpu_usage, 100)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500">Tiempo total:</span>
                  <span className="font-medium text-blue-700">{metrics.wall_clock_time.toFixed(2)} segundos</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500">Confianza promedio:</span>
                  <span className="font-medium text-green-700">{metrics.confidence.toFixed(4)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${metrics.confidence * 100}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500">Tiempo medio inferencia:</span>
                  <span className="font-medium text-amber-700">{metrics.avg_inference_time.toFixed(4)} segundos</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500">Tiempo medio procesamiento:</span>
                  <span className="font-medium text-amber-700">{metrics.avg_processing_time.toFixed(4)} segundos</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500">Total de frames:</span>
                  <span className="font-medium text-indigo-700">{metrics.total_frames}</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500">FPS promedio:</span>
                  <span className="font-medium text-indigo-700">{metrics.current_fps.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar métricas</h3>
              <p className="text-red-500">No se pudieron cargar las métricas del análisis.</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cerrar
          </Button>
          <Button
            onClick={exportToPdf}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isExporting || !metrics}
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