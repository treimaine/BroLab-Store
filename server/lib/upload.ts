import { fileTypeFromBuffer } from "file-type";

// Configuration of allowed file types
const ALLOWED_MIME_TYPES = {
  audio: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/aiff", "audio/flac"],
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: ["application/pdf"],
};

// Configuration des limites de taille
const SIZE_LIMITS = {
  audio: 50 * 1024 * 1024, // 50MB
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
    // TODO: Implémenter la vérification de la qualité audio
    // Par exemple: vérifier le bitrate, la durée, etc.
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
  const { size, originalname, mimetype } = file;

  // Check for suspiciously small files that claim to be media
  if (mimetype?.startsWith("audio/") && size < 1000) {
    threats.push("SUSPICIOUS_SIZE: Audio file is suspiciously small");
  }

  if (mimetype?.startsWith("video/") && size < 10000) {
    threats.push("SUSPICIOUS_SIZE: Video file is suspiciously small");
  }

  // Check for zip bombs (very small zip files)
  if ((mimetype?.includes("zip") || originalname.toLowerCase().endsWith(".zip")) && size < 100) {
    threats.push("POTENTIAL_ZIP_BOMB: Zip file is suspiciously small");
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

// Upload vers Supabase Storage (TODO: Implement with Convex)
export async function uploadToSupabase(
  file: Express.Multer.File,
  path: string,
  options: { contentType?: string; cacheControl?: string } = {}
): Promise<{ path: string; url: string }> {
  // Placeholder implementation for now
  // In production, this would integrate with Convex file storage
  console.log(`Simulating upload of ${file.originalname} to path: ${path}`, {
    contentType: options.contentType || file.mimetype,
    cacheControl: options.cacheControl || "3600",
    fileSize: file.size,
  });

  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    path: path,
    url: `https://placeholder.com/${path}`,
  };
}

export default {
  validateFile,
  scanFile,
  uploadToSupabase,
  ALLOWED_MIME_TYPES,
  SIZE_LIMITS,
};
