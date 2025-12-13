import { Type } from 'lucide-react';

export const textTool = {
  id: 'text',
  icon: Type,
  label: 'Text',
  hotkey: 'T',
  cursor: 'text',
  autoSwitchToSelect: true,
  
  onCanvasClick: ({ x, y }, context) => {
    // Skip if we just finished editing text (grace click)
    if (context.justFinishedTextEdit) return;
    
    const newElement = {
      id: Date.now(),
      type: 'text',
      x,
      y,
      content: '',
      fontSize: 14,
      width: 200,
      height: 40,
    };
    context.setElements([...context.elements, newElement]);
    context.setEditingText(newElement.id);
    context.setTextInput('');
  },
};
