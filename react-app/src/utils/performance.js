export function formatMilliseconds(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(2)} ms`;
}

export function countDOMNodes(element) {
  if (!element) {
    return 0;
  }

  return element.querySelectorAll("*").length;
}