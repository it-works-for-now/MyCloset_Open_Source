import React from "react";
import "./HomePage.css";
import { features } from "../data/features.jsx";
import closetImage from "../../img/closet-img.png";
import dailyLookImage from "../../img/daily-look-img.png";
import fitLogImage from "../../img/fit-log-img.png";

const detailSections = [
  {
    title: "나의 옷장으로 옷 관리하기",
    copy: "나의 옷장에 옷을 업로드하고 옷장을 만들고 검색과 필터를 통해 옷을 쉽게 찾아볼 수 있습니다. 옷장 속에 있어, 있는지 없는지 몰랐던 옷들도 나의 옷장에서 쉽게 관리해보세요.",
    image: closetImage,
    alt: "옷과 소품이 정리된 옷장",
  },
  {
    title: "AI가 추천해주는 데일리룩",
    copy: "내가 가지고 있는 옷으로 코디를 추천해주는 AI. 데일리룩 추천에서 원하는 상황과 룩의 특징을 입력하면 AI로부터 데일리룩을 추천받을 수 있습니다.",
    image: dailyLookImage,
    alt: "AI 데일리룩 추천 일러스트",
    reverse: true,
  },
  {
    title: "핏로그로 친구와 코디 공유",
    copy: "그룹을 만들고 초대 링크를 보내 친구들과 코디를 공유해 보세요. 올라오는 코디를 보고 코멘트를 남기고 서로의 스타일을 나눠 보세요.",
    image: fitLogImage,
    alt: "친구와 코디를 공유하는 핏로그 일러스트",
  },
];

function FeatureCard({ feature }) {
  return (
    <article className="feature-card">
      <div className="icon-wrap">{feature.icon}</div>
      <h2>{feature.title}</h2>
      <p>
        {feature.copy.map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
    </article>
  );
}

function DetailSection({ section }) {
  const image = (
    <div className="detail-image-wrap" key="image">
      <img className="detail-image" src={section.image} alt={section.alt} />
    </div>
  );

  const content = (
    <div className="detail-copy" key="content">
      <h2>{section.title}</h2>
      <p>{section.copy}</p>
    </div>
  );

  return (
    <section
      className={`detail-section ${section.reverse ? "detail-section-reverse" : ""}`}
      aria-label={section.title}
    >
      {section.reverse ? [content, image] : [image, content]}
    </section>
  );
}

function HomePage({ user, onStart }) {
  return (
    <main className="main">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">{user ? `${user.nickname}님의 MyCloset` : "AI가 추천해주는 나만의 스타일"}</h1>
        <p>
          {user
            ? "오늘 입을 옷과 어울리는 스타일을 MyCloset에서 준비해보세요."
            : "옷을 등록하고, AI 코디 추천을 받고, 다른 사람들과 스타일을 공유하세요."}
        </p>
        <button className="primary-button" type="button" onClick={onStart}>
          {user ? "시작하기" : "로그인하기"}
        </button>
      </section>
      <section className="feature-grid" aria-label="주요 기능">
        {features.map((feature) => (
          <FeatureCard feature={feature} key={feature.title} />
        ))}
      </section>
      <div className="detail-sections">
        {detailSections.map((section) => (
          <DetailSection section={section} key={section.title} />
        ))}
      </div>
    </main>
  );
}

export default HomePage;
