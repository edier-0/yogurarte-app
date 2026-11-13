import { describe, it, expect } from 'vitest';
import { updateSystemTemplateSchema } from '../src/modules/crm/crm.schema.js';

describe('updateSystemTemplateSchema (Validación Zod)', () => {
  it('debe aceptar payload que solo contiene autoTrigger: true o false sin requerir content', () => {
    const parseAuto = updateSystemTemplateSchema.safeParse({ autoTrigger: true });
    expect(parseAuto.success).toBe(true);

    const parseManual = updateSystemTemplateSchema.safeParse({ autoTrigger: false });
    expect(parseManual.success).toBe(true);
  });

  it('debe aceptar payload que solo contiene content', () => {
    const parseContent = updateSystemTemplateSchema.safeParse({ content: 'Texto nuevo' });
    expect(parseContent.success).toBe(true);
  });

  it('debe aceptar payload con content y autoTrigger juntos', () => {
    const parseBoth = updateSystemTemplateSchema.safeParse({ content: 'Texto nuevo', autoTrigger: true });
    expect(parseBoth.success).toBe(true);
  });

  it('debe rechazar payload vacío (sin content ni autoTrigger)', () => {
    const parseEmpty = updateSystemTemplateSchema.safeParse({});
    expect(parseEmpty.success).toBe(false);
  });

  it('debe rechazar content vacío o solo espacios', () => {
    const parseBlank = updateSystemTemplateSchema.safeParse({ content: '   ' });
    expect(parseBlank.success).toBe(false);
  });
});
