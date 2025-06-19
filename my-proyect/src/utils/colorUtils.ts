// src/utils/colorUtils.ts
export const getColorForId = (id: string | number, palette: string[]) => {
  // Convertir ID a string y calcular un hash simple
  const strId = id.toString();
  let hash = 0;
  for (let i = 0; i < strId.length; i++) {
    hash = (hash << 5) - hash + strId.charCodeAt(i);
    hash |= 0; // Convertir a entero de 32 bits
  }
  // Usar valor absoluto y módulo para obtener el índice
  const index = Math.abs(hash) % palette.length;
  return palette[index];
};