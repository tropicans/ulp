"use client";

import { PulseFitHero } from "@/components/ui/pulse-fit-hero";

export default function PulseFitHeroDemo() {
    return (
        <PulseFitHero
            logo="PulseFit"
            navigation={[
                { label: "Features", onClick: () => console.log("Features") },
                { label: "Programs", hasDropdown: true, onClick: () => console.log("Programs") },
                { label: "Testimonials", onClick: () => console.log("Testimonials") },
                { label: "Pricing", onClick: () => console.log("Pricing") },
                { label: "Contact", onClick: () => console.log("Contact") },
            ]}
            ctaButton={{
                label: "Get Free Trial",
                onClick: () => console.log("Get Free Trial"),
            }}
            title="Train smarter. Anywhere. Anytime."
            subtitle="Guided fitness sessions tailored to your goals - whether it's strength, endurance, or flexibility. Streamlined, motivating, and accessible 24/7."
            primaryAction={{
                label: "Start training",
                onClick: () => console.log("Start training"),
            }}
            secondaryAction={{
                label: "Browse programs",
                onClick: () => console.log("Browse programs"),
            }}
            disclaimer="*No credit card required"
            socialProof={{
                avatars: [
                    "https://i.pravatar.cc/150?img=1",
                    "https://i.pravatar.cc/150?img=2",
                    "https://i.pravatar.cc/150?img=3",
                    "https://i.pravatar.cc/150?img=4",
                ],
                text: "Join over 10,000+ people",
            }}
            programs={[
                {
                    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=500&fit=crop",
                    category: "BEGINNER",
                    title: "Jumping challenge",
                    onClick: () => console.log("Jumping challenge"),
                },
                {
                    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=500&fit=crop",
                    category: "INTERMEDIATE",
                    title: "Core stability flow",
                    onClick: () => console.log("Core stability flow"),
                },
                {
                    image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=500&fit=crop",
                    category: "ADVANCED",
                    title: "Trail sprint challenge",
                    onClick: () => console.log("Trail sprint challenge"),
                },
                {
                    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=500&fit=crop",
                    category: "ALL LEVELS",
                    title: "Full-body bootcamp",
                    onClick: () => console.log("Full-body bootcamp"),
                },
                {
                    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=500&fit=crop",
                    category: "RECOVERY",
                    title: "Mobility & Recovery",
                    onClick: () => console.log("Mobility & Recovery"),
                },
            ]}
        />
    );
}
