import { widgets } from './index.js';
import { physWidgets } from './physique.js';
import { frWidgets } from './francais.js';

export const allWidgets = { ...widgets, ...physWidgets, ...frWidgets };
