import React from "react";

let openModalCount = 0;
let originalBodyOverflow = "";

function Modal({ isOpen, titleId, onClose, onConfirm, children, className = "" }) {
  const [isRendered, setIsRendered] = React.useState(isOpen);
  const [isClosing, setIsClosing] = React.useState(false);
  const [renderedChildren, setRenderedChildren] = React.useState(children);
  const dialogRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  const onConfirmRef = React.useRef(onConfirm);

  React.useEffect(() => {
    onCloseRef.current = onClose;
    onConfirmRef.current = onConfirm;
  }, [onClose, onConfirm]);

  React.useEffect(() => {
    if (isOpen) setRenderedChildren(children);
  }, [children, isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      return undefined;
    }

    if (!isRendered) return undefined;

    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isOpen, isRendered]);

  React.useEffect(() => {
    if (!isRendered || isClosing) return undefined;

    const previousFocus = document.activeElement;

    if (openModalCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openModalCount += 1;

    const autofocusTarget = dialogRef.current?.querySelector("[data-autofocus]");
    const fallbackTarget = dialogRef.current?.querySelector(
      "button, input:not([tabindex='-1']), textarea, select"
    );

    (autofocusTarget || fallbackTarget)?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (
        event.key === "Enter" &&
        !event.shiftKey &&
        event.target.tagName !== "TEXTAREA" &&
        event.target.tagName !== "BUTTON"
      ) {
        event.preventDefault();
        onConfirmRef.current?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        originalBodyOverflow = "";
      }
      previousFocus?.focus?.();
    };
  }, [isClosing, isRendered]);

  if (!isRendered) return null;

  return (
    <div
      className={`modal-backdrop${isClosing ? " is-closing" : ""}`}
      role="presentation"
      onMouseDown={(event) => !isClosing && event.target === event.currentTarget && onCloseRef.current()}
    >
      <section
        ref={dialogRef}
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal={!isClosing}
        aria-hidden={isClosing}
        aria-labelledby={titleId}
      >
        {isOpen ? children : renderedChildren}
      </section>
    </div>
  );
}

export default Modal;
