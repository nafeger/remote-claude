/**
 * Job Queue 클래스
 * Job queue for managing tasks per project/channel
 */

import { Job, JobType, JobStatus } from '../types';
import { getLogger } from '../utils/logger';

/**
 * Job Queue 클래스
 * Manages FIFO job queue per channel/project
 */
export class JobQueue {
  // 채널별 작업 큐 (channelId -> Job[])
  private queues: Map<string, Job[]>;

  constructor() {
    this.queues = new Map();
  }

  /**
   * 작업 ID 생성
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 작업 추가
   * Add job to queue
   *
   * @param channelId - Channel ID
   * @param type - Job type
   * @param prompt - Prompt text
   * @returns Created job
   */
  public addJob(channelId: string, type: JobType, prompt: string): Job {
    const logger = getLogger();

    const job: Job = {
      id: this.generateJobId(),
      channelId,
      type,
      prompt,
      status: JobStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    // 채널 큐 가져오기 또는 생성
    if (!this.queues.has(channelId)) {
      this.queues.set(channelId, []);
    }

    const queue = this.queues.get(channelId)!;
    queue.push(job);

    logger.info(`Job added to queue: ${job.id} (channel: ${channelId}, type: ${type})`);

    return job;
  }

  /**
   * 다음 작업 가져오기 (FIFO)
   * Get next pending job from queue
   *
   * @param channelId - Channel ID
   * @returns Next pending job or undefined
   */
  public getNextJob(channelId: string): Job | undefined {
    const queue = this.queues.get(channelId);
    if (!queue) {
      return undefined;
    }

    // PENDING 상태인 첫 번째 작업 찾기
    return queue.find((job) => job.status === JobStatus.PENDING);
  }

  /**
   * 작업 상태 업데이트
   * Update job status
   *
   * @param jobId - Job ID
   * @param status - New status
   * @param error - Optional error message
   */
  public updateJobStatus(
    jobId: string,
    status: JobStatus,
    error?: string
  ): void {
    const logger = getLogger();

    for (const queue of this.queues.values()) {
      const job = queue.find((j) => j.id === jobId);
      if (job) {
        job.status = status;

        if (status === JobStatus.RUNNING) {
          job.startedAt = new Date().toISOString();
        } else if (
          status === JobStatus.COMPLETED ||
          status === JobStatus.FAILED ||
          status === JobStatus.CANCELLED
        ) {
          job.completedAt = new Date().toISOString();
        }

        if (error) {
          job.error = error;
        }

        logger.info(`Job status updated: ${jobId} -> ${status}`);
        return;
      }
    }

    logger.warn(`Job not found for status update: ${jobId}`);
  }

  /**
   * 작업 조회
   * Get job by ID
   */
  public getJob(jobId: string): Job | undefined {
    for (const queue of this.queues.values()) {
      const job = queue.find((j) => j.id === jobId);
      if (job) {
        return job;
      }
    }
    return undefined;
  }

  /**
   * 채널의 모든 작업 가져오기
   * Get all jobs for channel
   */
  public getChannelJobs(channelId: string): Job[] {
    return this.queues.get(channelId) || [];
  }

  /**
   * 채널의 실행 중인 작업 가져오기
   * Get running job for channel
   */
  public getRunningJob(channelId: string): Job | undefined {
    const queue = this.queues.get(channelId);
    if (!queue) {
      return undefined;
    }

    return queue.find((job) => job.status === JobStatus.RUNNING);
  }

  /**
   * 채널의 대기 중인 작업 개수
   * Get pending job count for channel
   */
  public getPendingCount(channelId: string): number {
    const queue = this.queues.get(channelId);
    if (!queue) {
      return 0;
    }

    return queue.filter((job) => job.status === JobStatus.PENDING).length;
  }

  /**
   * 작업 취소
   * Cancel job
   *
   * @param jobId - Job ID
   * @returns true if cancelled, false if not found or already completed
   */
  public cancelJob(jobId: string): boolean {
    const logger = getLogger();

    for (const queue of this.queues.values()) {
      const job = queue.find((j) => j.id === jobId);
      if (job) {
        // 이미 완료된 작업은 취소할 수 없음
        if (
          job.status === JobStatus.COMPLETED ||
          job.status === JobStatus.FAILED ||
          job.status === JobStatus.CANCELLED
        ) {
          logger.warn(`Cannot cancel job in ${job.status} status: ${jobId}`);
          return false;
        }

        this.updateJobStatus(jobId, JobStatus.CANCELLED);
        logger.info(`Job cancelled: ${jobId}`);
        return true;
      }
    }

    logger.warn(`Job not found for cancellation: ${jobId}`);
    return false;
  }

  /**
   * 완료된 작업 정리
   * Clean up completed jobs
   *
   * @param olderThanHours - Remove jobs older than this many hours (default: 24)
   */
  public cleanupCompletedJobs(olderThanHours: number = 24): number {
    const logger = getLogger();
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    let removedCount = 0;

    for (const [channelId, queue] of this.queues.entries()) {
      const originalLength = queue.length;

      // 완료되고 오래된 작업만 제거
      const filtered = queue.filter((job) => {
        const isOld =
          job.completedAt &&
          new Date(job.completedAt).getTime() < cutoffTime;
        const isCompleted =
          job.status === JobStatus.COMPLETED ||
          job.status === JobStatus.FAILED ||
          job.status === JobStatus.CANCELLED;

        return !(isOld && isCompleted);
      });

      removedCount += originalLength - filtered.length;
      this.queues.set(channelId, filtered);
    }

    if (removedCount > 0) {
      logger.info(`Cleaned up ${removedCount} completed jobs`);
    }

    return removedCount;
  }

  /**
   * 큐 상태 요약
   * Get queue summary
   */
  public getQueueSummary(channelId: string): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const queue = this.queues.get(channelId) || [];

    return {
      total: queue.length,
      pending: queue.filter((j) => j.status === JobStatus.PENDING).length,
      running: queue.filter((j) => j.status === JobStatus.RUNNING).length,
      completed: queue.filter((j) => j.status === JobStatus.COMPLETED).length,
      failed: queue.filter((j) => j.status === JobStatus.FAILED).length,
      cancelled: queue.filter((j) => j.status === JobStatus.CANCELLED).length,
    };
  }

  /**
   * 모든 큐 초기화
   * Clear all queues (for testing)
   */
  public clearAll(): void {
    this.queues.clear();
  }
}
