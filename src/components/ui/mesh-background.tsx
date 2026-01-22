"use client";

export function MeshBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Base Background */}
            <div className="absolute inset-0 bg-background" />

            {/* Static Gradient Orbs (No Animation) */}
            <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-400/5 dark:bg-blue-600/10 blur-3xl rounded-full" />
            <div className="absolute top-[20%] -right-[10%] w-[45%] h-[45%] bg-indigo-400/5 dark:bg-indigo-600/10 blur-3xl rounded-full" />
            <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-purple-400/5 dark:bg-purple-600/10 blur-3xl rounded-full" />

            {/* Mesh Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        </div>
    );
}
