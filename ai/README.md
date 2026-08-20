# MyCloset AI Server

MyCloset 의 AI 추론을 전담하는 FastAPI 서버입니다. 모델 세 개가 한 프로세스에 상주하며,
백엔드가 이 서버의 세 엔드포인트를 중계합니다. 프론트엔드는 이 서버를 직접 호출하지 않습니다.

| 모델 | 하는 일 | 엔드포인트 |
| --- | --- | --- |
| `Qwen2.5-VL-3B` | 옷 사진에서 카테고리 · 색상 · 패턴 · 계절 · 보온도 추출 | `POST /v1/garment-analysis` |
| `Qwen3-4B` | 옷장과 상황을 받아 코디 조합 선택 | `POST /v1/daily-look/recommend` |
| `SANA 1.5 1.6B` | 선택된 코디의 착장 이미지 생성 | `POST /v1/daily-look/image` |

세 모델이 GPU 한 장을 공유하므로 `GPUInferenceManager` 가 추론을 직렬화합니다.
동시에 들어온 요청이 겹쳐 VRAM 이 터지는 것을 막기 위한 장치이며, 처리량 대신 안정성을 택한 설계입니다.
자세한 내용은 [모델 상주와 동시 실행 방지](#모델-상주와-동시-실행-방지) 를 참고하세요.

GPU 가 여유롭지 않다면 `.env` 의 `IMAGE_OFFLOAD=true` 로 이미지 모델을 호출 시점에만 GPU 에 올릴 수 있습니다.

## API

`GET /health`는 인증 없이 세 모델의 적재 상태와 CUDA 장치를 반환합니다.

`POST /v1/garment-analysis`는 옷 사진 한 장(`multipart/form-data`, 필드명 `image`, 최대 15 MB)을 받아
의류 속성을 구조화해 반환합니다. 모델이 확신하지 못한 항목은 `uncertainFields` 에 담기고,
그 경우 `requiresReview` 가 `true` 가 되어 사용자 확인을 유도합니다.

```json
{
  "model": "Qwen/Qwen2.5-VL-3B-Instruct",
  "processingMs": 1840,
  "attributes": {
    "category": "TOP",
    "subcategory": "SHIRT",
    "colors": ["WHITE"],
    "pattern": "SOLID",
    "seasons": ["SPRING", "FALL"],
    "styleTags": ["CASUAL"],
    "warmthLevel": 2,
    "memo": "",
    "uncertainFields": []
  },
  "requiresReview": false
}
```


`POST /v1/daily-look/recommend`는 옷장과 상황을 받아 최대 2개의 유효한 코디를 반환합니다.

```json
{
  "situation": "가을 주말 카페 코디 추천",
  "closet": [
    {
      "clothesId": 101,
      "category": "TOP",
      "subcategory": "SHIRT",
      "colors": ["WHITE"],
      "pattern": "SOLID",
      "seasons": ["SPRING", "FALL"],
      "styleTags": ["CASUAL"],
      "warmthLevel": 2
    }
  ],
  "weather": {
    "temp": 28.4,
    "condition": "clear sky",
    "tempMin": 26.8,
    "tempMax": 30.1
  },
  "modelGender": "male"
}
```

`weather` is optional. When supplied, the AI uses the current/minimum/maximum temperature and condition for outfit selection and the recommendation reason. Omit it or pass `null` to make a recommendation from only `situation` and `closet`, without inferring weather. `modelGender` is required and must be exactly `male` or `female`; it fixes the generated wearer gender without changing the recommendation response schema.

응답의 `slots` 값은 입력 `closet`에 있는 `clothesId` 또는 `null`입니다. 모델이 옷장에 없는 ID 또는 잘못된 카테고리를 내놓으면 서버가 해당 값을 제거하며, top/bottom이 남지 않은 추천은 반환하지 않습니다. `styleKeywords`는 이미지 프롬프트 전용 영어 키워드입니다.

`POST /v1/daily-look/image`는 선택된 아이템과 스타일 키워드를 받아 `image/png` 바이너리를 그대로 반환합니다. Base64 JSON이나 생성 이미지를 DB/로컬 저장소에 보관하지 않습니다.

```json
{
  "items": [
    {"slot": "top", "category": "TOP", "subcategory": "SHIRT", "colors": ["WHITE"]},
    {"slot": "bottom", "category": "BOTTOM", "subcategory": "SLACKS", "colors": ["BLACK"]},
    {"slot": "shoes", "category": "SHOES", "subcategory": "SNEAKERS", "colors": ["WHITE"]}
  ],
  "styleKeywords": ["casual", "autumn", "clean"],
  "modelGender": "female"
}
```

`AI_API_KEY`가 비어 있으면 로컬 개발 모드로 두 API의 인증을 생략합니다. 설정되어 있으면 모든 AI API 요청에 `X-API-Key` 헤더가 필요하며, 잘못된 값은 다음처럼 반환합니다.

```json
{"detail":"Invalid AI API key."}
```

비교에는 constant-time `hmac.compare_digest`를 사용합니다. API 키, 서버 주소, 내부 경로, stack trace는 API 응답과 예제에 포함하지 않습니다.

## 환경 설정

`.env.example`을 `.env`로 복사해 값을 설정합니다. `.env`와 모델 캐시는 Git에서 제외됩니다.

| 설정 | 기본값 | 설명 |
| --- | --- | --- |
| `HOST` / `PORT` | `0.0.0.0` / `8001` | Uvicorn 바인딩 |
| `AI_API_KEY` | 빈 값 | 비어 있으면 로컬 개발 인증 생략 |
| `HF_HOME` | `.model-cache` | Hugging Face 모델 캐시 |
| `LOCAL_FILES_ONLY` | `false` | 캐시만 사용할 때 `true` |
| `RECOMMEND_LOAD_IN_4BIT` | `true` | Qwen3 NF4 4비트 양자화 |
| `IMAGE_OFFLOAD` | `false` | 기본값은 GPU 상주, 메모리 부족 시에만 `true` |
| `ENABLE_WARMUP` | `true` | 시작 시 두 모델 추론 워밍업 |

## Windows 설치 및 실행

NVIDIA 드라이버와 CUDA를 지원하는 PyTorch가 필요합니다. 다음 명령은 Python 3.12(기본값) 또는 3.13 가상환경을 만들고 CUDA PyTorch와 패키지를 설치합니다.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup.ps1
Copy-Item .env.example .env
.\scripts\run.ps1
```

서버 실행 중 다른 PowerShell에서 실제 GPU 환경 smoke test를 실행할 수 있습니다.

```powershell
.\scripts\smoke_test.ps1
```

작업 스케줄러에 시작 시 자동 실행을 등록하거나 제거하려면 관리자 권한 PowerShell에서 실행합니다.

```powershell
.\scripts\register-scheduled-task.ps1
.\scripts\unregister-scheduled-task.ps1
```

## Image Model A/B Profiles

The image generator is selected by `IMAGE_MODEL_PRESET` instead of changing code.

- `sana_1_5` is the default quality profile: SANA 1.5 1.6B, 768x1152, 24 steps, BF16, CPU offload, and Perturbed Attention Guidance (PAG). It uses clothing metadata, not the SDXL IP-Adapter image reference.
- `dreamshaper` is a legacy SD 1.5 profile: DreamShaper-8, 512x768, 22 steps.
- `realvisxl_lightning` selects `SG161222/RealVisXL_V5.0_Lightning`: SDXL, 768x1152, 5 steps, and CPU offload.
- `realvisxl_fast` keeps RealVisXL and IP-Adapter compatibility while using 512x768 and 5 steps for faster generation. Use it with `IMAGE_CONTROLNET_ENABLED=false` when the 12 GB GPU also keeps Qwen loaded.
- `custom` keeps the `IMAGE_MODEL_ID`, `IMAGE_MODEL_LOCAL_PATH`, `IMAGE_MODEL_VARIANT`, `IMAGE_STEPS`, `IMAGE_CFG`, `IMAGE_WIDTH`, `IMAGE_HEIGHT`, and `IMAGE_OFFLOAD` values for manual tuning.

For a persistent A/B switch, set exactly one value in `.env`, then restart the server:

```dotenv
IMAGE_MODEL_PRESET=sana_1_5
```

The first SANA launch downloads about 9.3 GB of weights. SANA uses CPU offload because this server also keeps the Qwen recommendation model loaded on a 12 GB GPU. Confirm the active profile through `GET /health`:

```json
{"imageModel":{"preset":"sana_1_5","id":"Efficient-Large-Model/SANA1.5_1.6B_1024px_diffusers","width":768,"height":1152,"steps":24}}
```

Use the same `/v1/daily-look/image` request for both profiles when comparing output and latency.
On Windows, the Hugging Face cache may require Developer Mode for symlinks. To use a directly downloaded model folder instead, set `IMAGE_MODEL_LOCAL_PATH` and keep `LOCAL_FILES_ONLY=true` after the download:
The SANA profile uses the model's prompt-enhancement context and PAG (`pag_scale=2.0`) to improve text adherence and fine detail. Its 2:3 requested output is internally assigned to SANA's nearest 1024-based aspect-ratio bucket before being resized back to 768x1152, so raising only the returned resolution does not add generated detail. The request can optionally include `items[].pattern` (`SOLID`, `STRIPE`, `CHECK`, `GRAPHIC`, `FLORAL`, or `OTHER`); all supplied colors and the pattern are included in the strict clothing prompt. Generated looks default to a Korean East Asian adult fashion model.

```dotenv
IMAGE_MODEL_PRESET=sana_1_5
IMAGE_MODEL_LOCAL_PATH=C:\\models\\SANA1.5_1.6B_1024px_diffusers
LOCAL_FILES_ONLY=true
```

The local path is used for model loading while `/health` continues to report the canonical model ID.


서비스 실행 로그는 프로젝트 루트의 `server-service.log`에 기록됩니다. Windows에서는 기존 AI 서버와 동일하게 Selector event loop 정책을 적용해 `WinError 10054` 관련 연결 재설정 로그를 줄입니다.

## Docker 실행

Docker Desktop에서 NVIDIA Container Toolkit/GPU 지원을 먼저 활성화한 뒤 실행합니다.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Compose는 기본적으로 `127.0.0.1:8001`에만 포트를 노출합니다. 다른 네트워크의 백엔드가 호출해야 할 때만 `AI_BIND_ADDRESS`를 사설 IP로 제한하고 방화벽도 백엔드 IP/VPN 대역으로 제한하세요. 인터넷에 이 포트를 무제한 공개하지 마세요. 네트워크가 분리된 경우 VPN 또는 IP 제한 방화벽과 `X-API-Key`를 함께 사용해야 합니다.

## 모델 상주와 동시 실행 방지

시작 시 다음 두 모델을 순차 preload 및 warm-up합니다.

- `Qwen/Qwen3-4B-Instruct-2507`: NF4 4비트, 추천 응답 생성
- `Efficient-Large-Model/SANA1.5_1.6B_1024px_diffusers`: BF16, CPU offload 적용, 기본 이미지 생성 프로필

`/health`의 `status`가 `starting`, `ready`, `failed` 중 무엇인지와 두 모델의 `loaded` 상태를 확인합니다. 한 모델이라도 preload에 실패하면 상태는 `failed`가 되고 추론 API는 503을 반환합니다. 모델은 요청마다 unload/reload하지 않습니다.

두 모델이 GPU를 동시에 과점하지 않도록 하나의 공통 비동기 inference lock으로 추천과 이미지 요청을 한 번에 하나씩만 실행합니다. 로그에는 모델 로드 직후의 allocated/reserved VRAM, 추천/이미지 처리 시간, 모델별 오류가 기록됩니다.

4070 Ti에서의 예상치는 추천 약 20–35초이며, SANA 이미지는 PC 상태와 CPU offload 여부에 따라 편차가 크므로 실측을 기준으로 조정합니다. 최초 서버 시작에는 약 9.3GB 모델 다운로드와 preload 시간이 추가됩니다. VRAM이 부족하면 우선 다른 GPU 프로세스를 닫고, 그래도 부족할 때만 더 작은 이미지 크기를 검토하세요. CPU offload는 성능과 GPU 상주 요구를 희생합니다.

## 검증

GPU와 모델 다운로드 없이 mock 모델로 API 계약을 검증합니다.

```powershell
.\scripts\verify.ps1
```

검증 범위는 health 스키마, API key 401, 추천 및 PNG 응답 계약, 빈 `closet`/`items` 422, 모델 오류 503, 잘못된 `clothesId`·slot/category 제거, 공통 GPU lock 직렬화입니다.

## IP-Adapter clothing reference

`POST /v1/daily-look/image` optionally accepts `items[].imageUrl`. The Backend `dev` branch sends this URL from its server-side `Clothes.imageUrl`; clients do not send image bytes.

Set the following before enabling the feature, then restart the AI server:

```dotenv
IMAGE_MODEL_PRESET=realvisxl_lightning
IMAGE_REFERENCE_ENABLED=true
IMAGE_REFERENCE_ALLOWED_HOSTS=backend.local,192.168.0.20
IMAGE_REFERENCE_ALLOWED_PORTS=8080
```

The server selects one reference image in this order: `top`, `outer`, `bottom`, `shoes`, then accessories. It only fetches `http`/`https` URLs whose host and port are explicitly allowed and whose path begins with `/uploads/clothes/`. Redirects, non-image responses, oversized files, and malformed image data are rejected before GPU inference. With no `imageUrl`, or while the feature is disabled, image generation remains text-and-metadata only.

The active image-model profile selects the matching IP-Adapter checkpoint: SDXL for `realvisxl_lightning` and SD 1.5 for `dreamshaper`. `sana_1_5` does not load an IP-Adapter and uses the category, color, and style metadata in the request instead. The first enabled SDXL/SD 1.5 startup downloads the IP-Adapter weights and image encoder into `HF_HOME`.

## OpenPose anatomy control

Set the OpenPose ControlNet switch with the SDXL profile to anchor each generated look to one relaxed, full-body standing pose. This reduces extra limbs and duplicate bodies without changing the image API.

```dotenv
IMAGE_MODEL_PRESET=realvisxl_lightning
IMAGE_CONTROLNET_ENABLED=true
IMAGE_CONTROLNET_MODEL_ID=xinsir/controlnet-openpose-sdxl-1.0
IMAGE_CONTROLNET_SCALE=0.8
```

The server creates the pose map internally because the current API sends clothing data, not a person photo. `IMAGE_CONTROLNET_SCALE` can be tuned from `0.6` (more pose variation) to `1.0` (stronger anatomy lock). This control is SDXL-only; keep it disabled with the SD 1.5 DreamShaper profile.

For a server without internet access, first download the IP-Adapter and ControlNet models with `LOCAL_FILES_ONLY=false`, then set it back to `true` before starting the server. A log line containing `reference_image=True` confirms that an allowed Backend clothing image reached the IP-Adapter.

IP-Adapter is an image-guidance mechanism, not virtual try-on. It improves the reference garment's color and texture but cannot guarantee every garment's exact cut or logo. Exact multi-garment fidelity requires a later virtual try-on/inpainting API that includes a person or mannequin image.
