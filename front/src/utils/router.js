export function getPathname() {
  return window.location.pathname || "/";
}

export function navigateTo(currentPath, nextPath, setPath) {
  if (currentPath !== nextPath) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }
}
