# 기여 안내

MyCloset 에 관심 가져 주셔서 감사합니다. 이 문서는 개발 환경을 맞추고 변경을 제안하는 방법을 정리합니다.

## 개발 환경

| 컴포넌트 | 요구 사항 |
| --- | --- |
| `back` | JDK 21, MariaDB 또는 MySQL |
| `front` | Node 20 이상 |
| `ai` | Python 3.12 이상, CUDA GPU (없으면 이 서버만 건너뛰면 됩니다) |

각 컴포넌트의 실행 방법은 [README 의 실행 방법](README.md#실행-방법) 을 참고하세요.

## 코드 스타일

포맷은 도구가 강제합니다. 직접 맞추지 말고 아래 명령을 실행하세요.

```bash
# ai
ruff format ai && ruff check --fix ai

# front
cd front && npm run format

# back
cd back && ./gradlew spotlessApply
```

CI 가 같은 검사를 다시 돌립니다. 포맷이 어긋나면 빌드가 실패합니다.

기존 코드의 관습을 따르는 편이 좋습니다. 주석 밀도, 이름 짓는 방식, 파일 배치가 이미 정해져 있습니다.

## 변경을 제안할 때

1. 이슈를 먼저 열어 주세요. 이미 진행 중인 작업과 겹치는지 확인할 수 있습니다.
2. `main` 에서 브랜치를 따고 작업합니다.
3. 커밋 메시지는 무엇을 왜 바꿨는지 한 줄로 적습니다.
4. PR 을 열기 전에 아래 셋이 통과하는지 확인해 주세요.

```bash
cd back  && ./gradlew build
cd front && npm run build
ruff check ai
```

## 민감 정보

DB 비밀번호, JWT 시크릿, API 키는 **어떤 형태로도 커밋하지 마세요.**

- `back/src/main/resources/application-local.yml`
- `ai/.env`
- `front/.env`

이 세 파일은 `.gitignore` 에 등록되어 있습니다. 예시 파일(`*.example`)만 저장소에 올라갑니다.
설정 항목을 추가했다면 예시 파일에도 플레이스홀더를 함께 추가해 주세요.

## 버그 제보

재현 경로가 있으면 고치는 속도가 크게 달라집니다. 아래를 함께 적어 주세요.

- 어떤 컴포넌트에서 발생했는지 (`front` / `back` / `ai`)
- 재현 절차
- 기대한 동작과 실제 동작
- 로그나 스크린샷
