# soon-server-side

## 프로젝트 소개
soon-server-side는 영화 제작사 알림 시스템을 제공하는 서버 사이드 애플리케이션입니다. 이 프로젝트는 MySQL, Redis, Node.js를 사용하여 제작사 테이블의 변경 사항을 체크하고, 유효하지 않은 토큰을 구독 취소하는 기능을 포함하고 있습니다.

## 주요 기능
- 제작사 테이블 변경 사항 체크
- 유효하지 않은 토큰 구독 취소
- Firebase를 통한 알림 전송

## 기술 스택
- Node.js
- MySQL
- Redis
- Firebase

## 설치 및 실행 방법
1. 저장소를 클론합니다.
   ```bash
   git clone https://github.com/yourusername/soon-server-side.git
   ```
2. 프로젝트 디렉토리로 이동합니다.
   ```bash
   cd soon-server-side
   ```
3. 필요한 패키지를 설치합니다.
   ```bash
   npm install
   ```
4. Docker를 사용하여 애플리케이션을 실행합니다.
   ```bash
   docker-compose up
   ```

## 환경 변수 설정
프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음과 같은 환경 변수를 설정합니다.
