# MyCloset 백엔드

MyCloset 서비스의 Spring Boot 기반 API 서버입니다.

## 기술 스택

- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA
- MariaDB/MySQL
- JWT Bearer Token 인증

## 팀 작업 규칙

- 백엔드 작업은 Spring Boot 프로젝트 디렉토리에서 진행합니다.
- 프론트엔드는 별도 요청이 있을 때만 수정합니다.
- DB 비밀번호, API Key 같은 민감 정보는 Git에 커밋하지 않습니다.
- 실제 DB 접속 정보는 `src/main/resources/application-local.yml`에 작성합니다.
- `application-local.yml`은 Git에 올라가지 않도록 `.gitignore`에 등록되어 있습니다.
- Git에는 안전한 예시 파일인 `application-local.yml.example`만 커밋합니다.
- 현재 프로젝트는 외부 팀 DB 서버를 사용합니다. 로컬 DB 컨테이너나 로컬 DB 서버는 별도 요청이 있을 때만 추가합니다.

## 로컬 설정

먼저 JDK 21을 설치합니다.

그다음 예시 파일을 복사해 개인 설정 파일을 만듭니다.

```powershell
Copy-Item src\main\resources\application-local.yml.example src\main\resources\application-local.yml
```

`src/main/resources/application-local.yml` 파일을 열고 팀 DB 접속 정보를 입력합니다.

```yml
spring:
  datasource:
    url: jdbc:mariadb://<DB_HOST>:<DB_PORT>/<DB_NAME>?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Seoul
    driver-class-name: org.mariadb.jdbc.Driver
    username: <DB_USERNAME>
    password: <DB_PASSWORD>
```

`application.yml`은 기본으로 `local` profile을 활성화합니다. 따라서 로컬 실행 시 Spring Boot는 `application-local.yml`을 함께 읽습니다.

## 실행 방법

프로젝트 디렉토리에서 실행합니다.

```powershell
.\gradlew.bat bootRun
```

서버는 기본적으로 아래 주소에서 실행됩니다.

```txt
http://localhost:8080
```

## 이미지 파일 저장

옷 이미지는 DB에 바이너리나 Base64로 저장하지 않습니다. Backend가 원본 파일을 로컬 디스크에 저장하고, DB의 `clothes.image_url`에는 이미지 접근 URL만 저장합니다.

### 로컬 기본 경로

기본 설정은 상대 경로 `./uploads`입니다. Backend 프로젝트 디렉토리에서 실행하면 아래 경로가 자동으로 생성됩니다.

```txt
Backend/uploads/clothes/{userIdx}/UUID.확장자
```

현재 개발 PC에서는 다음과 같이 해석됩니다.

```txt
C:\Users\user\Documents\myCloset\Backend\uploads
```

`uploads/`는 `.gitignore`에 등록되어 있으므로 업로드한 이미지가 Git에 커밋되지 않습니다.

### 이미지 업로드 API

```txt
POST /api/clothes/images
Content-Type: multipart/form-data
Authorization: Bearer <accessToken>
```

FormData 필드명은 `image`이며, JPEG, PNG, WEBP, GIF 파일을 최대 15MB까지 업로드할 수 있습니다. Backend는 파일을 리사이즈·압축·포맷 변환하지 않고 그대로 저장합니다.

응답 예시:

