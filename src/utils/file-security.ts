/**
 * 파일 보안 검증 유틸리티
 * File security validation utility
 *
 * 이 모듈은 프로젝트 파일 다운로드 기능의 보안 검증을 담당합니다.
 * - Path traversal 공격 방지
 * - 민감한 파일 접근 차단
 * - 파일 크기 제한 검증
 */

import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from './logger';

/**
 * 파일 경로 검증 결과 인터페이스
 * File path validation result interface
 */
export interface ValidationResult {
  /** 검증 성공 여부 */
  valid: boolean;
  /** 검증된 절대 경로 (검증 성공 시) */
  resolvedPath?: string;
  /** 에러 메시지 (검증 실패 시) */
  error?: string;
}

/**
 * 민감한 파일 패턴 목록
 * Sensitive file patterns to block
 *
 * 다음 패턴의 파일 접근을 차단합니다:
 * - 환경 변수 파일: .env, .env.*
 * - 암호화 키 및 인증서: *.key, *.pem
 * - 인증 정보 파일: credentials, password 포함
 * - SSH 키: .ssh/ 디렉토리, id_rsa, id_ed25519
 * - Git 설정: .git/config
 */
export const SENSITIVE_FILE_PATTERNS: RegExp[] = [
  /\.env$/i,              // .env 파일
  /\.env\./i,             // .env.* 파일 (예: .env.local, .env.production)
  /\.key$/i,              // *.key 파일
  /\.pem$/i,              // *.pem 파일
  /credentials/i,         // credentials 포함 (대소문자 무관)
  /password/i,            // password 포함 (대소문자 무관)
  /\.ssh\//i,             // .ssh/ 디렉토리 내 파일
  /id_rsa/i,              // id_rsa SSH 키
  /id_ed25519/i,          // id_ed25519 SSH 키
  /\.git\/config$/i,      // .git/config 파일
];

/**
 * 파일 크기 제한 (바이트)
 * File size limit in bytes
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 파일 경로 보안 검증 함수
 * Validates file path for security
 *
 * 다음 보안 검증을 순차적으로 수행합니다:
 * 1. 빈 경로 검증 - 빈 문자열 또는 공백만 있는 경로 차단
 * 2. 절대 경로 변환 - path.resolve()로 프로젝트 기준 절대 경로 생성
 * 3. Path traversal 방지 - 프로젝트 디렉토리 외부 접근 시도 차단 (../../etc/passwd 등)
 * 4. 민감한 파일 차단 - .env, *.key, *.pem, credentials, SSH 키 등 접근 차단
 * 5. 파일 존재 확인 - 실제 파일 시스템에 파일 존재 여부 검증
 * 6. 디렉토리 차단 - 디렉토리는 다운로드 불가, 파일만 허용
 * 7. 파일 크기 검증 - MAX_FILE_SIZE (10MB) 초과 파일 차단
 * 8. 성공 반환 - 모든 검증 통과 시 검증된 절대 경로 반환
 *
 * @param projectPath - 프로젝트 루트 디렉토리의 절대 경로
 * @param userInputPath - 사용자가 입력한 파일 경로 (상대 또는 절대 경로)
 * @returns {ValidationResult} 검증 결과 객체
 *   - valid: true인 경우 resolvedPath에 검증된 절대 경로 포함
 *   - valid: false인 경우 error에 한글 에러 메시지 포함
 *
 * @example
 * // 성공 케이스
 * const result = validateFilePath('/project', 'src/index.ts');
 * // result = { valid: true, resolvedPath: '/project/src/index.ts' }
 *
 * @example
 * // 실패 케이스 - Path traversal
 * const result = validateFilePath('/project', '../../etc/passwd');
 * // result = { valid: false, error: '⚠️ 프로젝트 디렉토리 외부 파일은 접근할 수 없습니다.' }
 *
 * @example
 * // 실패 케이스 - 민감한 파일
 * const result = validateFilePath('/project', '.env');
 * // result = { valid: false, error: '⚠️ 보안상 민감한 파일은 다운로드할 수 없습니다.' }
 */
