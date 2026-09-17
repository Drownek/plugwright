package me.drownek.plugwright

import me.drownek.plugwright.external.ExternalEnvironmentSpec
import me.drownek.plugwright.external.ExternalMode
import me.drownek.plugwright.local.LocalEnvironmentSpec
import me.drownek.plugwright.local.LocalMode
import org.gradle.api.model.ObjectFactory

/**
 * [EnvironmentContainer] extended with shortcut methods for the built-in modes.
 *
 * The `plugwright-bundle` publishes this as the receiver of the `environments { }` block, so
 * build scripts can write `local("name") { … }` and `external("name") { … }` instead of
 * the generic `create("name", LocalMode) { … }` — and without importing the mode objects.
 *
 * The generic [create] keeps working for third-party modes.
 */
open class BundleEnvironmentContainer(objects: ObjectFactory) : EnvironmentContainer(objects) {

    /**
     * Declares a locally-spawned Paper environment.
     *
     * The [name] defaults to `"local"`, so a single-environment build can omit it:
     * ```kotlin
     * environments {
     *     local {
     *         minecraftVersion.set("1.21.11")
     *     }
     * }
     * ```
     *
     * @throws org.gradle.api.GradleException if an environment with this [name] already exists.
     */
    fun local(name: String = "local", action: LocalEnvironmentSpec.() -> Unit = {}): LocalEnvironmentSpec =
        create(name, LocalMode, action)

    /**
     * Declares an environment that connects to an already-running server.
     *
     * The [name] defaults to `"external"`, so a single-environment build can omit it:
     * ```kotlin
     * environments {
     *     external {
     *         host.set("localhost")
     *         minecraftVersion.set("1.21.11")
     *     }
     * }
     * ```
     *
     * @throws org.gradle.api.GradleException if an environment with this [name] already exists.
     */
    fun external(name: String = "external", action: ExternalEnvironmentSpec.() -> Unit = {}): ExternalEnvironmentSpec =
        create(name, ExternalMode, action)
}
