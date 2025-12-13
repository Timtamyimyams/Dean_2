import { Move } from 'lucide-react';

export const selectTool = {
  id: 'select',
  icon: Move,
  label: 'Select/Move',
  hotkey: 'S',
  cursor: 'default',
  
  onMouseDown: ({ x, y, target }, context) => {
    context.setIsSelecting(true);
    context.setSelectionStart({ x, y });
    context.setSelectionBox({ x, y, width: 0, height: 0 });
    // Only clear selection if NOT holding shift
    if (!target.shiftKey) {
      context.setSelectedElements([]);
    }
  },
};
