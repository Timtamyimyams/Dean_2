import { Minus } from 'lucide-react';

export const lineTool = {
  id: 'line',
  icon: Minus,
  label: 'Line',
  hotkey: 'L',
  cursor: 'crosshair',
  
  onMouseDown: ({ x, y }, context) => {
    context.setIsDrawing(true);
    context.setCurrentPath([{ x, y }]);
  },
  
  onMouseMove: ({ x, y }, context) => {
    if (context.isDrawing && context.currentPath.length > 0) {
      context.setCurrentPath([context.currentPath[0], { x, y }]);
    }
  },
  
  onMouseUp: (coords, context) => {
    if (context.isDrawing && context.currentPath.length > 0) {
      const newElement = {
        id: Date.now(),
        type: 'line',
        path: context.currentPath,
        color: '#ffffff',
        width: 2
      };
      context.setElements([...context.elements, newElement]);
      context.setCurrentPath([]);
    }
  },
};
