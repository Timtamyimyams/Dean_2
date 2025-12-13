import { Pencil } from 'lucide-react';

export const drawTool = {
  id: 'draw',
  icon: Pencil,
  label: 'Draw',
  hotkey: 'D',
  cursor: 'crosshair',
  
  onMouseDown: ({ x, y }, context) => {
    context.setIsDrawing(true);
    context.setCurrentPath([{ x, y }]);
  },
  
  onMouseMove: ({ x, y }, context) => {
    if (context.isDrawing) {
      context.setCurrentPath([...context.currentPath, { x, y }]);
    }
  },
  
  onMouseUp: (coords, context) => {
    if (context.isDrawing && context.currentPath.length > 0) {
      const newElement = {
        id: Date.now(),
        type: 'draw',
        path: context.currentPath,
        color: '#ffffff',
        width: 2
      };
      context.setElements([...context.elements, newElement]);
      context.setCurrentPath([]);
    }
  },
};
