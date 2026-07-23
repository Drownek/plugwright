package me.drownek.plugwright

import org.gradle.api.Project
import org.gradle.api.GradleException
import java.io.File
import java.io.RandomAccessFile
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.time.Duration

object NodeManager {

    data class NodePaths(val node: String, val npm: String)

    fun getOrDownloadNode(project: Project, nodeVersionOpt: String, downloadNodeOpt: Boolean): NodePaths {
        if (!downloadNodeOpt) {
            val isWindows = System.getProperty("os.name").lowercase().contains("win")
            return NodePaths("node", if (isWindows) "npm.cmd" else "npm")
        }

        val nodeVersion = nodeVersionOpt.trim().removePrefix("v")
        val nodeDir = project.layout.buildDirectory.dir("plugwright/node").get().asFile
        val osName = System.getProperty("os.name").lowercase()
        val osArch = System.getProperty("os.arch").lowercase()

        val isWindows = osName.contains("win")
        val isLinux = osName.contains("linux")
        val isMac = osName.contains("mac")

        if (isLinux && (File("/etc/alpine-release").exists() || osName.contains("alpine"))) {
            throw GradleException("Alpine Linux (musl) is not supported for automatic Node.js downloading via this plugin. Please set downloadNode=false and use the system Node.js.")
        }
        if (!isWindows && !isLinux && !isMac) {
            throw GradleException("OS '${System.getProperty("os.name")}' is not supported for automatic Node.js downloading. Please set downloadNode=false and use the system Node.js.")
        }

        val os = when {
            isWindows -> "win"
            isMac -> "darwin"
            else -> "linux"
        }

        val arch = when {
            osArch.contains("aarch64") || osArch.contains("arm64") -> "arm64"
            osArch.contains("arm") -> "armv7l"
            (osArch.contains("x86") && !osArch.contains("64")) || osArch == "i386" -> "x86"
            else -> "x64"
        }

        val ext = if (isWindows) "zip" else "tar.gz"
        val folderName = "node-v$nodeVersion-$os-$arch"
        val fileName = "$folderName.$ext"
        
        val extractDir = File(nodeDir, folderName)
        
        val nodeExe = if (isWindows) File(extractDir, "node.exe") else File(extractDir, "bin/node")
        val npmExe = if (isWindows) File(extractDir, "npm.cmd") else File(extractDir, "bin/npm")

        val markerFile = File(nodeDir, "$folderName.extracted")

        if (!markerFile.exists()) {
            nodeDir.mkdirs()
            
            val lockFile = File(nodeDir, "node-download.lock")
            val raf = RandomAccessFile(lockFile, "rw")
            val channel = raf.channel
            // Acquire exclusive lock
            val lock = channel.lock()
            
            try {
                // Double check after acquiring lock
                if (!markerFile.exists()) {
                    project.logger.lifecycle("Node.js not found locally. Downloading Node.js v$nodeVersion for $os-$arch...")
                    val downloadUrl = "https://nodejs.org/dist/v$nodeVersion/$fileName"
                    val archiveFile = File(nodeDir, fileName)
                    val tmpArchiveFile = File(nodeDir, "$fileName.tmp")

                    if (!archiveFile.exists()) {
                        val httpClient = HttpClient.newBuilder()
                            .followRedirects(HttpClient.Redirect.NORMAL)
                            .connectTimeout(Duration.ofSeconds(30))
                            .build()

                        val request = HttpRequest.newBuilder()
                            .uri(URI.create(downloadUrl))
                            .GET()
                            .build()

                        project.logger.lifecycle("Downloading from: $downloadUrl")
                        val response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream())
                        if (response.statusCode() != 200) {
                            throw GradleException("Failed to download Node.js from $downloadUrl. Status code: ${response.statusCode()}")
                        }

                        Files.copy(response.body(), tmpArchiveFile.toPath(), StandardCopyOption.REPLACE_EXISTING)
                        Files.move(tmpArchiveFile.toPath(), archiveFile.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
                        project.logger.lifecycle("Downloaded Node.js archive.")
                    }

                    project.logger.lifecycle("Extracting Node.js archive...")
                    if (isWindows) {
                        project.copy {
                            from(project.zipTree(archiveFile))
                            into(nodeDir)
                        }
                    } else {
                        project.copy {
                            from(project.tarTree(archiveFile))
                            into(nodeDir)
                        }
                    }
                    
                    if (!nodeExe.exists()) {
                        throw GradleException("Failed to extract Node.js or unexpected directory structure. Expected to find ${nodeExe.absolutePath}")
                    }
                    
                    markerFile.createNewFile()
                }
            } finally {
                lock.release()
                channel.close()
                raf.close()
            }
        }

        return NodePaths(nodeExe.absolutePath, npmExe.absolutePath)
    }
}
