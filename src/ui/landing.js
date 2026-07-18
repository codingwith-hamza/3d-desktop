export function initLanding(onEnter) {
  const landing = document.getElementById('landing');
  const btn = document.getElementById('enter-btn');

  btn.addEventListener(
    'click',
    () => {
      landing.classList.add('leaving');
      landing.addEventListener('transitionend', () => landing.remove(), { once: true });
      onEnter();
    },
    { once: true }
  );
}
