import { AmbientLight, BoxGeometry, DirectionalLight, ExtrudeGeometry, Group, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, PMREMGenerator, PointLight, RoomEnvironment, Scene, Shape, Vector2, WebGLRenderer } from './vendor/three.js';

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

export function createPhoneScene(stage) {
  const screen = stage.querySelector('.phone-screen');
  const fallbackFrame = stage.querySelector('.phone-frame');
  const originalScreenStyle = screen.getAttribute('style');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerType = window.matchMedia('(pointer: fine)');
  let renderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return;
  }
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, .1, 30);
  camera.position.z = 10;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  const interfaceLayer = document.createElement('div');
  interfaceLayer.className = 'phone-interface';
  const viewportMatrix = new Matrix4();
  const projectionMatrix = new Matrix4();
  const cssMatrix = new Matrix4();
  const pixelMatrix = new Matrix4().set(1, 0, 0, -140, 0, -1, 0, 303.51, 0, 0, 1, 0, 0, 0, 0, 1);
  const graphics = document.createElement('div');
  graphics.className = 'phone-graphics';
  graphics.setAttribute('aria-hidden', 'true');
  graphics.append(renderer.domElement);
  function createEnvironment() {
    const generator = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const result = generator.fromScene(room, .04);
    room.dispose();
    generator.dispose();
    return result;
  }
  let environment = createEnvironment();
  scene.environment = environment.texture;
  const device = new Group();
  const metal = new MeshPhysicalMaterial({ color: 0x242426, metalness: 1, roughness: .28, clearcoat: .7, clearcoatRoughness: .15 });
  const rimMaterial = new MeshPhysicalMaterial({ color: 0x39393d, metalness: 1, roughness: .3, clearcoat: 1 });
  const black = new MeshStandardMaterial({ color: 0x050505, metalness: .15, roughness: .45 });
  const antennaMaterial = new MeshStandardMaterial({ color: 0x101012, roughness: .8 });
  const bodyGeometry = new ExtrudeGeometry(roundedRectangle(2.55, 5.47, .38), { depth: .17, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 4, steps: 1, curveSegments: 16 });
  const body = new Mesh(bodyGeometry, metal);
  device.add(body);
  const rimGeometry = new ExtrudeGeometry(roundedRectangle(2.55, 5.47, .38), { depth: .012, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 3, steps: 1, curveSegments: 16 });
  const rim = new Mesh(rimGeometry, rimMaterial);
  rim.position.z = .19;
  device.add(rim);
  const glassGeometry = new ExtrudeGeometry(roundedRectangle(2.522, 5.434, .35), { depth: .006, bevelEnabled: false, curveSegments: 16 });
  const glass = new Mesh(glassGeometry, black);
  glass.position.z = .214;
  device.add(glass);
  const buttonGeometry = new BoxGeometry(.045, .4, .09);
  for (const [side, height] of [[-1, .8], [-1, .28], [1, .55]]) {
    const button = new Mesh(buttonGeometry, metal);
    button.position.set(side * 1.3, height, .08);
    device.add(button);
  }
  const antennaGeometry = new BoxGeometry(.012, .035, .16);
  for (const side of [-1, 1]) {
    for (const height of [-1.8, 1.8]) {
      const antenna = new Mesh(antennaGeometry, antennaMaterial);
      antenna.position.set(side * 1.289, height, .08);
      device.add(antenna);
    }
  }
  const display = new Group();
  display.scale.setScalar(2.49 / 280);
  display.position.z = .226;
  device.add(display);
  scene.add(device);
  scene.add(new AmbientLight(0xffffff, .6));
  const key = new DirectionalLight(0xffffff, 3);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const red = new PointLight(0xff2038, 22, 12, 2);
  red.position.set(3, 1, 2);
  scene.add(red);
  const fill = new DirectionalLight(0xb8bbcd, 1);
  fill.position.set(-4, -2, 2);
  scene.add(fill);
  const pointer = new Vector2();
  const baseRotation = { x: .025, y: -.18, z: -.025 };
  device.rotation.set(baseRotation.x, baseRotation.y, baseRotation.z);
  let visible = true;
  let lost = false;
  let disposed = false;
  let running = false;

  function render() {
    if (disposed || lost) return;
    renderer.render(scene, camera);
    projectionMatrix.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(display.matrixWorld).multiply(pixelMatrix);
    cssMatrix.multiplyMatrices(viewportMatrix, projectionMatrix);
    const values = cssMatrix.elements;
    const divisor = values[15];
    const transform = [values[0] / divisor, values[1] / divisor, 0, values[3] / divisor, values[4] / divisor, values[5] / divisor, 0, values[7] / divisor, 0, 0, 1, 0, values[12] / divisor, values[13] / divisor, 0, 1];
    screen.style.transform = `matrix3d(${transform.join(',')})`;
  }

  let stopRequested = false;

  function stop() {
    running = false;
    if (stopRequested) return;
    stopRequested = true;
    queueMicrotask(() => {
      renderer.setAnimationLoop(null);
      stopRequested = false;
    });
  }

  function tick() {
    if (!visible || document.hidden || lost || disposed) {
      stop();
      return;
    }
    const targetX = baseRotation.x + (motion.matches ? 0 : pointer.y * .1);
    const targetY = baseRotation.y + (motion.matches ? 0 : pointer.x * .16);
    device.rotation.x += (targetX - device.rotation.x) * .13;
    device.rotation.y += (targetY - device.rotation.y) * .13;
    render();
    if (Math.abs(targetX - device.rotation.x) + Math.abs(targetY - device.rotation.y) < .0001) stop();
  }

  function requestRender() {
    if (disposed || lost || !visible || document.hidden) return;
    if (motion.matches) {
      device.rotation.set(baseRotation.x, baseRotation.y, baseRotation.z);
      render();
      return;
    }
    if (!running) {
      running = true;
      renderer.setAnimationLoop(tick);
    }
  }

  function resize() {
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height || disposed) return;
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    renderer.setSize(bounds.width, bounds.height, false);
    viewportMatrix.set(bounds.width / 2, 0, 0, bounds.width / 2, 0, -bounds.height / 2, 0, bounds.height / 2, 0, 0, 0, 0, 0, 0, 0, 1);
    render();
  }

  function onPointerMove(event) {
    if (motion.matches || !pointerType.matches || event.target.closest('button')) return;
    const bounds = stage.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width - .5, (event.clientY - bounds.top) / bounds.height - .5);
    requestRender();
  }

  function resetPointer() {
    pointer.set(0, 0);
    requestRender();
  }

  function onVisibilityChange() {
    if (document.hidden) stop();
    else requestRender();
  }

  function restoreFallback() {
    stage.classList.remove('is-3d');
    fallbackFrame.append(screen);
    if (originalScreenStyle === null) screen.removeAttribute('style');
    else screen.setAttribute('style', originalScreenStyle);
  }

  function onContextLost(event) {
    event.preventDefault();
    lost = true;
    stop();
    restoreFallback();
  }

  function onContextRestored() {
    lost = false;
    environment.dispose();
    environment = createEnvironment();
    scene.environment = environment.texture;
    mountInterface();
    resize();
    requestRender();
  }

  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) requestRender();
    else stop();
  });
  const resizeObserver = new ResizeObserver(resize);
  function mountInterface() {
    interfaceLayer.append(screen);
    Object.assign(screen.style, { position: 'absolute', top: '0', left: '0', transformOrigin: '0 0' });
    stage.classList.add('is-3d');
  }

  stage.append(graphics, interfaceLayer);
  mountInterface();
  resize();
  intersectionObserver.observe(stage);
  resizeObserver.observe(stage);
  stage.addEventListener('pointermove', onPointerMove, { passive: true });
  stage.addEventListener('pointerleave', resetPointer);
  motion.addEventListener('change', resetPointer);
  document.addEventListener('visibilitychange', onVisibilityChange);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

  function dispose(event) {
    if (event.persisted) return;
    disposed = true;
    stop();
    intersectionObserver.disconnect();
    resizeObserver.disconnect();
    stage.removeEventListener('pointermove', onPointerMove);
    stage.removeEventListener('pointerleave', resetPointer);
    motion.removeEventListener('change', resetPointer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    const geometries = new Set();
    const materials = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    environment.dispose();
    renderer.dispose();
    restoreFallback();
    graphics.remove();
    interfaceLayer.remove();
    window.removeEventListener('pagehide', dispose);
  }

  window.addEventListener('pagehide', dispose);
}
