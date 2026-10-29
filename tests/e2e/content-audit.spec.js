import { test, expect } from '@playwright/test';

const expectedCues = {
  'frame-01': ['porta', 'sombra', 'escada', 'ranger'],
  'frame-02': ['fotografia', 'corredor', 'assoalho', 'passo'],
  'frame-03': ['escada', 'degrau', 'escuro', 'arrastar'],
  'frame-04': ['janela', 'chuva', 'cortina', 'sino']
};

function letteringFromSvg(source) {
  return [...source.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)].map((match) => match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()).filter(Boolean);
}

test('audits every production frame for literal lettering and detailed equivalent content', async ({ page }) => {
  const storyResponse = await page.request.get('/src/data/story.json');
  expect(storyResponse.ok()).toBeTruthy();
  const story = await storyResponse.json();
  const frames = story.scenes.flatMap((scene) => scene.frames);
  expect(frames.length).toBeGreaterThan(0);
  for (const frame of frames) {
    const sourceResponse = await page.request.get(`/tests/fixtures/assets/frames/${frame.id}.svg`);
    expect(sourceResponse.ok()).toBeTruthy();
    const lettering = letteringFromSvg(await sourceResponse.text());
    expect(lettering.length).toBeGreaterThan(0);
    for (const text of lettering) {
      expect(frame.description, `${frame.id} must reproduce ${text}`).toContain(text);
      expect(frame.alt, `${frame.id} alt must expose ${text}`).toContain(text);
    }
    expect(frame.alt.trim().length).toBeGreaterThan(8);
    expect(frame.alt.trim().length).toBeLessThanOrEqual(120);
    expect(frame.description.trim().length).toBeGreaterThan(180);
    expect(frame.description.split(/\s+/).length).toBeGreaterThanOrEqual(25);
    const lowerDescription = frame.description.toLocaleLowerCase('pt-BR');
    for (const cue of expectedCues[frame.id] || []) expect(lowerDescription).toContain(cue);
    for (const field of ['avifSrcset', 'webpSrcset', 'fallbackSrcset', 'sizes']) {
      expect(frame.image[field], `${frame.id} is missing ${field}`).toBeTruthy();
    }
  }
});

test('production frame four describes the lettering actually embedded in its source', async ({ page }) => {
  const storyResponse = await page.request.get('/src/data/story.json');
  const story = await storyResponse.json();
  const frame = story.scenes.flatMap((scene) => scene.frames).find((item) => item.id === 'frame-04');
  const sourceResponse = await page.request.get('/tests/fixtures/assets/frames/frame-04.svg');
  const lettering = letteringFromSvg(await sourceResponse.text());
  expect(lettering).toContain('A CHUVA NÃO PARA');
  expect(frame.description).toContain('A CHUVA NÃO PARA');
  expect(frame.description).not.toContain('Não olhe para trás');
});
