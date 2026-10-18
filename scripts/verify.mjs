import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

// Run with CHROMIUM_PATH=/usr/bin/chromium when using a system browser.
const server = await createServer({
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});
const output = new URL("../docs/qa/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const errors = [],
  checks = [];
function passed(name) {
  checks.push(name);
  console.log("PASS", name);
}
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  ignoreHTTPSErrors: true,
});
await context.addInitScript(() => {
  const Native = MediaRecorder;
  window.qaRecorderEvents = [];
  window.MediaRecorder = class extends Native {
    constructor(...args) {
      super(...args);
      window.qaRecordingTracks = args[0].getTracks();
      window.qaLastRecorder = this;
      for (const name of ["start", "stop", "error", "dataavailable"]) {
        this.addEventListener(name, (event) =>
          window.qaRecorderEvents.push({
            name,
            size: event.data?.size,
            error: event.error?.message,
          }),
        );
      }
    }
  };
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("https://127.0.0.1:5174");
  await page.getByRole("heading", { name: "あなたらしい表情に。" }).waitFor();
  await page.waitForTimeout(1800);
  assert.equal(
    await page
      .locator("video.camera-view--hidden")
      .evaluate((v) => v.srcObject),
    null,
  );
  passed("Camera-free studio initializes without camera permission");
  await page.getByRole("button", { name: "肌のトーン 3", exact: true }).click();
  await page.getByRole("tab", { name: "目と眉" }).click();
  await page.getByLabel("目の大きさ").fill("1.1");
  await page.reload();
  await page.waitForTimeout(1200);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("face-avatar-studio:v1")),
  );
  assert.equal(saved.skin, "#c99172");
  assert.equal(saved.eyeSize, 1.1);
  passed("Skin and eye edits survive reload");
  await page.getByRole("button", { name: "リセット", exact: true }).click();
  await page.getByRole("button", { name: "写真撮影", exact: true }).click();
  await page.getByAltText("撮影したアバター").waitFor();
  const photo = await page
    .getByAltText("撮影したアバター")
    .evaluate(async (img) => {
      const blob = await (await fetch(img.src)).blob();
      return { size: blob.size, type: blob.type };
    });
  assert.ok(photo.size > 10000);
  assert.equal(photo.type, "image/png");
  await page.getByRole("button", { name: "撮影結果を閉じる" }).click();
  passed("PNG snapshot contains rendered pixels");
  await page.getByRole("button", { name: "動画録画", exact: false }).click();
  await page.getByRole("button", { name: "録画停止", exact: false }).waitFor();
  await page.waitForTimeout(3500);
  await page.getByRole("button", { name: "録画停止", exact: false }).click();
  await page.locator(".download-card video").waitFor();
  const clip = await page
    .locator(".download-card video")
    .evaluate(async (v) => {
      const b = await (await fetch(v.src)).blob();
      return { size: b.size, type: b.type };
    });
  assert.ok(clip.size > 1000);
  assert.ok(clip.type.startsWith("video/"));
  await page.waitForFunction(() => {
    const video = document.querySelector(".download-card video");
    return video?.readyState >= 2 && video.videoWidth > 0;
  });
  assert.equal(
    await page.evaluate(() =>
      window.qaRecordingTracks.every((t) => t.readyState === "ended"),
    ),
    true,
  );
  await page.getByRole("button", { name: "撮影結果を閉じる" }).click();
  passed("Composited canvas records and returns a playable video preview");
  // Simulate an encoder failure and a late stop callback from the old session.
  await page.getByRole("button", { name: "動画録画", exact: false }).click();
  await page.getByRole("button", { name: "録画停止", exact: false }).waitFor();
  await page.evaluate(() => {
    window.qaLateStop = window.qaLastRecorder.onstop;
    window.qaLastRecorder.dispatchEvent(new Event("error"));
  });
  await page
    .getByRole("alert")
    .filter({ hasText: "録画に失敗しました" })
    .waitFor();
  await page.getByRole("button", { name: "動画録画", exact: false }).click();
  await page.getByRole("button", { name: "録画停止", exact: false }).waitFor();
  await page.evaluate(() => window.qaLateStop());
  assert.equal(
    await page.evaluate(() =>
      window.qaRecordingTracks.every((t) => t.readyState === "live"),
    ),
    true,
  );
  await page.waitForTimeout(3500);
  await page.getByRole("button", { name: "録画停止", exact: false }).click();
  await page.locator(".download-card video").waitFor();
  await page.getByRole("button", { name: "撮影結果を閉じる" }).click();
  passed(
    "Recording can retry after encoder error; late callbacks do not stop the new session",
  );

  await page.locator(".render-canvas").evaluate((c) => {
    window.qaContextExtension = c
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context");
    window.qaContextExtension.loseContext();
  });
  await page.getByText("3D表示を復旧しています…").waitFor();
  await page.waitForTimeout(200);
  await page.evaluate(() => window.qaContextExtension.restoreContext());
  await page.getByText("3D表示を復旧しています…").waitFor({ state: "hidden" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "写真撮影", exact: true }).click();
  await page.getByAltText("撮影したアバター").waitFor();
  await page.getByRole("button", { name: "撮影結果を閉じる" }).click();
  passed("WebGL context loss/restoration resumes rendering and capture");
  // Mocked denial checks guidance without depending on host camera hardware.
  await page.evaluate(() => {
    window.qaOriginalGUM = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.getByRole("button", { name: "カメラ開始", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "カメラを許可してください" })
    .waitFor();
  passed("Camera permission denial is explained and remains retryable");
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = window.qaOriginalGUM;
  });
  // Avoid downloading the MediaPipe model in this UI/lifecycle test. It is
  // separately marked unverified; synthetic video contains no human face.
  await page.route(
    "**/node_modules/@mediapipe/tasks-vision/**",
    (route) => route.abort(),
  );
  await page.getByRole("button", { name: "カメラ開始", exact: true }).click();
  await page.getByRole("button", { name: "カメラ停止", exact: true }).waitFor();
  await page.evaluate(() => {
    window.qaCameraTracks = document
      .querySelector("video.camera-view--hidden")
      .srcObject.getTracks();
  });
  await page.getByRole("button", { name: "カメラ停止", exact: true }).click();
  assert.equal(
    await page.evaluate(() =>
      window.qaCameraTracks.every((t) => t.readyState === "ended"),
    ),
    true,
  );
  passed("Synthetic camera start/stop releases all camera tracks");
  await page.unrouteAll();
  await page.reload();
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: new URL("studio-desktop.png", output).pathname,
    fullPage: true,
  });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: true,
  });
  const phone = await mobile.newPage();
  await phone.goto("https://127.0.0.1:5174");
  await phone.waitForTimeout(1500);
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await phone.getByRole("button", { name: "写真撮影", exact: true }).click();
  await phone.getByAltText("撮影したアバター").waitFor();
  await phone.getByRole("button", { name: "撮影結果を閉じる" }).click();
  await phone.screenshot({
    path: new URL("studio-mobile.png", output).pathname,
    fullPage: true,
  });
  passed(
    "390px touch layout has no horizontal overflow and capture remains reachable",
  );
  await mobile.close();

  // A separate deterministic stage verifies geometry independent of the UI.
  const model = await page.evaluate(async () => {
    const T = await import("/node_modules/.vite/deps/three.js");
    const { createAvatar } = await import("/src/three/createAvatar.ts");
    const { applyExpression } = await import("/src/three/applyExpression.ts");
    const { expressionChannels } = await import("/src/avatar/expressions.ts");
    const { DEFAULT_SETTINGS, sanitizeSettings } =
      await import("/src/avatar/settings.ts");
    const { fitFaceToVideo } = await import("/src/three/fitFaceToVideo.ts");
    const { BlendshapeSmoother } = await import("/src/face/smoothing.ts");
    const { emptyBlendshapes } = await import("/src/face/types.ts");
    const { extractFaceState } = await import("/src/face/extractFaceState.ts");
    const bad = sanitizeSettings({
      eyeSize: Infinity,
      faceWidth: 100,
      skin: "url(x)",
      hairstyle: "bogus",
    });
    const fit = fitFaceToVideo(
      { x: 0.5, y: 0.5, width: 0.3, height: 0.4 },
      120,
      80,
      0,
      1.12,
    );
    const raw = emptyBlendshapes();
    raw.jawOpen = 1;
    const s30 = new BlendshapeSmoother(),
      s60 = new BlendshapeSmoother();
    for (let i = 0; i < 10; i++) s30.update(raw, 1 / 30);
    for (let i = 0; i < 20; i++) s60.update(raw, 1 / 60);
    let valid = true,
      maxTriangles = 0;
    for (const hairstyle of ["bob", "short", "long"])
      for (const extreme of [0, 1]) {
        const a = createAvatar({
          ...DEFAULT_SETTINGS,
          hairstyle,
          faceWidth: extreme ? 1.12 : 0.88,
          eyeSize: extreme ? 1.15 : 0.85,
          eyeShape: extreme,
          nose: extreme,
          lips: extreme,
        });
        a.head.traverse((o) => {
          if (o.isMesh) {
            const p = o.geometry.attributes.position;
            for (const x of p.array) valid &&= Number.isFinite(x);
            for (const m of o.geometry.morphAttributes.position || [])
              for (const x of m.array) valid &&= Number.isFinite(x);
          }
        });
        for (const name of ["laugh", "kiss", "blink", "sad"])
          applyExpression(a, expressionChannels(name));
        a.dispose();
      }
    const r = new T.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    r.setSize(800, 800);
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    document.body.replaceChildren(r.domElement);
    document.body.style = "margin:0";
    const scene = new T.Scene();
    scene.background = new T.Color("#e8ded4");
    scene.add(new T.HemisphereLight(0xfff4e8, 0x85748b, 1.7));
    const key = new T.DirectionalLight(0xfff3e5, 2.6);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new T.DirectionalLight(0xe6eeff, 0.8);
    fill.position.set(4, 1, 3);
    scene.add(fill);
    const camera = new T.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0, 4.5);
    const avatar = createAvatar();
    scene.add(avatar.root);
    window.renderAvatar = (yaw = 0, expression = "neutral") => {
      avatar.root.rotation.y = yaw;
      applyExpression(avatar, expressionChannels(expression));
      r.render(scene, camera);
      maxTriangles = Math.max(maxTriangles, r.info.render.triangles);
      return {
        calls: r.info.render.calls,
        triangles: r.info.render.triangles,
        geometries: r.info.memory.geometries,
        closedEyeHidden:
          expression !== "blink" ||
          avatar.parts.eyes.every((e) => !e.group.children[0].visible),
      };
    };
    return {
      valid,
      bad,
      fit,
      timeDifference: Math.abs(s30.values().jawOpen - s60.values().jawOpen),
      emptyDetected: extractFaceState(null, 0).detected,
    };
  });
  assert.ok(model.valid);
  assert.equal(model.bad.eyeSize, 1);
  assert.equal(model.bad.faceWidth, 1.12);
  assert.equal(model.fit.x, 0);
  assert.equal(model.fit.y, 0);
  assert.ok(model.timeDifference < 1e-10);
  assert.equal(model.emptyDetected, false);
  passed(
    "Extreme edits keep finite geometry; stored input is sanitized; smoothing is time-based; fit centers correctly",
  );
  await page.setViewportSize({ width: 800, height: 800 });
  const renderStats = {};
  for (const [name, yaw, expression] of [
    ["front", 0, "neutral"],
    ["three-quarter", Math.PI / 4, "neutral"],
    ["profile", Math.PI / 2, "neutral"],
    ["blink", 0, "blink"],
    ["laugh", 0, "laugh"],
    ["kiss", 0, "kiss"],
    ["sad", 0, "sad"],
    ["wink", 0, "wink"],
  ]) {
    const stats = await page.evaluate(
      ([y, e]) => window.renderAvatar(y, e),
      [yaw, expression],
    );
    assert.ok(stats.closedEyeHidden);
    assert.ok(stats.triangles < 60000);
    renderStats[name] = stats;
    await page.screenshot({ path: new URL(`${name}.png`, output).pathname });
  }
  passed(
    "Front / 45° / profile / blink / laugh / pucker / sad / wink rendered under 60k triangles",
  );
  assert.deepEqual(errors, []);
  const result = {
    date: new Date().toISOString(),
    browser: await browser.version(),
    checks,
    renderStats,
    errors,
    limitations: [
      "Synthetic camera only; no real FaceLandmarker inference or human tracking verified.",
      "Chromium/SwiftShader is not an iPhone performance benchmark.",
      "Safari recording, audio/share and thermal behavior require physical devices.",
    ],
  };
  await fs.writeFile(
    new URL("results.json", output),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(
    await page
      .locator("body")
      .innerText()
      .catch(() => "No page"),
  );
  console.error(
    await page.evaluate(() => window.qaRecorderEvents).catch(() => []),
  );
  console.error(errors);
  throw error;
} finally {
  await browser.close();
  await server.close();
}
