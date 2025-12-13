import { Image } from 'lucide-react';

export const imageTool = {
  id: 'image',
  icon: Image,
  label: 'Image',
  hotkey: 'I',
  cursor: 'copy',
  autoSwitchToSelect: true,
  
  onCanvasClick: ({ x, y }, context) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newElement = {
            id: Date.now(),
            type: 'image',
            x,
            y,
            src: event.target.result,
            width: 200,
            height: 200,
            filename: file.name
          };
          context.setElements(prev => [...prev, newElement]);
          setTimeout(() => context.saveToHistory(), 50);
          context.setSelectedTool('select');
        };
        reader.readAsDataURL(file);
      } else {
        context.setSelectedTool('select');
      }
    };
    input.click();
  },
};
