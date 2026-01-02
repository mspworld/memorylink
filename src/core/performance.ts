/**
 * Performance utilities
 * Week 10 Day 67-69: Final testing & polish
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Performance monitoring and optimization helpers
 */

import { performance } from 'perf_hooks';

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  operation: string;
  duration: number; // milliseconds
  fileCount?: number;
  recordCount?: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

/**
 * Measure operation performance
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  
  const result = await fn();
  
  const endTime = performance.now();
  const endMemory = process.memoryUsage();
  const duration = endTime - startTime;
  
  const metrics: PerformanceMetrics = {
    operation,
    duration,
    memoryUsage: {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
    },
  };
  
  return { result, metrics };
}

/**
 * Batch processing for large datasets
 * Processes items in batches to avoid memory issues
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Check if operation should be optimized for large repos
 */
export function isLargeRepository(fileCount: number): boolean {
  return fileCount > 10000; // 10k+ files = large repo
}

/**
 * Get optimal batch size based on repository size
 */
export function getOptimalBatchSize(fileCount: number): number {
  if (fileCount < 1000) {
    return 100; // Small repo: process 100 files at a time
  } else if (fileCount < 10000) {
    return 50; // Medium repo: process 50 files at a time
  } else {
    return 20; // Large repo: process 20 files at a time
  }
}

/**
 * Memory-efficient file reading
 * Reads file in chunks for large files
 */
export async function readFileChunked(
  filePath: string,
  chunkSize: number = 1024 * 1024 // 1MB chunks
): Promise<string> {
  const { readFile } = await import('fs/promises');
  const { createReadStream } = await import('fs');
  
  // For files < 10MB, read normally
  const stats = await import('fs/promises').then(fs => fs.stat(filePath));
  if (stats.size < 10 * 1024 * 1024) {
    return await readFile(filePath, 'utf-8');
  }
  
  // For large files, read in chunks
  const chunks: Buffer[] = [];
  const stream = createReadStream(filePath, { highWaterMark: chunkSize });
  
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Performance logger
 */
export function logPerformance(metrics: PerformanceMetrics): void {
  const durationSeconds = (metrics.duration / 1000).toFixed(2);
  const memoryMB = metrics.memoryUsage 
    ? (metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)
    : 'N/A';
  
  console.log(`⏱️  ${metrics.operation}: ${durationSeconds}s (Memory: ${memoryMB}MB)`);
  
  if (metrics.fileCount) {
    const filesPerSecond = (metrics.fileCount / (metrics.duration / 1000)).toFixed(0);
    console.log(`   Throughput: ${filesPerSecond} files/sec`);
  }
}

