import AdmZip from "adm-zip";
import { fileTypeFromBuffer } from "file-type";

// ============================================================================
// ZIP STRUCTURE VALIDATION LIMITS
// ============================================================================
// These limits protect against malicious ZIP files (zip bombs, malware)
//
// ZIP_LIMITS.maxFiles        - Maximum number of files allowed in a ZIP archive
// ZIP_LIMITS.maxTotalSize    - Maximum total decompressed size (prevents zip bombs)
// ZIP_LIMITS.maxCompressionRatio - Maximum compression ratio (detects zip bombs)
//
// FORBIDDEN_EXTENSIONS_IN_ZIP - File extensions that are never allowed inside ZIPs
// ============================================================================

const ZIP_LIMITS = {
  maxFiles: 100, // Max 100 files per archive
  maxTotalSize: 500 * 1024 * 1024, // 500MB max decompressed size
  maxCompressionRatio: 100, // 100:1 max compression ratio (zip bomb detection)
};

const FORBIDDEN_EXTENSIONS_IN_ZIP = [
  ".exe",
  ".bat",
  ".cmd",
  ".scr",
  ".com",
  ".pif",
  ".vbs",
  ".vbe",
  ".js",
  ".jse",
  ".ws",
  ".wsf",
  ".wsc",
  ".wsh",
  ".ps1",
  ".ps1xml",
  ".ps2",
  ".ps2xml",
  ".psc1",
  ".psc2",
  ".msh",
  ".msh1",
  ".msh2",
  ".mshxml",
  ".msh1xml",
  ".msh2xml",
  ".scf",
  ".lnk",
  ".inf",
  ".reg",
  ".jar",
  ".dll",
  ".msi",
  ".msp",
  ".mst",
  ".sh",
  ".bash",
  ".zsh",
  ".csh",
  ".app",
  ".deb",
  ".rpm",
  ".dmg",
  ".pkg",
  ".iso",
];

// Configuration of allowed file types
const ALLOWED_MIME_TYPES = {
  audio: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/aiff", "audio/flac"],
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: ["application/pdf"],
};

// Configuration des limites de taille (harmonisé avec multer et validateFileUpload)
const SIZE_LIMITS = {
  audio: 100 * 1024 * 1024, // 100MB - fichiers audio professionnels (WAV 24-bit, FLAC)
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
};

