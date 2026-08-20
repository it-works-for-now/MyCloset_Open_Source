import React from "react";
import topButtonImage from "../../img/top-black-button.png";

function ScrollTopButton({ className = "" }) {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      className={`scroll-top-button ${className}`.trim()}
      aria-label="페이지 상단으로 이동"
      onClick={scrollToTop}
    >
      <img src={topButtonImage} alt="" />
    </button>
  );
}

export default ScrollTopButton;
