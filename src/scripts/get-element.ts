export function getElement<TElement extends HTMLElement>(
  elementId: string
): TElement {
  const element = document.getElementById(elementId) as TElement;

  if (!element) {
    throw new Error(`Failed to find element with id="${elementId}"`);
  }

  return element;
}
