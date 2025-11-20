# 서드파티 라이선스 (Third-Party Licenses)

이 프로젝트는 다음의 오픈소스 소프트웨어를 사용합니다.

## 라이선스 요약

본 프로젝트의 모든 의존성은 permissive 오픈소스 라이선스를 사용하며, ISC 라이선스와 호환됩니다.

### 전체 의존성 라이선스 분포

- **MIT**: 380개
- **ISC**: 37개
- **BSD-3-Clause**: 15개
- **Apache-2.0**: 7개
- **BSD-2-Clause**: 3개
- **BlueOak-1.0.0**: 3개
- **(MIT OR CC0-1.0)**: 2개
- **CC-BY-4.0**: 1개

## 직접 의존성 (Direct Dependencies)

### 운영 의존성 (Production Dependencies)

#### @slack/bolt
- **버전**: ^4.6.0
- **라이선스**: MIT
- **용도**: Slack Bot 프레임워크
- **저장소**: https://github.com/slackapi/bolt-js
- **저작권**: Copyright (c) Slack Technologies, LLC

#### dotenv
- **버전**: ^17.2.3
- **라이선스**: BSD-2-Clause
- **용도**: 환경 변수 관리
- **저장소**: https://github.com/motdotla/dotenv
- **저작권**: Copyright (c) 2015, Scott Motte

#### winston
- **버전**: ^3.18.3
- **라이선스**: MIT
- **용도**: 로깅 라이브러리
- **저장소**: https://github.com/winstonjs/winston
- **저작권**: Copyright (c) 2010 Charlie Robbins

### 개발 의존성 (Development Dependencies)

#### TypeScript
- **버전**: ^5.9.3
- **라이선스**: Apache-2.0
- **용도**: TypeScript 컴파일러
- **저장소**: https://github.com/microsoft/TypeScript
- **저작권**: Copyright (c) Microsoft Corporation

#### Jest
- **버전**: ^30.2.0
- **라이선스**: MIT
- **용도**: 테스팅 프레임워크
- **저장소**: https://github.com/jestjs/jest
- **저작권**: Copyright (c) Meta Platforms, Inc. and affiliates

#### ts-jest
- **버전**: ^29.4.5
- **라이선스**: MIT
- **용도**: Jest TypeScript 지원
- **저장소**: https://github.com/kulshekhar/ts-jest

#### ts-node
- **버전**: ^10.9.2
- **라이선스**: MIT
- **용도**: TypeScript 실행 환경
- **저장소**: https://github.com/TypeStrong/ts-node

#### @types/jest
- **버전**: ^30.0.0
- **라이선스**: MIT
- **용도**: Jest TypeScript 타입 정의

#### @types/node
- **버전**: ^24.10.0
- **라이선스**: MIT
- **용도**: Node.js TypeScript 타입 정의

## 라이선스 전문

### MIT License

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### BSD-2-Clause License

```
BSD 2-Clause License

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### Apache License 2.0

```
Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

2. Grant of Copyright License.

3. Grant of Patent License.

4. Redistribution.

5. Submission of Contributions.

6. Trademarks.

7. Disclaimer of Warranty.

8. Limitation of Liability.

9. Accepting Warranty or Additional Liability.

Full license text: http://www.apache.org/licenses/LICENSE-2.0
```

## 전체 의존성 목록

전체 의존성 트리와 각 패키지의 라이선스 정보는 다음 명령으로 확인할 수 있습니다:

```bash
npx license-checker --summary
```

## 라이선스 준수

본 프로젝트는 모든 의존성의 라이선스 요구사항을 준수합니다:

- 모든 의존성의 저작권 표시를 유지합니다
- 각 라이선스의 전문을 이 문서에 포함했습니다
- 배포 시 이 문서를 함께 포함합니다

## 라이선스 갱신

의존성 업데이트 시 이 문서도 함께 갱신해야 합니다. 라이선스 정보는 다음 명령으로 확인할 수 있습니다:

```bash
npx license-checker --json > licenses.json
```

---

Last updated: 2025-01-20
