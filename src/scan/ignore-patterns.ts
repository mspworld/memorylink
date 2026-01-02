/**
 * Default Ignore Patterns for Scanning
 * Performance guardrails: Skip directories that shouldn't be scanned
 * 
 * Based on Perplexity AI hardening recommendations
 */

/**
 * Default directories/files to ignore during scanning
 * These are automatically excluded unless overridden
 */
export const DEFAULT_IGNORE_GLOBS = [
  // ===========================
  // DEPENDENCIES (largest impact)
  // ===========================
  '**/node_modules/**',
  '**/vendor/**',
  '**/.venv/**',
  '**/venv/**',
  '**/env/**',
  '**/__pycache__/**',
  '**/site-packages/**',
  '**/.pip/**',
  '**/bower_components/**',
  '**/jspm_packages/**',
  '**/.pnpm-store/**',
  
  // ===========================
  // BUILD OUTPUTS
  // ===========================
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/.svelte-kit/**',
  '**/.astro/**',
  '**/target/**',           // Rust, Java
  '**/bin/**',
  '**/obj/**',              // .NET
  '**/*.egg-info/**',
  '**/.eggs/**',
  
  // ===========================
  // VERSION CONTROL
  // ===========================
  '**/.git/**',
  '**/.svn/**',
  '**/.hg/**',
  '**/.bzr/**',
  
  // ===========================
  // BINARY/MEDIA FILES
  // ===========================
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.gif',
  '**/*.webp',
  '**/*.ico',
  '**/*.svg',
  '**/*.pdf',
  '**/*.doc',
  '**/*.docx',
  '**/*.xls',
  '**/*.xlsx',
  '**/*.ppt',
  '**/*.pptx',
  '**/*.zip',
  '**/*.tar',
  '**/*.gz',
  '**/*.bz2',
  '**/*.xz',
  '**/*.7z',
  '**/*.rar',
  '**/*.exe',
  '**/*.dll',
  '**/*.so',
  '**/*.dylib',
  '**/*.a',
  '**/*.lib',
  '**/*.o',
  '**/*.obj',
  '**/*.pyc',
  '**/*.pyo',
  '**/*.class',
  '**/*.jar',
  '**/*.war',
  '**/*.woff',
  '**/*.woff2',
  '**/*.ttf',
  '**/*.eot',
  '**/*.otf',
  '**/*.mp3',
  '**/*.mp4',
  '**/*.wav',
  '**/*.avi',
  '**/*.mov',
  '**/*.mkv',
  '**/*.webm',
  
  // ===========================
  // CACHE DIRECTORIES
  // ===========================
  '**/.cache/**',
  '**/.parcel-cache/**',
  '**/.turbo/**',
  '**/.webpack/**',
  '**/.rollup.cache/**',
  '**/.eslintcache',
  '**/.prettiercache',
  '**/.stylelintcache',
  '**/coverage/**',
  '**/.nyc_output/**',
  
  // ===========================
  // IDE/EDITOR
  // ===========================
  '**/.idea/**',
  '**/.vscode/**',
  '**/.vs/**',
  '**/*.swp',
  '**/*.swo',
  '**/*~',
  '**/.DS_Store',
  '**/Thumbs.db',
  
  // ===========================
  // PACKAGE LOCK FILES (large, no secrets)
  // ===========================
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/composer.lock',
  '**/Gemfile.lock',
  '**/Cargo.lock',
  '**/poetry.lock',
  '**/Pipfile.lock',
  
  // ===========================
  // TEST FIXTURES (often contain fake data)
  // ===========================
  '**/__fixtures__/**',
  '**/__mocks__/**',
  '**/__snapshots__/**',
  '**/testdata/**',
  '**/test-fixtures/**',
  
  // ===========================
  // DOCUMENTATION (usually no secrets)
  // ===========================
  '**/docs/**',
  '**/documentation/**',
  '**/*.md',
  '**/*.mdx',
  '**/*.rst',
  '**/*.txt',
  
  // ===========================
  // MEMORYLINK INTERNAL
  // ===========================
  '**/.memorylink/**',
];

/**
 * File extensions that should always be scanned
 * Even if they match ignore patterns
 */
export const ALWAYS_SCAN_EXTENSIONS = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
  '.env.staging',
];

/**
 * Maximum file size to scan (in bytes)
 * Files larger than this are skipped
 * Default: 1MB
 */
export const MAX_FILE_SIZE = 1 * 1024 * 1024;

/**
 * Maximum number of files to scan
 * If exceeded, scan stops and warns user
 * Default: 50,000 files
 */
export const MAX_FILES_TO_SCAN = 50000;

/**
 * Check if a file should be ignored based on path
 */
export function shouldIgnoreFile(filePath: string, customIgnores: string[] = []): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const allIgnores = [...DEFAULT_IGNORE_GLOBS, ...customIgnores];
  
  for (const pattern of allIgnores) {
    // Simple glob matching (basic implementation)
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    const regex = new RegExp(regexPattern);
    if (regex.test(normalizedPath)) {
      // Check if it's an env file that should always be scanned
      const fileName = normalizedPath.split('/').pop() || '';
      if (ALWAYS_SCAN_EXTENSIONS.some(ext => fileName.endsWith(ext) || fileName === ext.slice(1))) {
        return false; // Don't ignore .env files
      }
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a file is too large to scan
 */
export function isFileTooLarge(sizeInBytes: number): boolean {
  return sizeInBytes > MAX_FILE_SIZE;
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

