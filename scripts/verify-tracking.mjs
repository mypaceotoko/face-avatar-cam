import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Optional smoke test: an explicitly downloaded, local MediaPipe model.
// No camera image, face fixture, paid API or upload is involved.
const modelPath = process.env.MODEL_PATH;
if (!modelPath) throw new Error('Set MODEL_PATH to a local face_landmarker.task. See README.');
const model = await fs.readFile(modelPath);
const manifest = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
const version = manifest.dependencies['@mediapipe/tasks-vision'];
const source = await fs.readFile(new URL('../src/hooks/useFaceLandmarker.ts', import.meta.url), 'utf8');
assert.ok(source.includes(`tasks-vision@${version}/wasm`), 'JS and WASM versions must match');
const server = await createServer({server: {host: '127.0.0.1', port: 5175, strictPort: true}});
await server.listen();
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({ignoreHTTPSErrors: true});
  await page.route(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${version}/wasm/**`, async route => {
    const file = path.basename(new URL(route.request().url()).pathname);
    await route.fulfill({path: new URL(`../node_modules/@mediapipe/tasks-vision/wasm/${file}`, import.meta.url).pathname, contentType: file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript', headers: {'access-control-allow-origin': '*'}});
  });
  await page.route('https://storage.googleapis.com/**/face_landmarker.task', route => route.fulfill({body: model, contentType: 'application/octet-stream', headers: {'access-control-allow-origin': '*'}}));
  await page.goto('https://127.0.0.1:5175');
  const delegates = await page.evaluate(async version => {
    const {FaceLandmarker, FilesetResolver} = await import('/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs');
    const files = await FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${version}/wasm`);
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#a09283'; ctx.fillRect(0, 0, 320, 240);
    const results = {};
    for (const delegate of ['GPU', 'CPU']) {
      let detector;
      try {
        detector = await FaceLandmarker.createFromOptions(files, {baseOptions: {modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task', delegate}, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true});
        const output = detector.detectForVideo(canvas, performance.now());
        results[delegate] = {initialized: true, faces: output.faceLandmarks.length};
      } catch (error) { results[delegate] = {initialized: false, error: String(error)}; }
      finally { detector?.close(); }
    }
    return results;
  }, version);
  assert.equal(delegates.CPU.initialized, true, 'CPU fallback must initialize and run');
  assert.equal(delegates.CPU.faces, 0, 'Blank input must not generate a face');
  if (delegates.GPU.initialized) assert.equal(delegates.GPU.faces, 0);
  const report = {date: new Date().toISOString(), version, modelSHA256: createHash('sha256').update(model).digest('hex'), delegates, scope: 'Real model and WASM, blank synthetic input, local files served at production URLs; no human tracking or live CDN delivery validated.'};
  await fs.writeFile(new URL('../docs/qa/tracking-smoke.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); await server.close(); }