```json
{
  "imageUrl": "http://localhost:8080/uploads/clothes/7/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

프론트는 옷 저장 직전에 선택한 원본 `File`을 위 API로 업로드하고, 응답받은 `imageUrl`을 `POST /api/clothes` 또는 `PUT /api/clothes/{clothesId}` 요청 JSON에 넣습니다. FileReader로 만든 `data:image/...;base64,...` 미리보기 값은 저장 API에 보내면 안 됩니다.

옷을 삭제하거나 다른 이미지 URL로 수정하면, 기존 로컬 이미지 파일도 DB 작업이 완료된 뒤 삭제됩니다.

### Raspi 배포 설정

Raspi에서는 실행 위치에 의존하지 않도록 이미지 저장 경로를 절대 경로로 지정합니다. 예를 들어 환경 파일(`/etc/mycloset/backend.env`)에 아래 값을 작성합니다.

```text
CLOTHES_IMAGE_STORAGE_PATH=/home/pi/mycloset-images
CLOTHES_IMAGE_PUBLIC_BASE_URL=http://<RASPI_HOST>:8080
```

이미지 파일은 다음과 같이 저장됩니다.

```txt
/home/pi/mycloset-images/clothes/{userIdx}/UUID.확장자
```

서비스 실행 계정이 해당 폴더를 읽고 쓸 수 있도록 배포 전에 폴더와 권한을 준비합니다.

```bash
sudo mkdir -p /home/pi/mycloset-images
sudo chown -R <service-user>:<service-user> /home/pi/mycloset-images
```

systemd로 실행한다면 서비스 파일에서 환경 파일을 읽도록 설정합니다.

```ini
[Service]
EnvironmentFile=/etc/mycloset/backend.env
```

프론트 도메인 경로(`/uploads/...`)로 이미지를 보이게 하려면 `CLOTHES_IMAGE_PUBLIC_BASE_URL`을 프론트 주소로 설정하고, Nginx가 해당 경로를 이미지 폴더로 연결합니다.

```text
CLOTHES_IMAGE_PUBLIC_BASE_URL=https://front.example.com
```

```nginx
location /uploads/ {
    alias /home/pi/mycloset-images/;
}
```

현재 `/uploads/**`는 프론트의 `<img>` 태그가 바로 표시할 수 있도록 공개 GET 경로입니다. 사용자별 비공개 이미지가 필요한 실제 운영 환경에서는 인증된 이미지 조회 방식으로 변경해야 합니다.

## IntelliJ 설정

IntelliJ에서는 프론트엔드까지 포함한 상위 폴더가 아니라 Spring Boot 프로젝트 디렉토리를 직접 엽니다.

개인 PC의 실제 경로는 다를 수 있습니다. 현재 작업 환경 예시는 아래와 같습니다.

```txt
C:\Users\user\Documents\myCloset\Backend
```

권장 설정은 다음과 같습니다.

- Project SDK: JDK 21
- Gradle JVM: JDK 21
- Use Gradle from: `gradle-wrapper.properties`

실행 파일은 다음 위치에 있습니다.

```txt
src/main/java/com/mycloset/backend/MyClosetBackendApplication.java
```

## API

현재 준비된 기본 API는 다음과 같습니다.

```txt
GET  /api/health
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
```

로그인과 회원가입 API는 `accessToken`을 반환합니다. 인증이 필요한 요청에는 아래 형식으로 토큰을 전달합니다.

```txt
Authorization: Bearer <accessToken>
```

### 회원가입 요청 형식

```json
{
  "loginId": "jun123",
  "password": "test1234",
  "nickname": "준이",
  "email": "jun@test.com",
  "name": "전영준"
}
```

## DB 테이블 구조 불일치 수정 (2026-07-09)

### 문제

공용 DB의 `users` 테이블 구조와 백엔드 코드(`UserAccount`)가 서로 달라 회원가입이 실패했습니다.

- DB 에러: `Field 'id' doesn't have a default value`
- 실제 DB 테이블 PK는 `user_idx`(자동증가)이며, `id`(로그인 아이디, varchar)와 `nickname`이 별도로 존재하고 둘 다 NOT NULL입니다.
- 기존 코드는 PK를 `id`(숫자)로 가정하고 `email`/`password`/`name` 3개만 다뤘습니다.

### 수정 내용

DB 테이블 구조에 코드를 맞췄습니다. 아래 5개 파일을 수정했습니다.

- `UserAccount.java`: PK를 `user_idx`로 매핑, `loginId`(`id` 컬럼)와 `nickname` 필드 추가
- `SignupRequest.java`: `loginId`, `nickname` 요청 필드 추가
- `UserResponse.java`: `userIdx`, `loginId`, `nickname` 응답 필드 추가
- `UserRepository.java`: `existsByLoginId` 조회 메서드 추가
- `AuthService.java`: 회원가입 시 `loginId` 중복 체크 및 저장 로직 추가

### 검증

실제 DB에 연결한 상태로 회원가입 → 로그인 → 토큰 발급까지 정상 동작 확인했습니다.

## Codex 참고 사항

다른 Codex agent가 이 저장소에서 DB 관련 작업을 할 때는 아래 원칙을 따릅니다.

- DB 접속 정보와 비밀번호는 커밋하지 않습니다.
- 개인별 실제 DB 설정은 `src/main/resources/application-local.yml`에 작성합니다.
- `application-local.yml`은 Git ignore 상태를 유지합니다.
- 커밋 가능한 파일은 `application-local.yml.example` 같은 안전한 예시 파일입니다.
- DB 설정 방식이 바뀌면 README와 `application-local.yml.example`만 수정합니다.
