import { Eraser } from 'lucide-react';

export const eraseTool = {
  id: 'erase',
  icon: Eraser,
  label: 'Erase',
  hotkey: 'E',
  cursor: 'not-allowed',
  
  onMouseDown: ({ x, y }, context) => {
    context.setIsErasing(true);
    context.setEraseStart({ x, y });
    context.setEraseBox({ x, y, width: 0, height: 0 });
  },
};
