/**
 * README 의 mermaid 블록을 SVG 로 미리 렌더한다.
 *
 * GitHub 은 ```mermaid 코드블록에 확대·이동 컨트롤을 얹는데, 그 컨트롤이 그림을 가린다.
 * 같은 mermaid 소스를 이미지로 넣으면 컨트롤이 붙지 않는다. 그림 자체는 달라지지 않는다.
 *
 * SVG 대신 PNG 로 뽑는 이유는, mermaid 가 노드 라벨을 foreignObject 로 그리는데
 * 그 SVG 를 <img> 로 넣으면 브라우저가 라벨을 렌더하지 않기 때문이다. 2배 해상도로 뽑는다.
 *
 * 사용법:
 *   npm install -g @mermaid-js/mermaid-cli
 *   node docs/render-diagrams.mjs
 *
 * 다이어그램을 고칠 때는 docs/*.mmd 를 고친 뒤 이 스크립트를 다시 돌린다.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const docsDir = dirname(fileURLToPath(import.meta.url));
const themes = { light: "default", dark: "dark" };

mkdirSync(docsDir, { recursive: true });

const sources = readdirSync(docsDir).filter((name) => name.endsWith(".mmd"));
if (sources.length === 0) {
  console.error("docs/*.mmd 가 없습니다.");
  process.exit(1);
}

const config = join(docsDir, ".mermaid-config.json");
writeFileSync(config, JSON.stringify({ flowchart: { htmlLabels: true }, fontFamily: "sans-serif" }, null, 2));

for (const source of sources) {
  const base = source.replace(/\.mmd$/, "");
  for (const [name, theme] of Object.entries(themes)) {
    const out = join(docsDir, `${base}-${name}.png`);
    // Windows 에서 .cmd 래퍼를 찾으려면 셸을 거쳐야 한다.
    execFileSync(
      "mmdc",
      ["-i", join(docsDir, source), "-o", out, "-t", theme, "-b", "transparent", "-c", config, "-s", "2"],
      { stdio: "inherit", shell: true }
    );
    console.log("생성:", `docs/${base}-${name}.png`);
  }
}
