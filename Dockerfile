# 기본 이미지 선택
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# 패키지 파일 복사
COPY package*.json ./

# 프로덕션 의존성만 설치
RUN npm install --omit=dev

# 소스 코드 복사
COPY . .

# 환경 변수 설정
ENV NODE_ENV=production

# 헬스체크를 위한 상태 파일 생성
RUN mkdir -p /usr/src/app/logs

# 포트 설정
EXPOSE 5001

# 애플리케이션 실행
CMD ["node", "src/app.js"]