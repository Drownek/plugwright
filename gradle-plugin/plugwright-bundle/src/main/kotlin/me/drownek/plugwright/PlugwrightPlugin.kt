package me.drownek.plugwright

import me.drownek.plugwright.external.ExternalMode
import me.drownek.plugwright.local.LocalMode
import org.gradle.api.Plugin
import org.gradle.api.Project

/**
 * Entry point for the `io.github.drownek.plugwright` id.
 *
 * Creates the [BundlePlugwrightExtension] (whose `environments { }` block exposes `local(…)`
 * and `external(…)` without imports), then applies the mode-agnostic engine and registers
 * both built-in modes.
 *
 * A third-party mode registers itself the same way, from its own plugin or from the build
 * script directly, via `plugwright.registerMode(...)`.
 */
class PlugwrightPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        // Create the extension first so PlugwrightCorePlugin finds it and reuses it.
        val extension = project.extensions.create("plugwright", BundlePlugwrightExtension::class.java, project)

        project.pluginManager.apply(PlugwrightCorePlugin::class.java)
        extension.registerMode(LocalMode)
        extension.registerMode(ExternalMode)
    }
}
