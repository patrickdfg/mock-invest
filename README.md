# 📈 모의투자 (Mock Invest)

고등학생 소모임(10명 내외)이 함께 쓰는 **주식 모의투자 앱**.
실제 시세로 사고팔고, 수수료·세금까지 반영해 손익을 계산하고, 친구들과 수익률 순위를 겨룬다.

실제 돈은 오가지 않는다. 학습용이다.

**▶ 접속: https://mock-invest-beta.vercel.app**

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| 회원가입 / 로그인 | 초대코드로 우리끼리만 가입. 비밀번호는 bcrypt 해시, 세션은 httpOnly JWT 쿠키 |
| 시드머니 | 가입 즉시 1,000만원 지급 (금액 변경 가능) |
| 종목 검색 | 국내(코스피·코스닥·ETF) + 미국 주식. 한글 이름, 6자리 코드, 티커 모두 지원 |
| 실시간 시세 | Yahoo Finance (약 15분 지연). 20초 캐시 + 장애 시 DB 캐시 폴백 |
| 주문 | **시장가**(즉시 체결), **지정가**(조건 도달 시 자동 체결), 주문 취소 |
| 거래비용 | 국내 수수료 0.015% / 매도 거래세 0.18%, 미국 수수료 0.25% |
| 포트폴리오 | 평균단가, 평가손익, 수익률, 종목별 비중 |
| 거래내역 | 체결·미체결·취소 필터, 누적 실현손익, 누적 수수료 |
| 랭킹 | 수익률 순위 + 참가자별 자산 추이 그래프 (일별 스냅샷 자동 기록) |
| 관심종목 | 최대 30개 등록, 홈에서 한눈에 |
| 관리자 | 참가자 목록, 계좌 초기화(리그 리셋) |

미국 주식은 조회 시점 환율(USD/KRW)로 **전부 원화 환산**해 저장한다.
계좌·손익·랭킹이 단일 통화여야 계산이 꼬이지 않기 때문이다.

---

## 기술 스택

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS** — 다크 테마, 모바일 대응
- **Prisma + PostgreSQL** — Neon 무료 플랜. 서버리스에 맞춰 커넥션 풀러 사용
- **jose** (JWT) + **bcryptjs** (비밀번호)
- **Recharts** — 가격 차트, 자산 추이 그래프
- **zod** — API 입력 검증

---

## 빠른 시작 (로컬)

> **먼저 알아둘 것**: 이 앱은 **한 곳에 띄워두고 다같이 접속**하는 구조다.
> 친구들은 설치할 필요가 없다. 주소를 열고 초대코드로 가입하면 끝이다.
> 아래 설치 과정은 **서버를 돌리는 사람 한 명**만 하면 된다.
> (각자 따로 설치하면 데이터베이스가 사람마다 따로 생겨서 랭킹이 의미가 없어진다)

```bash
git clone https://github.com/patrickdfg/mock-invest
cd mock-invest
npm install
npm run setup      # .env 생성 + JWT_SECRET 자동 발급
```

`npm run setup`이 `.env`를 만들고 보안키를 알아서 채워준다.
남은 건 `.env`를 열어 두 줄만 고치는 것이다.

```env
INVITE_CODE="우리반2025"            # 친구들에게 알려줄 가입 코드
ADMIN_EMAILS="본인이메일@example.com"  # 이 이메일로 가입하면 관리자
```

`.env`의 `DATABASE_URL` / `DIRECT_URL`에는 Neon에서 받은 주소를 넣는다
(아래 **배포** 항목 1~2단계 참고. 로컬 개발도 같은 DB를 쓰면 된다).

이어서 테이블을 만들고 실행한다.

```bash
npm run db:deploy
npm run dev
```

http://localhost:3000 접속 → 회원가입 → 끝.

### 친구들이 할 일

1. 알려준 주소 접속
2. 회원가입 (이름·이메일·비밀번호 + 초대코드)
3. 바로 1,000만원으로 거래 시작

설치도, `.env`도, 명령어도 필요 없다.

---

## 환경변수

| 이름 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `DATABASE_URL` | O | - | PostgreSQL 주소. Neon의 **Pooled** 연결 문자열 |
| `DIRECT_URL` | O | - | 같은 DB의 **직접** 연결 문자열 (마이그레이션용) |
| `JWT_SECRET` | O | - | 세션 서명 키. `npm run setup`이 자동 생성 |
| `INVITE_CODE` | | (없음) | 가입 초대코드. 비우면 누구나 가입 가능 |
| `SEED_CASH` | | `10000000` | 시작 자금(원) |
| `ALLOW_24H` | | `true` | `false`면 평일 09:00~15:30에만 국내주식 거래 가능 |
| `ADMIN_EMAILS` | | (없음) | 이 이메일로 가입하면 자동 관리자 (쉼표 구분) |

관리자 계정을 미리 만들고 싶으면:

```bash
SEED_ADMIN_EMAIL=teacher@example.com SEED_ADMIN_PASSWORD=바꿀비밀번호 npm run seed
```

---

## 친구들과 같이 쓰려면 (배포)

**Vercel(앱) + Neon(DB)** 조합. 둘 다 무료이고 카드 등록이 필요 없다.
한 번 올려두면 네 컴퓨터를 꺼도 24시간 돌아간다.

### 1단계 — Neon에서 DB 만들기 (3분)

