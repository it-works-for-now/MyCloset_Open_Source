import React from "react";

function ComingSoonPage({ title }) {
  return (
    <main className="main">
      <section className="hero" aria-labelledby="page-title">
        <h1 id="page-title">{title}</h1>
        <p>해당 페이지는 준비 중입니다.</p>
      </section>
    </main>
  );
}

export default ComingSoonPage;
