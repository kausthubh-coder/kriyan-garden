// Executed inside the browser. Return styling and geometry only, never content.
export function measureRenderedAccount() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable.");
  function rgba(css: string) {
    if (!context) throw new Error("Canvas unavailable.");
    context.clearRect(0, 0, 1, 1); context.fillStyle = css; context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data].map((n, i) => i === 3 ? n / 255 : n);
  }
  function over(fg: number[], bg: number[]) { return fg.slice(0, 3).map((n, i) => n * fg[3] + bg[i] * (1 - fg[3])); }
  function luminance(color: number[]) { return color.map((n) => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((total, c, i) => total + c * [.2126, .7152, .0722][i], 0); }
  const nodes = [...document.querySelectorAll<HTMLElement>(".cl-userProfile-root *, .cl-modalContent *")].filter((item) => item.getBoundingClientRect().width > 0 && getComputedStyle(item).visibility !== "hidden");
  const textStyles = nodes.filter((item) => [...item.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())).map((item) => {
    let element: HTMLElement | null = item; const chain: HTMLElement[] = [];
    while (element) { chain.unshift(element); element = element.parentElement; }
    let surface = [0, 0, 0];
    for (const parent of chain) surface = over(rgba(getComputedStyle(parent).backgroundColor), surface);
    const fg = rgba(getComputedStyle(item).color);
    fg[3] *= chain.reduce((opacity, parent) => opacity * Number(getComputedStyle(parent).opacity), 1);
    const a = luminance(over(fg, surface)), b = luminance(surface);
    return { selector: [...item.classList].filter((name) => name.startsWith("cl-") && !name.startsWith("cl-internal-")).join(" "), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  });
  const controls = nodes.filter((item) => item.matches("button, a, input") && !item.matches(":disabled")).map((item) => {
    item.focus(); const style = getComputedStyle(item); const rect = item.getBoundingClientRect();
    return { width: rect.width, height: rect.height, focused: document.activeElement === item, ring: style.outlineStyle, transition: style.transitionDuration, animation: style.animationName };
  });
  return { width: innerWidth, textStyles, controls, overflow: document.documentElement.scrollWidth > innerWidth };
}
