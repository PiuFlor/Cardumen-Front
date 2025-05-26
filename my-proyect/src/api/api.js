const API_BASE_URL = "http://localhost:8000";
const WS_URL = "ws://localhost:8000";

export const getAvailableModels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/modelos/yolo`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al obtener modelos');
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
};

export const uploadFile = async (file, technology = "yolo", model = "yolov8n") => {
  if (!file) throw new Error("No se ha seleccionado ningún archivo");
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tecnologia", technology);
  formData.append("modelo", model);
  const endpoint = file.type.startsWith('video/') ? 
    `${API_BASE_URL}/upload/video` : 
    `${API_BASE_URL}/upload/image`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Error al procesar el archivo");
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || (!contentType.includes('image') && !contentType.includes('video'))) {
      throw new Error("Respuesta inesperada del servidor");
    }

    return await response.blob();
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const createWebSocket = (technology, model, onMessage) => {
  const params = new URLSearchParams();
  if (technology) params.append('tecnologia', technology);
  if (model) params.append('modelo', model);
  
  const ws = new WebSocket(`${WS_URL}/ws/image?${params.toString()}`);
  
  ws.onopen = () => {
    console.log('WebSocket connection established');
    // Enviar mensaje inicial de configuración
    ws.send(JSON.stringify({
      type: 'init',
      technology,
      model
    }));
  };
  
  ws.onclose = (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
    onMessage({ type: 'status', status: 'disconnected' });
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    onMessage({ type: 'error', message: 'Error de conexión' });
  };
  
  ws.onmessage = (event) => {
    console.log('WebSocket message received:', event.data);
    try {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        if (data.type === 'error') {
          console.error('Server error:', data.message);
          onMessage({ type: 'error', message: data.message });
        } else {
          onMessage(data);
        }
      } else {
        const blob = new Blob([event.data], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        onMessage({ type: 'image', url });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      onMessage({ type: 'error', message: 'Error procesando datos' });
    }
  };

  // Función para cerrar correctamente
  const closeConnection = () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Closing by user request');
    }
  };

  return ws;
};