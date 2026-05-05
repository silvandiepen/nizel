import { createMarkdownItEngine } from './markdown-it.js';
import { createMarkedEngine } from './marked.js';
import { createNizelEngine } from './nizel.js';
import { createRemarkEngine } from './remark.js';

export const createEngines = async () => [
  createMarkdownItEngine(),
  createMarkedEngine(),
  createRemarkEngine(),
  await createNizelEngine(),
];
