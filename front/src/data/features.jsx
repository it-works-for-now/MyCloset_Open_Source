import React from "react";
import { HangerIcon, PeopleIcon, SparkleIcon } from "../components/icons.jsx";

export const features = [
  {
    title: "나의 옷장",
    copy: ["옷을 등록하고 카테고리별로", "간편하게 관리해보세요."],
    icon: <HangerIcon />,
  },
  {
    title: "AI 코디 추천",
    copy: ["등록한 옷을 바탕으로", "AI가 스타일을 추천해드려요."],
    icon: <SparkleIcon />,
  },
  {
    title: "스타일 공유",
    copy: ["핏로그에서 다른 사람들과", "코디를 공유하고 코멘트를 남겨요."],
    icon: <PeopleIcon />,
  },
];
