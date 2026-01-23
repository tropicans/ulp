"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/navigation/theme-toggle";

interface NavigationItem {
    label: string;
    hasDropdown?: boolean;
    onClick?: () => void;
}

interface ProgramCard {
    image: string;
    category: string;
    title: string;
    onClick?: () => void;
}

interface PulseFitHeroProps {
    logo?: React.ReactNode;
    navigation?: NavigationItem[];
    ctaButton?: {
        label: string;
        onClick: () => void;
    };
    title: string;
    subtitle: string;
    primaryAction?: {
        label: string;
        onClick: () => void;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    disclaimer?: string;
    socialProof?: {
        avatars: string[];
        text: string;
    };
    programs?: ProgramCard[];
    reflectiveText?: string;
    className?: string;
    children?: React.ReactNode;
}

export function PulseFitHero({
    logo = "PulseFit",
    navigation = [
        { label: "Features" },
        { label: "Programs", hasDropdown: true },
        { label: "Testimonials" },
        { label: "Pricing" },
        { label: "Contact" },
    ],
    ctaButton,
    title,
    subtitle,
    primaryAction,
    secondaryAction,
    disclaimer,
    socialProof,
    programs = [],
    reflectiveText,
    className,
    children,
}: PulseFitHeroProps) {
    return (
        <section
            className={cn(
                "relative w-full min-h-screen flex flex-col overflow-hidden transition-colors duration-500",
                "bg-white/20 dark:bg-slate-950/10",
                className
            )}
            role="banner"
            aria-label="Hero section"
        >
            {/* Subtle Visual Metaphor: Steady Path */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <svg className="w-full h-full opacity-[0.05] dark:opacity-[0.08]" preserveAspectRatio="none" viewBox="0 0 1200 800" fill="none">
                    <path
                        d="M-100 600 C 200 550, 400 650, 700 600 S 1100 500, 1300 550"
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-slate-900 dark:text-white"
                    />
                    <path
                        d="M-100 620 C 200 570, 400 670, 700 620 S 1100 520, 1300 570"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        className="text-slate-900 dark:text-white"
                    />
                </svg>
            </div>
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-20 flex flex-row justify-between items-center px-8 lg:px-16"
                style={{
                    paddingTop: "32px",
                    paddingBottom: "32px",
                }}
            >
                {/* Logo */}
                <div className="font-sans font-bold text-2xl text-slate-900 dark:text-white">
                    {logo}
                </div>

                {/* Navigation */}
                <nav className="hidden lg:flex flex-row items-center gap-8" aria-label="Main navigation">
                    {navigation.map((item, index) => (
                        <button
                            key={index}
                            onClick={item.onClick}
                            className="relative flex flex-row items-center gap-1 font-sans text-base font-normal text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all group"
                        >
                            <span className="relative">
                                {item.label}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300" />
                            </span>
                            {item.hasDropdown && (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-y-0.5 transition-transform">
                                    <path
                                        d="M4 6L8 10L12 6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Theme Toggle & CTA Button */}
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    {ctaButton && (
                        <button
                            onClick={ctaButton.onClick}
                            className="px-6 py-3 rounded-full font-sans text-base font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm hover:scale-105 transition-all"
                        >
                            {ctaButton.label}
                        </button>
                    )}
                </div>
            </motion.header>

            {/* Main Content */}
            {children ? (
                <div className="relative z-10 flex-1 flex items-center justify-center w-full">
                    {children}
                </div>
            ) : (
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="flex flex-col items-center text-center max-w-4xl"
                        style={{ gap: "32px" }}
                    >
                        {/* Title */}
                        <h1 className="font-sans font-bold text-[clamp(36px,6vw,72px)] leading-[1.1] text-slate-900 dark:text-white tracking-tighter">
                            {title}
                        </h1>

                        {/* Subtitle */}
                        <p className="font-sans font-normal text-[clamp(16px,2vw,20px)] leading-relaxed text-slate-600 dark:text-slate-400 max-w-[600px]">
                            {subtitle}
                        </p>

                        {/* Action Buttons */}
                        {(primaryAction || secondaryAction) && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                className="flex flex-col sm:flex-row items-center gap-4"
                            >
                                {primaryAction && (
                                    <button
                                        onClick={primaryAction.onClick}
                                        className="flex flex-row items-center gap-2 px-8 py-4 rounded-full font-sans text-lg font-medium text-white bg-slate-900 dark:bg-blue-600 shadow-xl dark:shadow-blue-600/20 hover:scale-105 transition-all"
                                    >
                                        {primaryAction.label}
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path
                                                d="M7 10H13M13 10L10 7M13 10L10 13"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </button>
                                )}

                                {secondaryAction && (
                                    <button
                                        onClick={secondaryAction.onClick}
                                        className="px-8 py-4 rounded-full font-sans text-lg font-medium text-slate-900 dark:text-white bg-transparent border border-slate-300 dark:border-white/10 hover:scale-105 transition-all"
                                    >
                                        {secondaryAction.label}
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {/* Disclaimer */}
                        {disclaimer && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.6 }}
                                className="font-sans text-[13px] font-normal italic text-slate-500 dark:text-slate-500"
                            >
                                {disclaimer}
                            </motion.p>
                        )}

                        {/* Social Proof */}
                        {socialProof && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.7 }}
                                className="flex flex-row items-center gap-3"
                            >
                                <div className="flex flex-row -space-x-2">
                                    {socialProof.avatars.map((avatar, index) => (
                                        <img
                                            key={index}
                                            src={avatar}
                                            alt={`User ${index + 1}`}
                                            className="rounded-full border-2 border-white dark:border-slate-800"
                                            style={{
                                                width: "40px",
                                                height: "40px",
                                                objectFit: "cover",
                                            }}
                                        />
                                    ))}
                                </div>
                                <span className="font-sans text-sm font-medium text-slate-600 dark:text-slate-400">
                                    {socialProof.text}
                                </span>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Program Cards Carousel - Pure CSS for smooth performance */}
            {programs.length > 0 && (
                <div
                    className="relative z-10 w-full overflow-hidden py-16"
                >
                    {/* Gradient Overlays */}
                    <div
                        className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none w-[150px] bg-gradient-to-r from-white dark:from-slate-950 to-transparent"
                    />
                    <div
                        className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none w-[150px] bg-gradient-to-l from-white dark:from-slate-950 to-transparent"
                    />

                    {/* Scrolling Container - Pure CSS animation */}
                    <div
                        className="flex items-center gap-6 pl-6 animate-marquee"
                        style={{
                            width: "fit-content",
                        }}
                    >
                        {/* Duplicate programs for seamless loop */}
                        {[...programs, ...programs].map((program, index) => (
                            <div
                                key={index}
                                onClick={program.onClick}
                                className="flex-shrink-0 cursor-pointer relative overflow-hidden rounded-3xl shadow-2xl hover:scale-105 hover:-translate-y-2 transition-transform duration-300 ease-out"
                                style={{
                                    width: "356px",
                                    height: "480px",
                                }}
                            >
                                {/* Image */}
                                <img
                                    src={program.image}
                                    alt={program.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />

                                {/* Gradient Overlay */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background: "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.7) 100%)",
                                    }}
                                />


                                {/* Text Content */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 p-6"
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "8px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "Inter, sans-serif",
                                            fontSize: "12px",
                                            fontWeight: 500,
                                            color: "rgba(255, 255, 255, 0.8)",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.1em",
                                        }}
                                    >
                                        {program.category}
                                    </span>
                                    <h3
                                        style={{
                                            fontFamily: "Inter, sans-serif",
                                            fontSize: "24px",
                                            fontWeight: 600,
                                            color: "#FFFFFF",
                                            lineHeight: "1.3",
                                        }}
                                    >
                                        {program.title}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
