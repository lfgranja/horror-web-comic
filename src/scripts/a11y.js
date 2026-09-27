export class AccessibilityController {
  constructor(root = document) {
    this.region = root.querySelector('#frame-description');
    this.timer = 0;
  }

  announce(description) {
    if (!this.region) return;
    clearTimeout(this.timer);
    this.timer = globalThis.setTimeout(() => {
      this.region.textContent = description;
    }, 500);
  }

  clear() {
    clearTimeout(this.timer);
  }
}
