/**
 * 파일 검색 유틸리티
 * File finder utility
 *
 * 프로젝트 내에서 특정 확장자의 파일을 검색하고 정렬합니다.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from './logger';

/**
 * 파일 정보
 * File information
 */
export interface FileInfo {
  /** 상대 경로 (프로젝트 루트 기준) */
  relativePath: string;
  /** 절대 경로 */
  absolutePath: string;
  /** 파일 크기 (bytes) */
  size: number;
  /** 마지막 수정 시간 */
  modifiedTime: Date;
}

/**
 * 파일 검색 옵션
 * File search options
 */
export interface FileSearchOptions {
  /** 검색할 확장자 목록 (예: ['.md', '.json', '.txt']) */
  extensions: string[];
  /** 최대 파일 개수 (기본값: 300) */
  maxFiles?: number;
  /** 제외할 디렉토리 패턴 (기본값: ['node_modules', '.git', 'dist', 'build']) */
  excludeDirs?: string[];
  /** 최대 검색 깊이 (기본값: 10) */
  maxDepth?: number;
}

/**
 * 프로젝트 디렉토리에서 파일 검색
 * Search files in project directory
 *
 * @param projectPath - 프로젝트 루트 경로
 * @param options - 검색 옵션
 * @returns 파일 정보 배열 (수정 시간 역순 정렬)
 */
export async function findFiles(
  projectPath: string,
  options: FileSearchOptions
): Promise<FileInfo[]> {
  const logger = getLogger();
  const {
    extensions,
    maxFiles = 300,
    excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'],
    maxDepth = 10,
  } = options;

  const files: FileInfo[] = [];
  const normalizedExtensions = extensions.map((ext) => ext.toLowerCase());

  /**
   * 재귀적으로 디렉토리 탐색
   * Recursively traverse directory
   */
  function traverseDirectory(dirPath: string, currentDepth: number): void {
    // 최대 파일 개수 도달 시 중단
    if (files.length >= maxFiles) {
      return;
    }

    // 최대 깊이 도달 시 중단
    if (currentDepth > maxDepth) {
      return;
    }

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // 최대 파일 개수 도달 시 중단
        if (files.length >= maxFiles) {
          break;
        }

        const fullPath = path.join(dirPath, entry.name);

        // 디렉토리 처리
        if (entry.isDirectory()) {
          // 제외 디렉토리 체크
          if (excludeDirs.includes(entry.name)) {
            continue;
          }

          // 재귀 탐색
          traverseDirectory(fullPath, currentDepth + 1);
        }
        // 파일 처리
        else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();

          // 확장자 필터링
          if (normalizedExtensions.includes(ext)) {
            try {
              const stats = fs.statSync(fullPath);
              const relativePath = path.relative(projectPath, fullPath);

              files.push({
                relativePath,
                absolutePath: fullPath,
                size: stats.size,
                modifiedTime: stats.mtime,
              });
            } catch (statError) {
              logger.warn(`Failed to stat file ${fullPath}: ${statError}`);
            }
          }
        }
      }
    } catch (readError) {
      logger.warn(`Failed to read directory ${dirPath}: ${readError}`);
    }
  }

  // 프로젝트 경로 존재 여부 확인
  if (!fs.existsSync(projectPath)) {
    logger.error(`Project path does not exist: ${projectPath}`);
    return [];
  }

  // 디렉토리인지 확인
  const stats = fs.statSync(projectPath);
  if (!stats.isDirectory()) {
    logger.error(`Project path is not a directory: ${projectPath}`);
    return [];
  }

  logger.info(`Searching files in ${projectPath} with extensions: ${extensions.join(', ')}`);

  // 탐색 시작
  traverseDirectory(projectPath, 0);

  // 수정 시간 역순 정렬 (최신 파일 먼저)
  files.sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime());

  logger.info(`Found ${files.length} files`);

  return files;
}

/**
 * 텍스트를 Slack API 제한(75자)에 맞게 축약
 * Truncate text to fit Slack API limit (75 characters)
 *
 * @param filePath - 파일 경로
 * @param sizeStr - 파일 크기 문자열
 * @param timeAgo - 수정 시간 문자열
 * @returns 축약된 텍스트 (최대 70자, 안전 마진 5자)
 */
function truncateOptionText(filePath: string, sizeStr: string, timeAgo: string): string {
  const MAX_LENGTH = 70; // 안전 마진 5자 (Slack 제한 75자)
  const fileName = path.basename(filePath);
  const meta = ` (${sizeStr}, ${timeAgo})`;
  const fullText = `${filePath}${meta}`;

  // 전체 텍스트가 제한 이내면 그대로 반환
  if (fullText.length <= MAX_LENGTH) {
    return fullText;
  }

  // 파일명 + 메타만으로도 초과하면 파일명도 축약
  if (fileName.length + meta.length > MAX_LENGTH) {
    const maxFileNameLength = MAX_LENGTH - meta.length - 3; // 3자는 "..." 용
    const truncatedFileName = fileName.slice(-maxFileNameLength);
    return `...${truncatedFileName}${meta}`;
  }

  // 파일명 + 메타는 들어가므로 경로만 축약
  return `...${fileName}${meta}`;
}

/**
 * 파일 정보를 Slack 선택 옵션 형식으로 변환
 * Convert file info to Slack select option format
 *
 * @param files - 파일 정보 배열
 * @returns Slack option 배열
 */
export function filesToSlackOptions(files: FileInfo[]): any[] {
  return files.map((file) => {
    // 수정 시간을 상대 시간으로 표시
    const now = new Date();
    const diffMs = now.getTime() - file.modifiedTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeAgo: string;
    if (diffMinutes < 1) {
      timeAgo = '방금';
    } else if (diffMinutes < 60) {
      timeAgo = `${diffMinutes}분 전`;
    } else if (diffHours < 24) {
      timeAgo = `${diffHours}시간 전`;
    } else if (diffDays < 30) {
      timeAgo = `${diffDays}일 전`;
    } else {
      timeAgo = file.modifiedTime.toLocaleDateString('ko-KR');
    }

    // 파일 크기를 읽기 쉬운 형식으로 표시
    let sizeStr: string;
    if (file.size < 1024) {
      sizeStr = `${file.size}B`;
    } else if (file.size < 1024 * 1024) {
      sizeStr = `${(file.size / 1024).toFixed(1)}KB`;
    } else {
      sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)}MB`;
    }

    // Slack API 제한(75자)에 맞게 텍스트 축약
    const displayText = truncateOptionText(file.relativePath, sizeStr, timeAgo);

    return {
      text: {
        type: 'plain_text',
        text: displayText,
      },
      value: file.relativePath,
    };
  });
}
