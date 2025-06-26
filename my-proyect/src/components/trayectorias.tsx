"use client"
import { useEffect, useState, useMemo } from "react"
import { Card, CardContent } from "./ui/card"
import { COLOR_PALETTE } from "../utils/constants"
import { getColorForId } from "../utils/colorUtils"
import { VideoControls } from "./video-controls"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { FileText } from "lucide-react";
import jsPDF from 'jspdf';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '../components/ui/accordion';
interface Point {
  x: number
  y: number
  frame?: number
}

interface TrajectoryAnalysis {
  id: string;
  firstDetection: number;
  lastDetection: number;
  durationSeconds: number;
  directionChanges: {
    frame: number;
    angle: number;
    fromCoord: { x: number; y: number }; // Coordenadas del punto antes del cambio
    toCoord: { x: number; y: number };   // Coordenadas del punto después del cambio
    fromDirection: string;              // Descripción de la dirección antes del cambio
    toDirection: string;                // Descripción de la dirección después del cambio
  }[];
  totalDistance: number;
  averageSpeed: number; // Esto ya debería ser averageSpeedPxPerFrame o similar si lo cambiaste antes
}

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: TrajectoryAnalysis[];
}

export default function Trayectorias({ taskId }: { taskId: string | null }) {
  const [trajectories, setTrajectories] = useState<Record<string, Point[]>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [currentFrame, setCurrentFrame] = useState<number>(0)
  const [totalFrames, setTotalFrames] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [manualPoints, setManualPoints] = useState<Point[]>([])
  const [videoDimensions, setVideoDimensions] = useState({ width: 1280, height: 720 })

  const [scale, setScale] = useState<number>(1)
  const [translation, setTranslation] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [trajectoryAnalysis, setTrajectoryAnalysis] = useState<TrajectoryAnalysis[]>([]);

  const [angleSensitivity, setAngleSensitivity] = useState<number>(45)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Estilos
  const axisStyles = {
    fontSize: '10px',
    fill: '#64748B',
    userSelect: 'none' as const
  }

  const videoAreaStyles = {
    stroke: '#94A3B8',
    strokeWidth: 1,
    strokeDasharray: '4,4',
    fill: 'transparent'
  }

  const containerStyles = {
    position: 'relative',
    backgroundColor: '#f9fafb',
    borderRadius: '0.75rem',
    padding: '1rem',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    height: '400px',
    touchAction: 'none' as const
  }

  const svgStyles = {
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem',
    cursor: isDragging ? 'grabbing' : 'grab'
  }

  const exportTrajectoriesToPdf = async () => {
    if (trajectoryAnalysis.length === 0) {
      console.warn("No hay datos de análisis de trayectorias para exportar a PDF.");
      return;
    }

    try {
      const doc = new jsPDF();
      doc.setFont("helvetica");
      doc.setTextColor(33, 33, 33);

      // Título
      doc.setFontSize(18);
      doc.text("Análisis de Trayectorias", 20, 20);

      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 25, 190, 25);

      let y = 35;
      const lineHeight = 7;
      const startX = 20;

      // Iterar sobre cada análisis de trayectoria
      trajectoryAnalysis.forEach((item, index) => {
        // Verificar espacio en página
        if (y + 100 > doc.internal.pageSize.height && index < trajectoryAnalysis.length - 1) {
          doc.addPage();
          y = 20;
        }

        // ID del objeto
        doc.setFontSize(14);
        doc.text(`ID: ${item.id}`, startX, y);
        y += lineHeight;

        // Información básica en dos columnas
        const col1 = startX;
        const col2 = startX + 90;

        doc.setFontSize(10);
        // Columna 1
        doc.text(`Primera detección: Frame ${item.firstDetection} (${(item.firstDetection / 30).toFixed(2)}s)`, col1, y);
        doc.text(`Última detección: Frame ${item.lastDetection} (${(item.lastDetection / 30).toFixed(2)}s)`, col1, y + lineHeight);
        doc.text(`Duración visible: ${item.durationSeconds.toFixed(2)} segundos`, col1, y + lineHeight * 2);
        // Columna 2
        doc.text(`Velocidad promedio: ${item.averageSpeed.toFixed(2)} px/frame`, col2, y);
        doc.text(`Distancia total: ${item.totalDistance.toFixed(2)} px`, col2, y + lineHeight);
        doc.text(`Cambios de dirección: ${item.directionChanges.length}`, col2, y + lineHeight * 2);

        y += lineHeight * 3.5;

        // Cambios de dirección
        if (item.directionChanges.length > 0) {
          doc.setFontSize(11);
          doc.text("Cronología de los cambios de dirección:", startX, y);
          y += lineHeight;

          doc.setFontSize(10);
          item.directionChanges.forEach((change, idx) => {
            if (y + lineHeight * 3 > doc.internal.pageSize.height) {
              doc.addPage();
              y = 20;
            }

            doc.text(`${(change.frame / 30).toFixed(1)} segundos (Frame ${change.frame})`, startX + 5, y);
            y += lineHeight;
            doc.text(`Desde (${change.fromCoord.x.toFixed(0)}, ${change.fromCoord.y.toFixed(0)}) ${change.fromDirection}`, startX + 10, y);
            y += lineHeight;
            doc.text(`Hacia (${change.toCoord.x.toFixed(0)}, ${change.toCoord.y.toFixed(0)}) ${change.toDirection}`, startX + 10, y);
            y += lineHeight * 0.5; // Espacio entre cambios
          });
        }

        y += lineHeight * 1.5; // Espacio entre objetos
      });

      // Pie de página
      const now = new Date();
      const date = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generado el ${date}`, 20, doc.internal.pageSize.height - 15);

      // Guardar PDF
      const filename = `trayectorias_analisis_${Date.now()}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("Error al exportar a PDF:", error);
    }
  };

 function calculateDirectionChanges(points: Point[], angleThreshold: number = 45): any[] {
  if (points.length < 3) return [];

  const changes = [];
  const minSegmentLength = 5; // Número mínimo de puntos para considerar un segmento
  
  // Función para calcular el ángulo entre tres puntos
  const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
    // Vectores entre puntos
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    
    // Magnitudes de los vectores
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    // Producto punto
    const dot = v1.x * v2.x + v1.y * v2.y;
    
    // Ángulo en radianes
    let angle = Math.acos(dot / (mag1 * mag2));
    
    // Convertir a grados
    return angle * (180 / Math.PI);
  };

  // Función para suavizar la trayectoria (promedio móvil)
  const smoothPoints = (points: Point[], windowSize = 3): Point[] => {
    if (points.length <= windowSize) return points;
    
    const smoothed: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(points.length - 1, i + Math.floor(windowSize / 2));
      
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      
      for (let j = start; j <= end; j++) {
        sumX += points[j].x;
        sumY += points[j].y;
        count++;
      }
      
      smoothed.push({
        x: sumX / count,
        y: sumY / count,
        frame: points[i].frame
      });
    }
    
    return smoothed;
  };

  // Suavizar los puntos primero para reducir ruido
  const smoothedPoints = smoothPoints(points);
  
  // Dividir la trayectoria en segmentos y analizar cambios
  let segmentStart = 0;
  for (let i = 2; i < smoothedPoints.length; i++) {
    const p1 = smoothedPoints[i-2];
    const p2 = smoothedPoints[i-1];
    const p3 = smoothedPoints[i];
    
    const angle = calculateAngle(p1, p2, p3);
    
    if (angle > angleThreshold) {
      // Verificar que el segmento tenga suficiente longitud
      if (i - segmentStart >= minSegmentLength) {
        // Calcular dirección antes y después del cambio
        const prevSegment = smoothedPoints.slice(segmentStart, i-1);
        const nextSegment = smoothedPoints.slice(i);
        
        const prevDirection = getAverageDirection(prevSegment);
        const nextDirection = getAverageDirection(nextSegment);
        
        changes.push({
          frame: p2.frame || i-1,
          angle: Math.round(angle * 10) / 10,
          fromCoord: { x: p1.x, y: p1.y },
          toCoord: { x: p3.x, y: p3.y },
          fromDirection: getDirectionDescription(prevDirection.x, prevDirection.y),
          toDirection: getDirectionDescription(nextDirection.x, nextDirection.y),
          point: { x: p2.x, y: p2.y }
        });
        
        segmentStart = i;
      }
    }
  }
  
  return changes;
}

