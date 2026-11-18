import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const statusBarHeight = 150;
const bodyWidth = 2.55;
const bodyHeight = 5.47;
const screenWidth = 2.49;
const screenHeight = (screenWidth * 2556) / 1179;

export function neonLine({ width, height, baseline, gridTop, gridCount, gridStep }) {
  const points = [];
  let seed = 7;
  for (let x = -200; x <= width + 200; x += 220) {
    seed = (seed * 9301 + 49297) % 233280;
    const noise = seed / 233280;
    const spike = noise > 0.78 ? 380 : noise > 0.55 ? 200 : 60;
    points.push([x, baseline - spike * (0.6 + noise * 0.6)]);
  }
  let line = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[Math.max(index - 1, 0)];
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    const [x3, y3] = points[Math.min(index + 2, points.length - 1)];
    line += ` C ${x1 + (x2 - x0) / 6} ${y1 + (y2 - y0) / 6}, ${x2 - (x3 - x1) / 6} ${y2 - (y3 - y1) / 6}, ${x2} ${y2}`;
  }
  const grid = Array.from({ length: gridCount }, (_, index) => gridTop + index * gridStep)
    .map((y) => `<line x1="0" x2="${width}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="2"/>`)
    .join('');
  return `<svg class="chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ff4d57" stop-opacity="0.32"/>
        <stop offset="1" stop-color="#ff4d57" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ff8a65"/>
        <stop offset="0.5" stop-color="#ff4d57"/>
        <stop offset="1" stop-color="#ff8a65"/>
      </linearGradient>
      <filter id="neon" x="-10%" y="-60%" width="120%" height="220%">
        <feGaussianBlur stdDeviation="40"/>
      </filter>
      <filter id="glow" x="-5%" y="-50%" width="110%" height="200%">
        <feGaussianBlur stdDeviation="18" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    ${grid}
    <path d="${line} L ${width + 200} ${height} L -200 ${height} Z" fill="url(#area)"/>
    <path d="${line}" fill="none" stroke="#ff4d57" stroke-width="34" stroke-linecap="round" opacity="0.35" filter="url(#neon)"/>
    <path d="${line}" fill="none" stroke="url(#stroke)" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>
    <path d="${line}" fill="none" stroke="#ffd9d6" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`;
}

function roundedRectangle(width, height, radius) {
  const shape = new Shape();
  const left = -width / 2;
  const bottom = -height / 2;
  shape.moveTo(left + radius, bottom);
  shape.lineTo(left + width - radius, bottom);
  shape.quadraticCurveTo(left + width, bottom, left + width, bottom + radius);
  shape.lineTo(left + width, bottom + height - radius);
  shape.quadraticCurveTo(left + width, bottom + height, left + width - radius, bottom + height);
  shape.lineTo(left + radius, bottom + height);
  shape.quadraticCurveTo(left, bottom + height, left, bottom + height - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  return shape;
}

function mappedShapeGeometry(width, height, radius) {
  const geometry = new ShapeGeometry(roundedRectangle(width, height, radius), 24);
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  for (let index = 0; index < positions.count; index += 1) {
    uvs.setXY(index, positions.getX(index) / width + 0.5, positions.getY(index) / height + 0.5);
  }
  uvs.needsUpdate = true;
  return geometry;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function drawStatusBar(context) {
  context.fillStyle = '#fff';
  context.font = '600 52px -apple-system, "SF Pro Text", system-ui';
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText('9:41', 215, 108);
  [[820, 30, 14], [841, 21, 23], [862, 11, 33], [883, 0, 44]].forEach(([x, offset, height]) => {
    context.beginPath();
    context.roundRect(x, 66 + offset, 13, height, 3);
    context.fill();
  });
  context.save();
  context.translate(922, 66);
  context.scale(64 / 24, 46 / 17);
  context.fill(new Path2D('M12 3.2c3.3 0 6.3 1.3 8.5 3.4l1.6-1.7C19.5 2.4 15.9.9 12 .9S4.5 2.4 1.9 4.9l1.6 1.7C5.7 4.5 8.7 3.2 12 3.2z'));
  context.fill(new Path2D('M12 7.9c2 0 3.8.8 5.2 2l1.6-1.7C17 6.6 14.6 5.6 12 5.6S7 6.6 5.2 8.2l1.6 1.7c1.4-1.2 3.2-2 5.2-2z'));
  context.fill(new Path2D('M12 12.4c.8 0 1.6.3 2.2.8L12 15.6l-2.2-2.4c.6-.5 1.4-.8 2.2-.8z'));
  context.restore();
  context.strokeStyle = 'rgba(255,255,255,0.45)';
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(1008, 68, 82, 42, 13);
  context.stroke();
  context.beginPath();
  context.roundRect(1015, 75, 68, 28, 8);
  context.fill();
  context.fillStyle = 'rgba(255,255,255,0.45)';
  context.beginPath();
  context.moveTo(1095, 82);
  context.lineTo(1095, 96);
  context.quadraticCurveTo(1101, 89, 1095, 82);
  context.fill();
}

function screenCanvas(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, statusBarHeight + 10, image.width, 1, 0, 0, image.width, statusBarHeight + 10);
  context.drawImage(
    image,
    0,
    statusBarHeight,
    image.width,
    image.height - statusBarHeight,
    0,
    statusBarHeight,
    image.width,
    image.height - statusBarHeight,
  );
  drawStatusBar(context);
  return canvas;
}

function createMaterials() {
  return {
    titanium: new MeshPhysicalMaterial({ color: 0x6e6e74, metalness: 1, roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.12 }),
    rim: new MeshPhysicalMaterial({ color: 0xb4b4ba, metalness: 1, roughness: 0.18, clearcoat: 1 }),
    glass: new MeshStandardMaterial({ color: 0x030303, metalness: 0.2, roughness: 0.3 }),
    antenna: new MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.8 }),
    island: new MeshBasicMaterial({ color: 0x000000 }),
  };
}

