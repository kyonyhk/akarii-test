/**
 * Scroll utilities for smooth synchronized scrolling between components
 */

export interface ScrollPosition {
  top: number
  left: number
}

export interface ScrollSyncOptions {
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
  inline?: ScrollLogicalPosition
  offset?: number
}

/**
 * Gets the current scroll position of an element
 */
export function getScrollPosition(element: HTMLElement | null): ScrollPosition {
  if (!element) return { top: 0, left: 0 }

  return {
    top: element.scrollTop,
    left: element.scrollLeft,
  }
}

/**
 * Smoothly scrolls an element to a specific position
 */
export function scrollToPosition(
  element: HTMLElement | null,
  position: ScrollPosition,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (!element) return

  element.scrollTo({
    top: position.top,
    left: position.left,
    behavior,
  })
}

/**
 * Scrolls an element to make a target element visible
 */
export function scrollToElement(
  container: HTMLElement | null,
  target: HTMLElement | null,
  options: ScrollSyncOptions = {}
): void {
  if (!container || !target) return

  const {
    behavior = 'smooth',
    block = 'center',
    inline = 'nearest',
    offset = 0,
  } = options

  target.scrollIntoView({
    behavior,
    block,
    inline,
  })

  // Apply additional offset if specified
  if (offset !== 0) {
    setTimeout(() => {
      const currentTop = container.scrollTop
      container.scrollTo({
        top: currentTop + offset,
        behavior: 'smooth',
      })
    }, 50)
  }
}

/**
 * Finds the element that is currently most visible in a scroll container
 */
export function findMostVisibleElement(
  container: HTMLElement,
  selector: string
): HTMLElement | null {
  const elements = container.querySelectorAll(selector)
  if (elements.length === 0) return null

  const containerRect = container.getBoundingClientRect()
  const containerCenter = containerRect.top + containerRect.height / 2

  let mostVisible: HTMLElement | null = null
  let smallestDistance = Infinity

  elements.forEach(element => {
    const elementRect = element.getBoundingClientRect()
    const elementCenter = elementRect.top + elementRect.height / 2
    const distance = Math.abs(containerCenter - elementCenter)

    // Only consider elements that are at least partially visible
    const isVisible =
      elementRect.bottom > containerRect.top &&
      elementRect.top < containerRect.bottom

    if (isVisible && distance < smallestDistance) {
      smallestDistance = distance
      mostVisible = element as HTMLElement
    }
  })

  return mostVisible
}

/**
 * Calculates the scroll percentage of an element
 */
export function getScrollPercentage(element: HTMLElement | null): number {
  if (!element) return 0

  const { scrollTop, scrollHeight, clientHeight } = element
  const maxScroll = scrollHeight - clientHeight

  if (maxScroll <= 0) return 0

  return Math.min(Math.max(scrollTop / maxScroll, 0), 1)
}

/**
 * Sets the scroll position based on a percentage
 */
export function setScrollPercentage(
  element: HTMLElement | null,
  percentage: number,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (!element) return

  const { scrollHeight, clientHeight } = element
  const maxScroll = scrollHeight - clientHeight
  const targetScroll = Math.min(Math.max(percentage * maxScroll, 0), maxScroll)

  element.scrollTo({
    top: targetScroll,
    behavior,
  })
}

/**
 * Debounces a scroll event handler
 */
export function debounceScrollHandler(
  handler: (event: Event) => void,
  delay: number = 100
): (event: Event) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (event: Event) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      handler(event)
      timeoutId = null
    }, delay)
  }
}

/**
 * Throttles a scroll event handler
 */
export function throttleScrollHandler(
  handler: (event: Event) => void,
  delay: number = 16 // ~60fps
): (event: Event) => void {
  let lastCall = 0

  return (event: Event) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      handler(event)
      lastCall = now
    }
  }
}

/**
 * Maps scroll position from one element to another proportionally
 */
export function mapScrollPosition(
  sourceElement: HTMLElement,
  targetElement: HTMLElement,
  behavior: ScrollBehavior = 'smooth'
): void {
  const sourcePercentage = getScrollPercentage(sourceElement)
  setScrollPercentage(targetElement, sourcePercentage, behavior)
}

/**
 * Checks if an element is currently in view within its container
 */
export function isElementInView(
  element: HTMLElement,
  container: HTMLElement,
  threshold: number = 0.5
): boolean {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  const elementArea = elementRect.width * elementRect.height
  const visibleArea = Math.max(
    0,
    (Math.min(elementRect.right, containerRect.right) -
      Math.max(elementRect.left, containerRect.left)) *
      (Math.min(elementRect.bottom, containerRect.bottom) -
        Math.max(elementRect.top, containerRect.top))
  )

  return visibleArea / elementArea >= threshold
}
