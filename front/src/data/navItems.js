export const navItems = [
  { label: "나의 옷장", path: "/closet" },
  { label: "코디하기", path: "/styling" },
  { label: "데일리룩 추천", path: "/daily-look" },
  { label: "핏로그", path: "/fit-log" },
  { label: "게시판", path: "/board" },
];

export const routeTitles = Object.fromEntries(navItems.map((item) => [item.path, item.label]));
