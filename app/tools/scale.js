import { Maximize2 } from 'lucide-react';

export const scaleTool = {
  id: 'scale',
  icon: Maximize2,
  label: 'Scale',
  hotkey: 'K',
  cursor: 'zoom-in',
  
  onMouseDown: ({ x, y }, context) => {
    if (context.selectedElements.length === 0) return;
    context.setIsScaling(true);
    context.setScaleStart({ x, y });
  },
};
