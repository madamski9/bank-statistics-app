const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');
const progress = document.querySelector('.scroll-progress');
const tiltTarget = document.querySelector('[data-tilt]');
const art = document.querySelector('.phone-stage');
const activeAnimations = new Set();
let revealObserver;
let ticking = false;

function animate(element, frames, options = {}) {
  if (!element || reducedMotion.matches || !element.animate) return;
  const animation = element.animate(frames, { duration: 750, easing: 'cubic-bezier(.2,.7,.2,1)', ...options });
  activeAnimations.add(animation);
  animation.finished.then(() => activeAnimations.delete(animation), () => activeAnimations.delete(animation));
}

function reveal(element) {
  animate(element, [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }]);
  const words = element.querySelectorAll('.reveal-word');
  words.forEach((word, index) => animate(word, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { delay: index * 60, fill: 'backwards' }));
  element.querySelectorAll('.glyph-chart i').forEach((bar, index) => animate(bar, [{ transform: 'scaleY(.1)' }, { transform: 'scaleY(1)' }], { delay: index * 70, fill: 'backwards' }));
}

function setRevealMotion() {
  revealObserver?.disconnect();
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: .15 });
  document.querySelectorAll('[data-reveal]').forEach(element => revealObserver.observe(element));
}

function updateScrollProgress() {
  if (progress) {
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${maximum > 0 ? Math.min(1, Math.max(0, window.scrollY / maximum)) : 1})`;
  }
  ticking = false;
}

function requestProgressUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateScrollProgress);
}

function updateTilt(event) {
  if (!tiltTarget || !art || reducedMotion.matches || !finePointer.matches) return;
  const bounds = art.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - .5;
  const y = (event.clientY - bounds.top) / bounds.height - .5;
  tiltTarget.style.setProperty('--tilt-x', `${(-y * 4).toFixed(2)}deg`);
  tiltTarget.style.setProperty('--tilt-y', `${(x * 5).toFixed(2)}deg`);
}

function resetTilt() {
  tiltTarget?.style.setProperty('--tilt-x', '0deg');
  tiltTarget?.style.setProperty('--tilt-y', '0deg');
}

for (const heading of document.querySelectorAll('[data-text-reveal]')) {
  const text = heading.textContent.trim();
  heading.setAttribute('aria-label', text);
  heading.replaceChildren();
  text.split(/\s+/).forEach((word, index) => {
    if (index) heading.append(' ');
    const span = document.createElement('span');
    span.className = 'reveal-word';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = word;
    heading.append(span);
  });
}

const gallery = document.querySelector('.screenshots-track');
const galleryControls = document.querySelectorAll('[data-gallery-direction]');
const screenshotDialog = document.querySelector('.screenshot-dialog');

function updateGalleryControls() {
  if (!gallery) return;
  const maximum = gallery.scrollWidth - gallery.clientWidth;
  galleryControls.forEach(button => {
    button.disabled = Number(button.dataset.galleryDirection) < 0 ? gallery.scrollLeft <= 2 : gallery.scrollLeft >= maximum - 2;
  });
}

for (const button of galleryControls) {
  button.addEventListener('click', () => {
    const card = gallery.querySelector('.screenshot-card');
    const gap = parseFloat(getComputedStyle(gallery).columnGap);
    gallery.scrollBy({ left: Number(button.dataset.galleryDirection) * (card.getBoundingClientRect().width + gap), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
}

for (const link of document.querySelectorAll('[data-screenshot]')) {
  link.addEventListener('click', event => {
    if (!screenshotDialog?.showModal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const fullImage = screenshotDialog.querySelector('.screenshot-full');
    fullImage.src = link.href;
    fullImage.alt = link.querySelector('img').alt;
    screenshotDialog.querySelector('h2').textContent = link.dataset.title;
    screenshotDialog.showModal();
    animate(fullImage, [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260 });
  });
}

screenshotDialog?.querySelector('.dialog-close').addEventListener('click', () => screenshotDialog.close());
screenshotDialog?.addEventListener('click', event => {
  const bounds = screenshotDialog.getBoundingClientRect();
  if (event.target === screenshotDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) screenshotDialog.close();
});
gallery?.addEventListener('scroll', updateGalleryControls, { passive: true });
window.addEventListener('resize', updateGalleryControls, { passive: true });
updateGalleryControls();

window.addEventListener('scroll', requestProgressUpdate, { passive: true });
window.addEventListener('resize', requestProgressUpdate, { passive: true });
art?.addEventListener('pointermove', updateTilt, { passive: true });
art?.addEventListener('pointerleave', resetTilt);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    activeAnimations.forEach(animation => animation.cancel());
  }
  setRevealMotion();
  resetTilt();
});

document.querySelectorAll('.title-line').forEach((line, index) => animate(line, [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 900, delay: index * 140, fill: 'backwards' }));
requestProgressUpdate();
setRevealMotion();