function createPhone(texture, materials) {
  const device = new Group();
  const body = new Mesh(
    new ExtrudeGeometry(roundedRectangle(bodyWidth, bodyHeight, 0.4), {
      depth: 0.17,
      bevelEnabled: true,
      bevelSize: 0.016,
      bevelThickness: 0.016,
      bevelSegments: 6,
      curveSegments: 24,
    }),
    materials.titanium,
  );
  device.add(body);
  const rim = new Mesh(
    new ExtrudeGeometry(roundedRectangle(bodyWidth, bodyHeight, 0.4), {
      depth: 0.014,
      bevelEnabled: true,
      bevelSize: 0.006,
      bevelThickness: 0.006,
      bevelSegments: 4,
      curveSegments: 24,
    }),
    materials.rim,
  );
  rim.position.z = 0.19;
  device.add(rim);
  const glass = new Mesh(
    new ExtrudeGeometry(roundedRectangle(bodyWidth - 0.03, bodyHeight - 0.03, 0.385), { depth: 0.006, bevelEnabled: false, curveSegments: 24 }),
    materials.glass,
  );
  glass.position.z = 0.214;
  device.add(glass);
  const screen = new Mesh(mappedShapeGeometry(screenWidth, screenHeight, 0.37), new MeshBasicMaterial({ map: texture, toneMapped: false }));
  screen.position.z = 0.24;
  device.add(screen);
  const islandHeight = (111 / 1179) * screenWidth;
  const islandWidth = (378 / 1179) * screenWidth;
  const island = new Mesh(new ShapeGeometry(roundedRectangle(islandWidth, islandHeight, islandHeight / 2), 16), materials.island);
  island.position.set(0, screenHeight / 2 - (33 / 1179) * screenWidth - islandHeight / 2, 0.255);
  device.add(island);
  const buttonGeometry = new BoxGeometry(0.05, 0.42, 0.09);
  for (const [side, height, length] of [[-1, 1.42, 0.2], [-1, 0.86, 0.42], [-1, 0.32, 0.42], [1, 0.62, 0.62]]) {
    const button = new Mesh(buttonGeometry, materials.titanium);
    button.scale.y = length / 0.42;
    button.position.set(side * (bodyWidth / 2 + 0.012), height, 0.09);
    device.add(button);
  }
  const antennaGeometry = new BoxGeometry(0.014, 0.04, 0.17);
  for (const side of [-1, 1]) {
    for (const height of [-1.9, 1.9]) {
      const antenna = new Mesh(antennaGeometry, materials.antenna);
      antenna.position.set(side * (bodyWidth / 2 + 0.002), height, 0.09);
      device.add(antenna);
    }
  }
  return device;
}

export async function renderPhones({ canvas, viewWidth, viewHeight, fullWidth, fullHeight, offsetX, phones }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(viewWidth, viewHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  scene.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new AmbientLight(0xffffff, 0.5));
  const key = new DirectionalLight(0xffffff, 3);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const fill = new DirectionalLight(0xc8cbdd, 1.2);
  fill.position.set(4, -2, 3);
  scene.add(fill);

  const fieldOfView = 14;
  const distance = fullHeight / 2 / Math.tan(((fieldOfView / 2) * Math.PI) / 180);
  const camera = new PerspectiveCamera(fieldOfView, fullWidth / fullHeight, distance - 3000, distance + 3000);
  camera.position.set(fullWidth / 2, -fullHeight / 2, distance);
  camera.setViewOffset(fullWidth, fullHeight, offsetX, 0, viewWidth, viewHeight);

  const materials = createMaterials();
  const images = await Promise.all(phones.map((phone) => loadImage(`/website/screenshots/${phone.image}`)));
  phones.forEach((phone, index) => {
    const texture = new CanvasTexture(screenCanvas(images[index]));
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const device = createPhone(texture, materials);
    device.scale.setScalar(phone.height / bodyHeight);
    device.position.set(phone.x, -phone.y, 0);
    device.rotation.set(phone.rotation.x, phone.rotation.y, phone.rotation.z);
    scene.add(device);
    const red = new PointLight(0xff2038, 6, 2600, 1.2);
    red.position.set(phone.x + 900, -phone.y + 200, 900);
    scene.add(red);
  });

  renderer.render(scene, camera);
}