// Función auxiliar para calcular la dirección promedio de un segmento
function getAverageDirection(points: Point[]): {x: number, y: number} {
  if (points.length < 2) return {x: 0, y: 0};
  
  let sumX = 0;
  let sumY = 0;
  
  for (let i = 1; i < points.length; i++) {
    sumX += points[i].x - points[i-1].x;
    sumY += points[i].y - points[i-1].y;
  }
  
  return {
    x: sumX / (points.length - 1),
    y: sumY / (points.length - 1)
  };
}

// Función para calcular ángulo entre vectores (mejorada)
function calculateAngleBetweenVectors(dx1: number, dy1: number, dx2: number, dy2: number): number {
  // Normalizar vectores
  const mag1 = Math.sqrt(dx1*dx1 + dy1*dy1);
  const mag2 = Math.sqrt(dx2*dx2 + dy2*dy2);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  // Producto punto
  const dot = dx1*dx2 + dy1*dy2;
  
  // Calcular coseno del ángulo (con protección contra errores de precisión)
  let cosTheta = dot / (mag1 * mag2);
  cosTheta = Math.max(-1, Math.min(1, cosTheta)); // Clamp entre -1 y 1
  
  // Calcular ángulo en radianes y convertir a grados
  const angleRad = Math.acos(cosTheta);
  return angleRad * (180 / Math.PI);
}

  // Función auxiliar para obtener la descripción de la dirección (solo el núcleo de la dirección)
 function getDirectionDescription(dx: number, dy: number): string {
  const magnitude = Math.sqrt(dx*dx + dy*dy);
  
  if (magnitude < 0.1) return "estático";
  
  // Normalizar
  const nx = dx / magnitude;
  const ny = dy / magnitude;
  
  // Calcular ángulo en grados (0-360)
  let angle = Math.atan2(ny, nx) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  
  // Direcciones cardinales con umbrales ajustados
  const directions = [
    {angle: 0, name: "derecha"},
    {angle: 45, name: "arriba-derecha"},
    {angle: 90, name: "arriba"},
    {angle: 135, name: "arriba-izquierda"},
    {angle: 180, name: "izquierda"},
    {angle: 225, name: "abajo-izquierda"},
    {angle: 270, name: "abajo"},
    {angle: 315, name: "abajo-derecha"},
    {angle: 360, name: "derecha"}
  ];
  
  // Encontrar la dirección más cercana
  let closest = directions[0];
  let minDiff = Math.abs(angle - directions[0].angle);
  
  for (const dir of directions.slice(1)) {
    const diff = Math.abs(angle - dir.angle);
    if (diff < minDiff) {
      minDiff = diff;
      closest = dir;
    }
  }
  
  return closest.name;
}


 const analyzeTrajectories = (angleThreshold: number = 45) => {
  if (selectedIds.size === 0) return;

  const analysis: TrajectoryAnalysis[] = [];

  Array.from(selectedIds).forEach(id => {
    const points = trajectories[id];
    if (!points || points.length < 3) return;

    // Ordenar puntos por frame number
    const sortedPoints = [...points].sort((a, b) => (a.frame || 0) - (b.frame || 0));

    const firstDetection = sortedPoints[0].frame || 0;
    const lastDetection = sortedPoints[sortedPoints.length - 1].frame || 0;
    const durationSeconds = (lastDetection - firstDetection) / 30; // Asumiendo 30fps

    // Calcular distancia total y velocidad
    let totalDistance = 0;
    const speeds: number[] = [];

    for (let i = 1; i < sortedPoints.length; i++) {
      const dx = sortedPoints[i].x - sortedPoints[i-1].x;
      const dy = sortedPoints[i].y - sortedPoints[i-1].y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      totalDistance += distance;
      
      // Calcular velocidad (px por frame)
      const frameDiff = (sortedPoints[i].frame || i) - (sortedPoints[i-1].frame || (i-1));
      const speed = frameDiff > 0 ? distance / frameDiff : 0;
      speeds.push(speed);
    }

    // Calcular cambios de dirección usando la nueva función
    const directionChanges = calculateDirectionChanges(sortedPoints, angleThreshold);

    analysis.push({
      id,
      firstDetection,
      lastDetection,
      durationSeconds,
      directionChanges,
      totalDistance,
      averageSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0
    });
  });

  setTrajectoryAnalysis(analysis);
  setShowAnalysis(true);
};

  // Handlers para zoom y pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - translation.x,
      y: e.clientY - translation.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    setTranslation({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

    const handleMouseEnter = () => {
    document.body.style.overflow = 'hidden'; // Bloquea el scroll del body
  };
  const handleMouseLeave = () => {
    document.body.style.overflow = ''; // Restaura el scroll del body
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Evita que el evento se propague
    const delta = e.deltaY;
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, scale * zoomFactor));
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setTranslation(prev => ({
      x: mouseX - (mouseX - prev.x) * zoomFactor,
      y: mouseY - (mouseY - prev.y) * zoomFactor
    }));
    setScale(newScale);
  };

  // Colores para las trayectorias
  const getTrajectoryColor = (id: string) => 
    getColorForId(id, COLOR_PALETTE)

  // Efecto para la reproducción automática
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= totalFrames) {
          setIsPlaying(false)
          return totalFrames
        }
        return prev + playbackSpeed
      })
    }, 1000 / 24)

    return () => clearInterval(interval)
  }, [isPlaying, playbackSpeed, totalFrames])

  // Carga de trayectorias
  useEffect(() => {
    if (!taskId) return

    const fetchTrajectories = async () => {
      setLoading(true)
      try {
        const res = await fetch(`http://localhost:8000/videos/${taskId}/trajectories`)
        if (!res.ok) throw new Error("Error al obtener trayectorias")
        
        const { detections } = await res.json()
        
        const trajectoriesMap: Record<string, Point[]> = {}
        let maxFrame = 0
        
        detections.forEach((frame: any) => {
          frame.boxes.forEach((box: any) => {
            const id = box.id.toString()
            if (!trajectoriesMap[id]) trajectoriesMap[id] = []
            trajectoriesMap[id].push({ 
              x: box.x, 
              y: box.y,
              frame: frame.frame
            })
          })
          maxFrame = Math.max(maxFrame, frame.frame)
        })
        
        setTrajectories(trajectoriesMap)
        setTotalFrames(maxFrame)
        
        // Obtener dimensiones del video si están disponibles
        try {
          const metricsRes = await fetch(`http://localhost:8000/videos/${taskId}/metrics`)
          if (metricsRes.ok) {
            const metrics = await metricsRes.json()
            if (metrics.processed_resolution) {
              setVideoDimensions({
                width: metrics.processed_resolution.width,
                height: metrics.processed_resolution.height
              })
            }
          }
        } catch (e) {
          console.log("No se pudieron obtener las dimensiones del video, usando valores por defecto")
        }
        
        const ids = Object.keys(trajectoriesMap)
        if (ids.length > 0) {
          setSelectedIds(new Set(ids.slice(0, 3)))
        }
        
      } catch (err) {
        console.error("Error trayectorias:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchTrajectories()
  }, [taskId])

  // Toggle para seleccionar IDs
  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      newSet.has(id) ? newSet.delete(id) : newSet.add(id)
      return newSet
    })
  }

  // Cálculo de dimensiones
  const calculateDimensions = () => {
    return {
      width: videoDimensions.width,
      height: videoDimensions.height
    }
  }
  
  const { width, height } = calculateDimensions()
  const normalizedTrajectories = useMemo(() => {
    return Object.fromEntries(
      Object.entries(trajectories).map(([id, points]) => [
        id, 
        points.map(p => ({
          ...p,
          x: p.x * (width / videoDimensions.width),
          y: p.y * (height / videoDimensions.height)
        }))
      ])
    )
  }, [trajectories, width, height, videoDimensions])

  return (
    <Card className="mt-6 border-none shadow-lg">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Visualización de Trayectorias</h3>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : Object.keys(trajectories).length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No se encontraron datos de trayectorias
          </div>
        ) : (
          <>
            <div className="mb-6 pb-2 overflow-x-auto whitespace-nowrap">
              {Object.keys(trajectories).map((id) => {
                const color = getColorForId(id, COLOR_PALETTE)

                return (
                  <button
                    key={id}
                    onClick={() => toggleId(id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedIds.has(id) ? "text-white shadow-md" : "text-gray-700 bg-gray-100 hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor: selectedIds.has(id) ? color : "",
                    }}
                  >
                    ID: {id}
                  </button>
                )
              })}
            </div>

            <div className="relative bg-gray-50 rounded-xl p-4 border border-gray-200" style={{ overflow: 'hidden', height: '400px' }}>
              <svg 
                width="100%" 
                height="100%"
                viewBox={`0 0 ${width} ${height}`}
                className="rounded-lg cursor-grab"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  handleMouseUp();
                  handleMouseLeave();
                }}
                onMouseEnter={handleMouseEnter}
                onWheel={handleWheel}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                <g transform={`translate(${translation.x} ${translation.y}) scale(${scale})`}>
                  {/* Grid de fondo */}
                  <pattern 
                    id="grid" 
                    width="100" 
                    height="100" 
                    patternUnits="userSpaceOnUse"
                  >
                    <path 
                      d="M 100 0 L 0 0 0 100" 
                      fill="none" 
                      stroke="rgba(200, 200, 200, 0.3)" 
                      strokeWidth="1"
                    />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Ejes X e Y */}
                  <line x1="0" y1="0" x2="0" y2={height} stroke="#64748B" strokeWidth="2" />
                  <line x1="0" y1={height} x2={width} y2={height} stroke="#64748B" strokeWidth="2" />

                  {/* Escalas en los ejes */}
                  {Array.from({ length: Math.ceil(width / 100) }).map((_, i) => (
                    <g key={`x-scale-${i}`}>
                      <line 
                        x1={i * 100} 
                        y1={height} 
                        x2={i * 100} 
                        y2={height - 5} 
                        stroke="#64748B" 
                        strokeWidth="1"
                      />
                      <text
                        x={i * 100}
                        y={height + 15}
                        textAnchor="middle"
                        style={axisStyles}
                      >
                        {i * 100}
                      </text>
                    </g>
                  ))}
                  
                  {Array.from({ length: Math.ceil(height / 100) }).map((_, i) => (
                    <g key={`y-scale-${i}`}>
                      <line 
                        x1={0} 
                        y1={i * 100} 
                        x2={5} 
                        y2={i * 100} 
                        stroke="#64748B" 
                        strokeWidth="1"
                      />
                      <text
                        x={-10}
                        y={i * 100}
                        textAnchor="end"
                        dominantBaseline="middle"
                        style={axisStyles}
                      >
                        {i * 100}
                      </text>
                    </g>
                  ))}

                  {/* Área del video */}
                  <rect
                    x={0}
                    y={0}
                    width={videoDimensions.width}
                    height={videoDimensions.height}
                    style={videoAreaStyles}
                  />

                  {/* Trayectorias */}
                  {Array.from(selectedIds).map((id) => {
                    const points = normalizedTrajectories[id] || []
                    const color = getColorForId(id, COLOR_PALETTE)
                    const visiblePoints = points.filter(p => p.frame === undefined || p.frame <= currentFrame)
                    
                    return (
                      <g key={id}>
                        <polyline
                          fill="none"
                          stroke={color}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={visiblePoints.map(p => `${p.x},${p.y}`).join(" ")}
                        />
                        {visiblePoints.map((point, i) => (
                          <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r={i === 0 ? 5 : (i === visiblePoints.length - 1 ? 4 : 0)}
                            fill={color}
                            stroke="#fff"
                            strokeWidth={1.5}
                          />
                        ))}
                        {visiblePoints.length > 0 && (
                          <text
                            x={visiblePoints[0].x + 8}
                            y={visiblePoints[0].y - 8}
                            fill={color}
                            fontSize="12"
                            fontWeight="bold"
                          >
                            ID {id}
                          </text>
                        )}
                      </g>
                    )
                  })}

                  {/* Puntos manuales */}
                  {manualPoints.length > 0 && (
                    <g>
                      <polyline
                        fill="none"
                        stroke="#FF6B6B"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        points={manualPoints.map(p => `${p.x},${p.y}`).join(" ")}
                      />
                      {manualPoints.map((point, idx) => (
                        <circle
                          key={idx}
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          fill="#FF6B6B"
                          stroke="#FFF"
                          strokeWidth="1.5"
                        />
                      ))}
                    </g>
                  )}
                </g>
              </svg>

              {/* Controles de reproducción */}
              <VideoControls
                currentTime={currentFrame / 30}
                duration={totalFrames / 30}
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onSeek={(time) => {
                  setCurrentFrame(Math.floor(time * 30))
                  setIsPlaying(false)
                }}
                onForward={(seconds) => setCurrentFrame(prev => Math.min(totalFrames, prev + seconds * 30))}
                onBackward={(seconds) => setCurrentFrame(prev => Math.max(0, prev - seconds * 30))}
                onRestart={() => {
                  setCurrentFrame(0)
                  setIsPlaying(false)
                }}
              />

              {/* Controles de zoom y vista */}
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={() => {
                    setScale(1)
                    setTranslation({ x: 0, y: 0 })
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Resetear Vista
                </button>
                <button
                  onClick={() => setScale(prev => Math.min(10, prev * 1.2))}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Zoom In
                </button>
                <button
                  onClick={() => setScale(prev => Math.max(0.1, prev * 0.8))}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Zoom Out
                </button>
              </div>

              {/* Etiquetas de ejes */}
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Eje X (px)</span>
                <span>Eje Y (px)</span>
              </div>
            </div>
            
            {/* Contenedor principal para controles y conteo de trayectorias */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
              {/* Controles de sensibilidad y botón de análisis */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col w-full max-w-xs">
                  <label className="text-sm font-medium text-gray-700 mb-1">Sensibilidad de cambio de dirección (en grados)</label>
                  <input 
                    type="range" 
                    min={10} 
                    max={120} 
                    value={angleSensitivity}
                    onChange={(e) => setAngleSensitivity(Number(e.target.value))}
                  />
                  <div className="text-xs text-gray-500 mt-1">Ángulo mínimo para considerar cambio de dirección: <strong>{angleSensitivity}°</strong></div>
                </div>

                <Button
                  onClick={() => analyzeTrajectories(angleSensitivity)}
                  disabled={selectedIds.size === 0}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  Analizar Trayectorias
                </Button>
              </div>

              {/* Información de trayectorias mostradas */}
              <div className="text-right text-sm text-gray-600 mt-2 md:mt-0">
                Mostrando {selectedIds.size} de {Object.keys(trajectories).length} trayectorias
              </div>
            </div>

            {/* Modal de análisis con acordeones */}
            <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl shadow-xl bg-white border border-gray-200">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-gray-800">Análisis de Trayectorias</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500">
                    Resultados para los ID seleccionados con sensibilidad de {angleSensitivity}°
                  </DialogDescription>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" onClick={exportTrajectoriesToPdf} disabled={trajectoryAnalysis.length === 0}>
                      <FileText className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                </DialogHeader>

                <div className="space-y-2 mt-4">
                  {trajectoryAnalysis.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          const newExpanded = new Set(expandedItems);
                          if (newExpanded.has(item.id)) {
                            newExpanded.delete(item.id);
                          } else {
                            newExpanded.add(item.id);
                          }
                          setExpandedItems(newExpanded);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: getColorForId(item.id, COLOR_PALETTE) }}
                          />
                          <span className="font-medium">ID: {item.id}</span>
                          <span className="text-sm text-gray-500">
                            ({item.directionChanges.length} cambios de dirección)
                          </span>
                        </div>
                        <svg
                          className={`w-5 h-5 transform transition-transform ${
                            expandedItems.has(item.id) ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {expandedItems.has(item.id) && (
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700 mb-3">
                            <div>
                              <div className="text-gray-500">Primera detección</div>
                              <div>Frame {item.firstDetection} ({(item.firstDetection / 30).toFixed(2)}s)</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Última detección</div>
                              <div>Frame {item.lastDetection} ({(item.lastDetection / 30).toFixed(2)}s)</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Duración visible</div>
                              <div>{item.durationSeconds.toFixed(2)} segundos</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Velocidad promedio</div>
                              <div>{item.averageSpeed.toFixed(2)} px/frame</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Distancia total recorrida</div>
                              <div>{item.totalDistance.toFixed(2)} px</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Cantidad de cambios de dirección</div>
                              <div>{item.directionChanges.length}</div>
                            </div>
                          </div>

                          {item.directionChanges.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <h4 className="text-md font-medium text-gray-800 mb-2">Cronología de los cambios de dirección:</h4>
                              <div className="space-y-3">
                                {item.directionChanges.map((change, idx) => (
                                  <div key={idx} className="text-sm pl-2">
                                    <div className="font-medium">
                                      {(change.frame / 30).toFixed(1)} segundos (Frame {change.frame})
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1 ml-3">
                                      Desde ({change.fromCoord.x.toFixed(0)}, {change.fromCoord.y.toFixed(0)}) {change.fromDirection}
                                    </div>
                                    <div className="text-xs text-gray-600 ml-3">
                                      Hacia ({change.toCoord.x.toFixed(0)}, {change.toCoord.y.toFixed(0)}) {change.toDirection}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setShowAnalysis(false)}>Cerrar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}