1. https://neon.tech 접속 → **Sign up** → GitHub 계정으로 로그인
2. 프로젝트 이름 `mock-invest`, 지역은 **Asia Pacific (Singapore)** 선택 → Create
3. 만들어지면 **Connection string** 박스가 보인다. 여기서 값을 두 개 복사한다.
   - **Pooled connection** (주소에 `-pooler`가 들어감) → `DATABASE_URL`로 쓸 값
   - 토글을 꺼서 나오는 직접 연결 주소 (`-pooler` 없음) → `DIRECT_URL`로 쓸 값

   두 주소는 `-pooler` 유무만 다르다. 헷갈리면 Pooled 주소에서 `-pooler`만 지우면 된다.

### 2단계 — Vercel에 올리기 (5분)

1. https://vercel.com 접속 → **Sign up** → GitHub 계정으로 로그인
2. **Add New... → Project** → 이 저장소(`mock-invest`) **Import**
3. **Environment Variables**에 아래 4개를 넣는다.

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | 1단계의 Pooled 주소 |
   | `DIRECT_URL` | 1단계의 직접 주소 |
   | `JWT_SECRET` | 아무 랜덤 문자열 (아래 명령으로 생성) |
   | `ADMIN_EMAILS` | 본인 이메일 |
   | `INVITE_CODE` | 친구들에게 알려줄 코드 |

   `JWT_SECRET` 만들기:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Deploy** 클릭. 빌드 중에 `prisma migrate deploy`가 자동으로 실행되어
   테이블까지 만들어진다. 따로 할 일이 없다.
5. 끝나면 `https://mock-invest-xxxx.vercel.app` 주소가 나온다. 이걸 친구들에게 보내면 된다.

### 3단계 — 확인

1. 받은 주소 접속 → 본인 이메일로 회원가입 (`ADMIN_EMAILS`에 넣었으면 자동 관리자)
2. 상단에 **관리** 메뉴가 보이면 정상
3. 친구들에게 **주소 + 초대코드** 전달

### 자주 막히는 곳

- **빌드 실패 `P1001: Can't reach database`** — `DIRECT_URL`이 비었거나 오타다.
  Neon 주소 끝에 `?sslmode=require`가 붙어 있는지 확인.
- **로그인은 되는데 새로고침하면 풀림** — `JWT_SECRET`을 안 넣었거나 배포마다 바뀌는 값이다.
  Vercel 환경변수에 **고정된 값**으로 저장해야 한다.
- **환경변수를 고친 뒤** — Vercel의 Deployments 탭에서 **Redeploy**를 눌러야 반영된다.

### 다른 선택지

SQLite 파일을 그대로 쓰고 싶다면 Railway(월 $5)나 Fly.io(월 $2~3)에
영구 볼륨을 붙이면 된다. 그 경우 `prisma/schema.prisma`의 provider를
`sqlite`로 되돌리고 `directUrl` 줄을 지우면 된다.

## 리그 운영 팁

- 시작 전에 관리자 페이지에서 **전원 계좌 초기화** → 같은 출발선에서 시작.
- 기간을 정해두자 (예: 한 달). 랭킹의 자산 추이 그래프가 그대로 리그 기록이 된다.
- 자산 스냅샷은 **누군가 랭킹 페이지를 열 때** 그날 값으로 갱신된다.
  하루 한 번은 누가 들어오게 하거나, 서버에서 하루 1회 `/api/ranking`을 호출하도록 걸어두면 좋다.

---

## 구조

```
src/
├─ app/
│  ├─ (app)/              로그인 후 화면 (홈·거래·내자산·거래내역·랭킹·관리)
│  ├─ api/                REST API 라우트
│  ├─ login, signup/      인증 화면
│  └─ layout.tsx
├─ components/            Nav, PriceChart, 공용 UI
├─ lib/
│  ├─ market.ts           시세 조회 + 캐시 + 환율
│  ├─ trade.ts            주문 검증·체결 엔진, 포트폴리오 계산
│  ├─ ranking.ts          순위 계산 + 일별 스냅샷
│  ├─ symbols.ts          종목 사전 (검색 폴백)
│  ├─ auth.ts             JWT 세션
│  └─ config.ts           환경변수·수수료율
├─ middleware.ts          비로그인 접근 차단
└─ prisma/schema.prisma   데이터 모델
```

### 설계상 알아둘 점

- **DB는 PostgreSQL(Neon).** 서버리스에서는 요청마다 커넥션이 새로 뜨므로
  풀러 주소(`DATABASE_URL`)로 접속하고, 마이그레이션만 직접 연결(`DIRECT_URL`)을 쓴다.
- **모든 금액은 KRW.** 미국 주식은 매수 시점 환율로 환산해 저장한다.
  따라서 환율이 오르면 달러 기준 주가가 그대로여도 평가액이 오른다 (실제 해외투자와 동일).
- **지정가 주문은 지연 체결.** 별도 스케줄러 없이, 누군가 포트폴리오·주문·랭킹 API를 부를 때
  대기 주문의 체결 조건을 검사한다. 10명 규모라 이 방식으로 충분하다.
- **지정가 매수는 예수금을 미리 묶지 않는다.** 체결 시점에 돈이 모자라면 그 주문만 자동 취소되고
  사유가 거래내역에 남는다.
- 잔고·보유수량 변경은 전부 `prisma.$transaction` 안에서 처리해 중복 체결을 막는다.

---

## 면책

Yahoo Finance의 공개 데이터를 학습 목적으로 사용한다. 시세는 지연되며 정확성을 보장하지 않는다.
이 앱은 투자 권유가 아니고, 실제 매매와 무관하다.

## 라이선스

MIT
