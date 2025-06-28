"use client";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

import { Card, CardContent } from "./ui/card";

//EN PROCESO

interface BehaviorEvent {
  type: string;
  group_ids: number[];
  start_frame: number;
  end_frame: number;
  duration: number;
  confidence: number;
  centroid: [number, number];
  metadata: Record<string, any>;
}

interface BehaviorData {
  total_events: number;
  behavior_types: Record<string, number>;
  events: BehaviorEvent[];
}

export default function GroupBehaviorChart({ taskId }: { taskId: string | null }) {
  const [behaviorData, setBehaviorData] = useState<BehaviorData | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      if (!taskId) return;
      try {
        const res = await fetch(`http://localhost:8000/videos/${taskId}/group_behavior`);
        if (!res.ok) throw new Error("No se pudieron obtener los datos");
        const data = await res.json();
        setBehaviorData(data);
      } catch (err) {
        console.error("Error al obtener comportamiento grupal:", err);
      }
    };

    fetchData();
  }, [taskId]);

  if (!behaviorData || !behaviorData.events || !behaviorData.behavior_types) {
    return <p className="text-muted-foreground">Cargando comportamiento grupal...</p>;
  }
  
  const eventsByType = Object.entries(behaviorData.behavior_types).map(([type, count]) => ({
    type,
    count
  }));
  
  const eventsByFrameMap: Record<number, number> = {};
  behaviorData.events.forEach((event) => {
    const frame = event.start_frame;
    eventsByFrameMap[frame] = (eventsByFrameMap[frame] || 0) + 1;
  });
  
  const eventsByFrame = Object.entries(eventsByFrameMap).map(([frame, count]) => ({
    frame: Number(frame),
    count,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2">Eventos por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eventsByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#4e79a7" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2">Eventos por Frame</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={eventsByFrame}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="frame" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
