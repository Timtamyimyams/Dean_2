import { selectTool } from './select';
import { scaleTool } from './scale';
import { textTool } from './text';
import { imageTool } from './Image';
import { drawTool } from './draw';
import { lineTool } from './line';
import { eraseTool } from './erase';

// Add new tools here - just import and add to the object below
export const toolDefinitions = {
  select: selectTool,
  scale: scaleTool,
  text: textTool,
  image: imageTool,
  draw: drawTool,
  line: lineTool,
  erase: eraseTool,
};

export const tools = Object.values(toolDefinitions);
