import { buildDefaultCalculationResolver, buildDemoKnowledgeBase } from '@thermocycler/core';

// La base de conocimiento de demo es inmutable durante la sesión, así
// que se construye una sola vez a nivel de módulo y se comparte.
export const knowledgeBase = buildDemoKnowledgeBase();
export const calculationResolver = buildDefaultCalculationResolver();
export const DEMO_ASSAY_ID = 'assay-demo';
export const demoAssay = knowledgeBase.getAssayComponents(DEMO_ASSAY_ID);