export function validateFilePath(
  projectPath: string,
  userInputPath: string
): ValidationResult {
  const logger = getLogger();

  // 1. 빈 경로 검증
  if (!userInputPath || userInputPath.trim() === '') {
    logger.warn('Empty file path provided');
    return {
      valid: false,
      error: '파일 경로를 입력해주세요.',
    };
  }

  // 1.5. 와일드카드 패턴 검증
  // 와일드카드 (*, ?) 패턴은 현재 지원하지 않음 (Phase 2 구현 예정)
  if (userInputPath.includes('*') || userInputPath.includes('?')) {
    logger.warn(`Wildcard pattern not supported: ${userInputPath}`);
    return {
      valid: false,
      error: '⚠️ 와일드카드 패턴(`*`, `?`)은 현재 지원하지 않습니다.\n\n개별 파일 경로를 사용해주세요.\n예시: `/download README.md`',
    };
  }

  // 2. 절대 경로로 변환
  // path.resolve()는 projectPath를 기준으로 userInputPath를 절대 경로로 변환
  // 절대 경로가 입력되어도 projectPath 기준으로 재해석됨
  const resolvedPath = path.resolve(projectPath, userInputPath);
  logger.debug(`Resolved path: ${resolvedPath}`);

  // 3. Path traversal 공격 방지
  // 해석된 경로가 프로젝트 디렉토리 내부인지 확인
  // startsWith() 검사로 ../../etc/passwd 같은 접근 시도 차단
  if (!resolvedPath.startsWith(projectPath)) {
    logger.warn(`Path traversal attempt detected: ${userInputPath} -> ${resolvedPath}`);
    return {
      valid: false,
      error: '⚠️ 프로젝트 디렉토리 외부 파일은 접근할 수 없습니다.',
    };
  }

  // 4. 민감한 파일 패턴 검사
  // SENSITIVE_FILE_PATTERNS에 정의된 패턴과 매칭되는 파일 차단
  for (const pattern of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(resolvedPath)) {
      logger.warn(`Sensitive file access blocked: ${resolvedPath}`);
      return {
        valid: false,
        error: '⚠️ 보안상 민감한 파일은 다운로드할 수 없습니다.',
      };
    }
  }

  // 5. 파일 존재 여부 확인
  if (!fs.existsSync(resolvedPath)) {
    logger.warn(`File not found: ${resolvedPath}`);
    return {
      valid: false,
      error: `❌ 파일을 찾을 수 없습니다: ${userInputPath}`,
    };
  }

  // 6. 디렉토리 여부 확인
  // fs.statSync()로 파일 정보를 가져와 디렉토리인지 확인
  // 디렉토리는 다운로드할 수 없으므로 차단
  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory()) {
    logger.warn(`Directory path provided: ${resolvedPath}`);
    return {
      valid: false,
      error: '⚠️ 디렉토리는 다운로드할 수 없습니다. 파일 경로를 지정하세요.',
    };
  }

  // 7. 파일 크기 제한 검증
  // stat.size로 파일 크기를 바이트 단위로 확인
  // MAX_FILE_SIZE (10MB)를 초과하는 파일은 차단
  if (stat.size > MAX_FILE_SIZE) {
    const fileSizeMB = (stat.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    logger.warn(`File size exceeds limit: ${fileSizeMB}MB > ${maxSizeMB}MB`);
    return {
      valid: false,
      error: `⚠️ 파일 크기가 제한을 초과했습니다. (${fileSizeMB}MB > ${maxSizeMB}MB)`,
    };
  }

  // 8. 모든 검증 통과 - 성공 반환
  // 모든 보안 검증을 통과한 경우 검증된 절대 경로 반환
  logger.info(`File path validation successful: ${resolvedPath}`);
  return {
    valid: true,
    resolvedPath,
  };
}
