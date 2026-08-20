# MyCloset

Vite 기반 React 프로젝트입니다.

## 서버 실행

저장소를 받은 뒤 프로젝트 루트에서 아래 명령어를 실행하세요.

```bash
npm run dev
```

`npm run dev`를 실행하면 먼저 `npm install`이 자동으로 실행되어 필요한 패키지를 맞춘 뒤 Vite 개발 서버가 열립니다.

Windows PowerShell에서 `npm` 실행 정책 문제가 나면 아래처럼 실행하세요.

```powershell
npm.cmd run dev
```

실행 후 브라우저에서 아래 주소로 접속하면 됩니다.

```txt
http://localhost:5173/
```

같은 Wi-Fi에 연결된 휴대폰에서 확인하려면 PC의 내부 IP를 사용합니다.

```txt
http://<PC의 내부 IP>:5173/
```

Windows 방화벽이 연결을 차단하면 Vite 서버의 개인 네트워크 접근을 허용해야 합니다.

## 처음 받았거나 pull 받은 뒤

보통은 아래 명령어 하나면 됩니다.

```bash
npm run dev
```

의존성만 미리 설치하고 싶다면 아래 명령어를 사용하세요.

```bash
npm run setup
```

## Codex / 프론트 단독 개발 환경

백엔드 서버를 실행하지 않고 옷 추가 화면의 이미지 분석 흐름을 확인하려면, 프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 설정합니다.

```env
VITE_GARMENT_ANALYSIS_MODE=mock
```

`.env.local`은 개발자별 로컬 설정 파일이며 Git에서 무시됩니다. 커밋하거나 푸시하지 않습니다. 환경 변수를 바꾼 뒤에는 개발 서버를 다시 실행해야 합니다.

Mock 모드에서는 `src/utils/garmentAnalysis.js`가 개발용 분석 결과를 반환하므로, 이미지 선택 → 분석 중 → 옷 정보 확인 및 저장 흐름을 백엔드 없이 테스트할 수 있습니다. 로그인·회원가입처럼 API 서버가 필요한 기능은 별도로 백엔드 서버를 실행해야 합니다.

백엔드 분석 API 연동을 다시 사용할 때는 `.env.local`의 값을 아래처럼 바꾸거나 해당 파일을 제거한 뒤 개발 서버를 재시작합니다.

```env
VITE_GARMENT_ANALYSIS_MODE=backend
```

## 주요 명령어

```bash
npm run dev
```

개발 서버를 실행합니다.

```bash
npm run build
```

배포용 파일을 `dist` 폴더에 생성합니다.

```bash
npm run preview
```

빌드된 결과물을 로컬에서 미리 확인합니다.

## 라우팅

현재 연결된 주소는 다음과 같습니다.

- `/`: 홈
- `/login`: 로그인
- `/signup`: 회원가입
- `/closet`: 나의 옷장
- `/styling`: 코디하기
- `/daily-look`: 데일리룩 추천
- `/fit-log`: 핏로그
- `/board`: 게시판

로그인/회원가입 버튼이나 상단 메뉴를 누르면 화면뿐 아니라 브라우저 주소도 함께 변경됩니다.
