package me.drownek.plugwright

import org.gradle.api.Project

/**
 * Extension subclass created by the bundle plugin, providing a typed `environments { }` DSL
 * block whose receiver is [BundleEnvironmentContainer].
 *
 * Because `local(…)` and `external(…)` are member functions of [BundleEnvironmentContainer],
 * they are visible inside `environments { }` without any import in the build script.
 */
abstract class BundlePlugwrightExtension(project: Project) : PlugwrightExtension(project) {

    override val environments: BundleEnvironmentContainer = BundleEnvironmentContainer(project.objects)

    /** Declares the environments tests can run against. */
    fun environments(action: BundleEnvironmentContainer.() -> Unit) {
        environments.action()
    }
}