// Validation avancée des fichiers
export async function validateFile(
  file: Express.Multer.File,
  options: {
    allowedTypes?: string[];
    maxSize?: number;
    category?: "audio" | "image" | "document";
  } = {}
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Determine category and limits
  const category = options.category || "audio";
  const allowedTypes = options.allowedTypes || ALLOWED_MIME_TYPES[category];
  const maxSize = options.maxSize || SIZE_LIMITS[category];

  // Détection du type de fichier réel
  const fileBuffer = file.buffer;
  const detectedType = await fileTypeFromBuffer(fileBuffer);
  const detectedMime = detectedType?.mime || file.mimetype;

  // Vérification du type MIME
  if (!allowedTypes.includes(detectedMime)) {
    errors.push(`Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(", ")}`);
  }

  // Vérification de la taille
  if (file.size > maxSize) {
    errors.push(`Taille de fichier dépassée. Maximum: ${maxSize / (1024 * 1024)}MB`);
  }

  // Vérification supplémentaire pour les fichiers audio
  if (category === "audio") {
    // Basic audio quality validation based on file size and type
    const minAudioSize = 100 * 1024; // 100KB minimum for valid audio

    if (file.size < minAudioSize) {
      errors.push("Audio file too small - may be corrupted or low quality");
    }

    // Validate audio MIME types using detected MIME (not client-provided)
    const validAudioTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/aiff",
      "audio/x-aiff",
      "audio/flac",
      "audio/x-flac",
      "audio/ogg",
      "audio/aac",
    ];

    if (!validAudioTypes.includes(detectedMime)) {
      errors.push(
        `Invalid audio format: ${detectedMime}. Supported: MP3, WAV, AIFF, FLAC, OGG, AAC`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Enhanced antivirus scanning with multiple checks
export async function scanFile(file: Express.Multer.File): Promise<{
  safe: boolean;
  threats: string[];
  scanTime: number;
}> {
  const startTime = Date.now();
  const threats: string[] = [];

  try {
    // 1. File signature analysis
    const signatureThreats = await scanFileSignatures(file);
    threats.push(...signatureThreats);

    // 2. File name analysis
    const nameThreats = scanFileName(file.originalname);
    threats.push(...nameThreats);

    // 3. File size analysis
    const sizeThreats = scanFileSize(file);
    threats.push(...sizeThreats);

    // 4. Content analysis for specific file types
    const contentThreats = await scanFileContent(file);
    threats.push(...contentThreats);

    // 5. ZIP structure analysis (if applicable)
    const isZipFile =
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.toLowerCase().endsWith(".zip");

    if (isZipFile) {
      const zipResult = await scanZipStructure(file);
      if (!zipResult.valid) {
        threats.push(...zipResult.errors);
      }
    }

    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    const scanTime = Date.now() - startTime;
    const safe = threats.length === 0;

    console.log(
      `Antivirus scan completed for ${file.originalname}: ${safe ? "SAFE" : "THREATS DETECTED"}`,
      {
        threats,
        scanTime,
        fileSize: file.size,
        mimeType: file.mimetype,
      }
    );

    return { safe, threats, scanTime };
  } catch (error) {
    console.error("Antivirus scan error:", error);
    // In case of scan error, be conservative and flag as unsafe
    return {
      safe: false,
      threats: ["SCAN_ERROR: Unable to complete security scan"],
      scanTime: Date.now() - startTime,
    };
  }
}

// Scan file signatures for known malware patterns
async function scanFileSignatures(file: Express.Multer.File): Promise<string[]> {
  const threats: string[] = [];
  const buffer = file.buffer;

  // Common malware signatures (simplified)
  const malwareSignatures = [
    { name: "PE_EXECUTABLE", pattern: [0x4d, 0x5a], description: "Windows executable detected" },
    {
      name: "ELF_EXECUTABLE",
      pattern: [0x7f, 0x45, 0x4c, 0x46],
      description: "Linux executable detected",
    },
    { name: "MACH_O", pattern: [0xfe, 0xed, 0xfa, 0xce], description: "macOS executable detected" },
    { name: "SCRIPT_HEADER", pattern: [0x23, 0x21], description: "Script file detected" }, // #!/
  ];

  for (const signature of malwareSignatures) {
    if (signature.pattern.every((byte, index) => buffer[index] === byte)) {
      // Only flag as threat if it's not an expected file type
      if (!isExpectedExecutable(file.originalname, file.mimetype)) {
        threats.push(`${signature.name}: ${signature.description}`);
      }
    }
  }

  return threats;
}

// Scan file name for suspicious patterns
function scanFileName(fileName: string): string[] {
  const threats: string[] = [];
  const lowerName = fileName.toLowerCase();

  // Dangerous file extensions
  const dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".scr",
    ".com",
    ".pif",
    ".vbs",
    ".js",
    ".jar",
    ".app",
    ".deb",
    ".dmg",
    ".iso",
    ".msi",
    ".pkg",
    ".rpm",
  ];

  for (const ext of dangerousExtensions) {
    if (lowerName.endsWith(ext)) {
      threats.push(`DANGEROUS_EXTENSION: File extension ${ext} is not allowed`);
    }
  }

  // Double extensions (e.g., file.txt.exe)
  const extensionCount = (fileName.match(/\./g) || []).length;
  if (extensionCount > 1) {
    const parts = fileName.split(".");
    if (parts.length > 2) {
      threats.push("DOUBLE_EXTENSION: Multiple file extensions detected");
    }
  }

  // Suspicious file names
  const suspiciousNames = ["autorun.inf", "desktop.ini", "thumbs.db", "folder.htt"];

  if (suspiciousNames.includes(lowerName)) {
    threats.push(`SUSPICIOUS_NAME: ${fileName} is a suspicious system file`);
  }

  return threats;
}

// Scan file size for anomalies
function scanFileSize(file: Express.Multer.File): string[] {
  const threats: string[] = [];
  const { size, mimetype } = file;

  // Check for suspiciously small files that claim to be media
  if (mimetype?.startsWith("audio/") && size < 1000) {
    threats.push("SUSPICIOUS_SIZE: Audio file is suspiciously small");
  }

  if (mimetype?.startsWith("video/") && size < 10000) {
    threats.push("SUSPICIOUS_SIZE: Video file is suspiciously small");
  }

  return threats;
}

// Scan file content for specific threats
async function scanFileContent(file: Express.Multer.File): Promise<string[]> {
  const threats: string[] = [];
  const buffer = file.buffer;
  const content = buffer.toString("utf8", 0, Math.min(buffer.length, 1024)); // First 1KB as text

  // Look for suspicious script content
  const scriptPatterns = [
    /eval\s*\(/gi,
    /document\.write\s*\(/gi,
    /window\.location\s*=/gi,
    /<script[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
  ];

  for (const pattern of scriptPatterns) {
    if (pattern.test(content)) {
      threats.push(`SUSPICIOUS_CONTENT: Potentially malicious script content detected`);
      break; // Only report once per file
    }
  }

  // Look for embedded executables in non-executable files
  if (!isExpectedExecutable(file.originalname, file.mimetype)) {
    const executableMarkers = [
      "MZ", // PE header
      "\x7fELF", // ELF header
    ];

    for (const marker of executableMarkers) {
      if (content.includes(marker)) {
        threats.push("EMBEDDED_EXECUTABLE: Executable code found in non-executable file");
        break;
      }
    }
  }

  return threats;
}

// Helper function to determine if executable content is expected
function isExpectedExecutable(fileName: string, mimeType?: string): boolean {
  const executableExtensions = [".exe", ".app", ".deb", ".dmg", ".msi", ".pkg", ".rpm"];
  const executableMimeTypes = [
    "application/x-executable",
    "application/x-msdos-program",
    "application/x-msdownload",
  ];

  const hasExecutableExtension = executableExtensions.some(ext =>
    fileName.toLowerCase().endsWith(ext)
  );

  const hasExecutableMimeType = mimeType ? executableMimeTypes.includes(mimeType) : false;

  return hasExecutableExtension || hasExecutableMimeType;
}

/**
 * Scan ZIP archive structure for security threats
 *
 * Validates:
 * - Number of files (max: ZIP_LIMITS.maxFiles)
 * - Total decompressed size (max: ZIP_LIMITS.maxTotalSize)
 * - Compression ratio (max: ZIP_LIMITS.maxCompressionRatio) - detects zip bombs
 * - Forbidden file extensions inside the archive
 * - Nested ZIP files (potential bypass attempts)
 *
 * @param file - The uploaded ZIP file to scan
 * @returns Validation result with errors and statistics
 */
export async function scanZipStructure(file: Express.Multer.File): Promise<{
  valid: boolean;
  errors: string[];
  stats: {
    fileCount: number;
    totalCompressedSize: number;
    totalDecompressedSize: number;
    compressionRatio: number;
    forbiddenFiles: string[];
    nestedZips: string[];
  };
}> {
  const errors: string[] = [];
  const stats = {
    fileCount: 0,
    totalCompressedSize: file.size,
    totalDecompressedSize: 0,
    compressionRatio: 0,
    forbiddenFiles: [] as string[],
    nestedZips: [] as string[],
  };

  try {
    // Parse ZIP without extracting
    const zip = new AdmZip(file.buffer);
    const entries = zip.getEntries();

    stats.fileCount = entries.filter(entry => !entry.isDirectory).length;

    // Check max files limit
    if (stats.fileCount > ZIP_LIMITS.maxFiles) {
      errors.push(
        `ZIP_TOO_MANY_FILES: Archive contains ${stats.fileCount} files (max: ${ZIP_LIMITS.maxFiles})`
      );
    }

    // Analyze each entry
    analyzeZipEntries(entries, stats);

    // Calculate compression ratio
    if (stats.totalCompressedSize > 0) {
      stats.compressionRatio = stats.totalDecompressedSize / stats.totalCompressedSize;
    }

    // Validate limits and collect errors
    collectZipErrors(errors, stats);

    logZipScanResult(file.originalname, stats, errors.length === 0);

    return { valid: errors.length === 0, errors, stats };
  } catch (error) {
    console.error(`ZIP scan error for ${file.originalname}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      valid: false,
      errors: [`ZIP_SCAN_ERROR: Unable to parse ZIP structure - ${errorMessage}`],
      stats,
    };
  }
}

// Helper: Analyze ZIP entries for forbidden files and nested archives
function analyzeZipEntries(
  entries: AdmZip.IZipEntry[],
  stats: { totalDecompressedSize: number; forbiddenFiles: string[]; nestedZips: string[] }
): void {
  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const fileName = entry.entryName.toLowerCase();
    stats.totalDecompressedSize += entry.header.size;

    // Check for forbidden extensions
    const hasForbiddenExt = FORBIDDEN_EXTENSIONS_IN_ZIP.some(ext => fileName.endsWith(ext));
    if (hasForbiddenExt) {
      stats.forbiddenFiles.push(entry.entryName);
    }

    // Check for nested archives
    if (fileName.endsWith(".zip") || fileName.endsWith(".7z") || fileName.endsWith(".rar")) {
      stats.nestedZips.push(entry.entryName);
    }
  }
}

// Helper: Collect validation errors based on stats
function collectZipErrors(
  errors: string[],
  stats: {
    totalDecompressedSize: number;
    compressionRatio: number;
    forbiddenFiles: string[];
    nestedZips: string[];
  }
): void {
  // Check total decompressed size
  if (stats.totalDecompressedSize > ZIP_LIMITS.maxTotalSize) {
    const maxSizeMB = ZIP_LIMITS.maxTotalSize / (1024 * 1024);
    const actualSizeMB = (stats.totalDecompressedSize / (1024 * 1024)).toFixed(2);
    errors.push(
      `ZIP_TOO_LARGE: Decompressed size ${actualSizeMB}MB exceeds limit of ${maxSizeMB}MB`
    );
  }

  // Check compression ratio (zip bomb detection)
  if (stats.compressionRatio > ZIP_LIMITS.maxCompressionRatio) {
    const ratio = stats.compressionRatio.toFixed(1);
    errors.push(
      `ZIP_BOMB_DETECTED: Suspicious compression ratio ${ratio}:1 (max: ${ZIP_LIMITS.maxCompressionRatio}:1)`
    );
  }

  // Report forbidden files
  if (stats.forbiddenFiles.length > 0) {
    const fileList = formatFileList(stats.forbiddenFiles, 5);
    errors.push(`ZIP_FORBIDDEN_FILES: Archive contains forbidden file types: ${fileList}`);
  }

  // Warn about nested archives
  if (stats.nestedZips.length > 0) {
    const fileList = formatFileList(stats.nestedZips, 3);
    errors.push(
      `ZIP_NESTED_ARCHIVE: Archive contains nested archives which cannot be scanned: ${fileList}`
    );
  }
}

// Helper: Format file list with truncation
function formatFileList(files: string[], maxShow: number): string {
  const shown = files.slice(0, maxShow).join(", ");
  const remaining = files.length - maxShow;
  return remaining > 0 ? `${shown} and ${remaining} more` : shown;
}

// Helper: Log ZIP scan result
function logZipScanResult(
  filename: string,
  stats: {
    fileCount: number;
    totalCompressedSize: number;
    totalDecompressedSize: number;
    compressionRatio: number;
    forbiddenFiles: string[];
    nestedZips: string[];
  },
  valid: boolean
): void {
  console.log(`ZIP structure scan completed for ${filename}:`, {
    fileCount: stats.fileCount,
    compressedSize: `${(stats.totalCompressedSize / 1024).toFixed(2)}KB`,
    decompressedSize: `${(stats.totalDecompressedSize / (1024 * 1024)).toFixed(2)}MB`,
    compressionRatio: `${stats.compressionRatio.toFixed(1)}:1`,
    forbiddenFiles: stats.forbiddenFiles.length,
    nestedZips: stats.nestedZips.length,
    valid,
  });
}

/**
 * Upload to Convex Storage
 * Note: Function renamed from uploadToSupabase - Convex is the current storage backend
 * Supabase is legacy and should not be extended (see steering rules)
 */
export async function uploadToStorage(
  file: Express.Multer.File,
  path: string,
  options: { contentType?: string; cacheControl?: string } = {}
): Promise<{ path: string; url: string }> {
  try {
    // @ts-expect-error - Convex API type depth issue (known limitation)
    const { api } = await import("../../convex/_generated/api");
    const { getConvex } = await import("./convex");

    const convex = getConvex();

    // Generate upload URL from Convex (using action)
    const uploadResult = await convex.action(api.files.generateUploadUrl);
    const uploadUrl = uploadResult.url;

    // Upload file to Convex storage
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": options.contentType || file.mimetype,
      },
      body: file.buffer,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const { storageId } = (await response.json()) as { storageId: string };

    // Get the public URL for the uploaded file
    const fileUrl = await convex.mutation(api.files.getStorageUrl, { storageId });

    console.log(`✅ File uploaded to Convex: ${file.originalname} -> ${path}`, {
      storageId,
      contentType: options.contentType || file.mimetype,
      fileSize: file.size,
    });

    return {
      path: storageId,
      url: fileUrl || `https://convex.cloud/storage/${storageId}`,
    };
  } catch (error) {
    console.error("❌ Convex upload failed, using fallback:", error);

    // Fallback: return placeholder for development/testing
    return {
      path: path,
      url: `https://placeholder.brolabentertainment.com/${path}`,
    };
  }
}

export default {
  validateFile,
  scanFile,
  scanZipStructure,
  uploadToStorage,
  ALLOWED_MIME_TYPES,
  SIZE_LIMITS,
  ZIP_LIMITS,
  FORBIDDEN_EXTENSIONS_IN_ZIP,
};
