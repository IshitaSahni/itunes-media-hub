const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "../..");

const APPS = {
  vanilla: path.join(ROOT, "vanilla-app"),
  react: path.join(ROOT, "react-app", "dist"),
};

const RESULTS_DIR = path.join(__dirname, "../results");

const EXTENSIONS = {
  ".html": "html",
  ".js": "javascript",
  ".mjs": "javascript",
  ".css": "css",
};

function collectFiles(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`Directory not found: ${directory}`);
  }

  const files = [];

  function walk(currentDirectory) {
    for (const entry of fs.readdirSync(currentDirectory, {
      withFileTypes: true,
    })) {
      if (
        entry.isDirectory() &&
        ["node_modules", ".git", "dist"].includes(entry.name)
      ) {
        continue;
      }

      const fullPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const extension = path.extname(entry.name).toLowerCase();
      const type = EXTENSIONS[extension];

      if (!type) continue;

      const content = fs.readFileSync(fullPath);

      files.push({
        file: path.relative(directory, fullPath).replace(/\\/g, "/"),
        type,
        rawBytes: content.length,
        gzipBytes: zlib.gzipSync(content).length,
      });
    }
  }

  walk(directory);
  return files;
}

function summarize(files) {
  const summary = {
    fileCount: files.length,
    rawBytes: 0,
    gzipBytes: 0,
    javascriptBytes: 0,
    cssBytes: 0,
    htmlBytes: 0,
  };

  for (const file of files) {
    summary.rawBytes += file.rawBytes;
    summary.gzipBytes += file.gzipBytes;

    if (file.type === "javascript") {
      summary.javascriptBytes += file.rawBytes;
    } else if (file.type === "css") {
      summary.cssBytes += file.rawBytes;
    } else if (file.type === "html") {
      summary.htmlBytes += file.rawBytes;
    }
  }

  return summary;
}

function formatKB(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const results = {};
  const summary = {};

  for (const [name, directory] of Object.entries(APPS)) {
    const files = collectFiles(directory);

    if (!files.length) {
      throw new Error(`No HTML, JS or CSS files found in ${directory}`);
    }

    const totals = summarize(files);

    results[name] = {
      directory: path.relative(ROOT, directory).replace(/\\/g, "/"),
      files,
      totals,
    };

    summary[name] = {
      fileCount: totals.fileCount,
      totalKB: formatKB(totals.rawBytes),
      gzipKB: formatKB(totals.gzipBytes),
      javascriptKB: formatKB(totals.javascriptBytes),
      cssKB: formatKB(totals.cssBytes),
      htmlKB: formatKB(totals.htmlBytes),
    };
  }

  const output = {
    timestamp: new Date().toISOString(),
    methodology:
      "Static HTML, JavaScript and CSS file sizes. Gzip is calculated per file. This is not measured network transfer size.",
    results,
    summary,
  };

  const outputPath = path.join(
    RESULTS_DIR,
    "bundle-benchmark.json"
  );

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log("\nBundle size comparison:");
  console.table(summary);

  console.log(`\nResults saved to ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}