# Auth Service

## 1. 개요
Auth Service는 사용자 인증, 인가 및 계정 관리를 담당하는 마이크로서비스입니다.

## 2. 주요 기능

### 2.1 사용자 인증 (Authentication)
#### 회원가입 (`POST /api/v1/auth/register`)
- 새로운 사용자 계정 생성
- 이메일 중복 검사
- 비밀번호 암호화 저장
- 기본 사용자 정보 설정

#### 로그인 (`POST /api/v1/auth/login`)
- 이메일/비밀번호 인증
- JWT 액세스 토큰 발급
- 리프레시 토큰 발급
- 세션 생성 및 Redis 캐싱

#### 로그아웃 (`POST /api/v1/auth/logout`)
- 현재 세션 무효화
- Redis 세션 정보 삭제

#### 토큰 갱신 (`POST /api/v1/auth/refresh-token`)
- 리프레시 토큰 검증
- 새로운 액세스 토큰 발급

### 2.2 사용자 프로필 관리

#### 프로필 조회 (`GET /api/v1/users/profile`)
- 현재 사용자 정보 조회
- 민감 정보 제외 (비밀번호 등)

#### 프로필 수정 (`PUT /api/v1/users/profile`)
- 사용자 정보 업데이트 (이름, 이메일)
- 이메일 중복 검사

#### 비밀번호 변경 (`PUT /api/v1/users/password`)
- 현재 비밀번호 검증
- 새 비밀번호 설정
- 다른 세션 로그아웃 처리

#### 계정 삭제 (`DELETE /api/v1/users`)
- 비밀번호 검증
- 관련 세션 정보 삭제
- 사용자 데이터 완전 삭제

### 2.3 세션 관리

#### 세션 목록 조회 (`GET /api/v1/users/sessions`)
- 현재 활성 세션 목록 조회
- 세션 상세 정보 제공 (접속 기기, IP 등)

#### 다른 세션 로그아웃 (`POST /api/v1/users/logout-others`)
- 중복 로그인 방지
- 현재 세션 외 모든 세션 무효화
