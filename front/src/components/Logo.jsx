import React from "react";

function Logo({ onClick }) {
  return (
    <button className="logo" type="button" aria-label="MyCloset 홈" onClick={onClick}>
      MY<span className="logo-box">CLOSET</span>
    </button>
  );
}

export default Logo;
