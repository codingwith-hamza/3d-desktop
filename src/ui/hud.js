export function showHint(text, duration = 4500) {
  const hint = document.getElementById('hint');
  hint.textContent = text;
  hint.hidden = false;
  requestAnimationFrame(() => hint.classList.add('visible'));
  setTimeout(() => hint.classList.remove('visible'), duration);
}

export function showToast(text, duration = 3500) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => toast.classList.remove('visible'), duration);
}
