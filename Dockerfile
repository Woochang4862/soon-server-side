# 베이스 이미지 설정
FROM node:14.21.3

# 작업 디렉토리 설정
WORKDIR /soon-server-side

# 호스트 컴퓨터의 .env, package.json, package-lock.json 파일을 이미지 내부로 복사
COPY package*.json ./
RUN npm install

# 필수 패키지 설치
RUN npm install -g pm2

# 애플리케이션 실행
CMD ["npm", "start"]

