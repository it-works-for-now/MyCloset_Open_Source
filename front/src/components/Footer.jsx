import React from "react";

function Footer({ compact }) {
  return (
    <footer className={`footer ${compact ? "footer-login" : ""}`}>
      © 2026 MyCloset. All rights reserved.
    </footer>
  );
}

export default Footer;
